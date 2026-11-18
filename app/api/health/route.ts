import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";

// Pinged every few minutes by an uptime monitor (UptimeRobot / cron-job.org)
// to keep a function instance and its database connection warm: on the Hobby
// plan Vercel doesn't pre-warm instances, and quiet gaps meant cold starts.
// Public on purpose (no data, no auth); middleware lets token-less calls through.
export const dynamic = "force-dynamic";

export const GET = async () => {
  const started = Date.now();
  try {
    await dbConnect();
    await mongoose.connection.db?.command({ ping: 1 });
    return Response.json({ ok: true, dbMs: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
};
