import { waitUntil } from "@vercel/functions";
import { dbConnect } from "@/lib/dbUtils";
import Job, { TJob } from "@/models/Job";
import { getJobHandler } from "./registry";

/*
 * Background jobs, job-type agnostic.
 *
 * A job runs as a chain of short slices. Each slice claims the job (a lock
 * with an expiry, so only one slice runs at a time), processes items for
 * SLICE_MS, saves the cursor and calls the next slice in the background
 * (waitUntil + a fetch to /api/jobs/:id/run). No slice comes near the
 * function time limit.
 *
 * Edge cases handled:
 * - Double start: a second start of the same type returns the active job.
 * - A slice dies (deploy, crash, time limit): its lock expires; the next
 *   status read (the page polls) sees a stale heartbeat and re-kicks it.
 * - One item keeps getting cut off: after MAX_STALLS claims at the same
 *   cursor it is recorded as failed and skipped, so the job still finishes.
 * - An item throws: recorded in `failed` (capped) and the job moves on.
 * - Cancel: the slice stops before its next item.
 */
const SLICE_MS = 20_000;
const LOCK_MS = 90_000; // > a slice, < the 300 s function limit
const STALE_MS = 2 * 60_000;
const MAX_STALLS = 3;
const MAX_FAILED = 100;
const ACTIVE = ["queued", "running"];

const secret = () => process.env.JOB_SECRET || process.env.AUTH_SECRET || "";

/** Start the next slice in the background, without making the caller wait. */
export const kickJob = (id: string, origin: string) => {
  const headers: Record<string, string> = { "x-job-secret": secret() };
  // Vercel Deployment Protection blocks server-to-self calls on protected
  // (preview/dev) URLs unless this bypass secret is sent.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  waitUntil(
    fetch(`${origin}/api/jobs/${id}/run`, { method: "POST", headers }).catch((err) =>
      console.error("job kick failed", id, err)
    )
  );
};

export const isJobSecret = (value: string | null) => !!secret() && value === secret();

export async function startJob(type: string, options: Record<string, unknown>, startedBy: string, origin: string) {
  const handler = getJobHandler(type);
  if (!handler) throw new Error(`Unknown job type "${type}"`);
  await dbConnect();
  const active = await Job.findOne({ type, status: { $in: ACTIVE } }).lean<TJob>();
  if (active) return { job: active, alreadyRunning: true };

  const total = await handler.count(options);
  const job = await Job.create({ type, options, total, startedBy, status: "queued" });
  kickJob(String(job._id), origin);
  return { job: job.toObject() as TJob, alreadyRunning: false };
}

/** Latest job of a type (or by id), re-kicking it if its runner went silent. */
export async function readJob(filter: { id?: string; type?: string }, origin: string) {
  await dbConnect();
  const job = filter.id
    ? await Job.findById(filter.id).lean<TJob>()
    : await Job.findOne({ type: filter.type }).sort({ createdAt: -1 }).lean<TJob>();
  if (job && ACTIVE.includes(job.status)) {
    const last = new Date(job.heartbeatAt ?? job.createdAt).getTime();
    if (Date.now() - last > STALE_MS) kickJob(String(job._id), origin);
  }
  return job;
}

export async function cancelJob(id: string) {
  await dbConnect();
  return Job.findOneAndUpdate(
    { _id: id, status: { $in: ACTIVE } },
    { $set: { status: "cancelled", finishedAt: new Date(), lockedUntil: null } },
    { new: true }
  ).lean<TJob>();
}

/** One slice. Called by /api/jobs/:id/run only. */
export async function runJobSlice(id: string, origin: string) {
  const started = Date.now();
  await dbConnect();

  // Claim: only if active and nobody holds an unexpired lock.
  const now = new Date();
  const job = await Job.findOneAndUpdate(
    { _id: id, status: { $in: ACTIVE }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    { $set: { status: "running", lockedUntil: new Date(Date.now() + LOCK_MS), heartbeatAt: now }, $inc: { stalls: 1 } },
    { new: true }
  ).lean<TJob>();
  if (!job) return; // finished, cancelled, or another slice is running

  const handler = getJobHandler(job.type);
  if (!handler) {
    await Job.updateOne({ _id: id }, { $set: { status: "failed", error: `Unknown job type "${job.type}"`, lockedUntil: null } });
    return;
  }
  const options = job.options ?? {};
  let cursor = job.cursor ?? null;
  let done = job.done;
  const failed = [...job.failed];
  const fail = (key: string, error: string) => {
    if (failed.length < MAX_FAILED) failed.push({ key, error: error.slice(0, 300) });
  };

  try {
    // `stalls` counts claims since the cursor last moved. Repeated claims at
    // the same cursor mean the next item keeps dying mid-run: skip it.
    if (job.stalls > MAX_STALLS) {
      const stuck = await handler.next(cursor, options);
      if (stuck) {
        fail(stuck, "Took too long; skipped");
        cursor = stuck;
        done++;
      }
    }

    for (;;) {
      const key = await handler.next(cursor, options);
      if (!key) break;
      try {
        await handler.run(key, options);
      } catch (err: any) {
        fail(key, err?.message || "failed");
      }
      cursor = key;
      done++;
      // Save progress; stop if the job was cancelled meanwhile.
      const saved = await Job.updateOne(
        { _id: id, status: "running" },
        { $set: { cursor, done, failed, stalls: 0, heartbeatAt: new Date(), lockedUntil: new Date(Date.now() + LOCK_MS) } }
      );
      if (!saved.matchedCount) return;
      if (Date.now() - started > SLICE_MS) {
        await Job.updateOne({ _id: id, status: "running" }, { $set: { lockedUntil: null } });
        kickJob(id, origin);
        return;
      }
    }

    if (handler.finish) await handler.finish(options);
    await Job.updateOne(
      { _id: id, status: "running" },
      { $set: { status: "done", cursor, done, failed, stalls: 0, finishedAt: new Date(), lockedUntil: null, heartbeatAt: new Date() } }
    );
  } catch (err: any) {
    // Failures outside a single item (database down, next() broke): stop and say why.
    await Job.updateOne(
      { _id: id, status: "running" },
      { $set: { status: "failed", error: err?.message || "Job failed", cursor, done, failed, lockedUntil: null, finishedAt: new Date() } }
    );
  }
}
