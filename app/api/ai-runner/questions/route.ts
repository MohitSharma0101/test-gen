import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { isRunner } from "@/lib/aiRequests";
import Question from "@/models/Question";
import { TAG } from "@/data/const";

// A question with lettered or numbered options: "(a) ... (b)", "\textbf{(A)}", "(1) ... (2)"
const HAS_OPTIONS = /\((?:a|A|1)\)[\s\S]*\((?:b|B|2)\)/;

/**
 * Runner (make-paper): search the bank by cheap facts only, least used first.
 * ?chapters=<id,id> (required, max 60) &type=mcq|numerical|any &marks=1,4
 * &tags=Case Study &limit=200 (max 400) &exclude=<id,id>
 * Each row: id, ch (chapter), m (marks), t (tags), u (times used), o (has
 * options), img (has a figure), a/cr (online attempts, correct rate), s (the
 * first 110 characters). Full text: POST runner/questions/full.
 */
export const GET = async (req: NextRequest) => {
  if (!isRunner(req)) return nextError("Not allowed", 403);
  try {
    const p = req.nextUrl.searchParams;
    const list = (k: string) => (p.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const chapters = list("chapters").filter((id) => mongoose.isValidObjectId(id));
    if (!chapters.length || chapters.length > 60) return nextError("Give 1 to 60 chapter ids", 400);
    const type = p.get("type") ?? "any";
    const marks = list("marks").map(Number).filter(Number.isFinite);
    const tags = list("tags");
    const exclude = list("exclude").filter((id) => mongoose.isValidObjectId(id));
    const limit = Math.min(400, Math.max(1, Number(p.get("limit")) || 200));

    const query: Record<string, unknown> = { chapter: { $in: chapters } };
    if (marks.length) query.mark = { $in: marks };
    if (tags.length) query.tags = { $all: tags };
    if (exclude.length) query._id = { $nin: exclude };
    // Numerical: tagged, or no "(a)" / "(A)" / "(1)" option in the text (refined below)
    if (type === "numerical") query.$or = [{ tags: TAG.NUMERICAL }, { text: { $not: /\((?:a|A|1)\)/ } }];

    await dbConnect();
    // Over-fetch a little: "mcq" / untagged numericals are told apart by the text below
    const rows = await Question.find(query)
      .select("text mark tags timesUsed chapter stats.attempts stats.correctRate")
      .sort({ timesUsed: 1, _id: 1 })
      .limit(type === "any" ? limit : limit * 2)
      .lean<{ _id: unknown; text?: string; mark?: number; tags?: string[]; timesUsed?: number; chapter: unknown; stats?: { attempts?: number; correctRate?: number } }[]>();

    const out = [];
    for (const q of rows) {
      const text = q.text ?? "";
      const options = HAS_OPTIONS.test(text);
      const numerical = (q.tags ?? []).includes(TAG.NUMERICAL) || !options;
      if (type === "mcq" && (!options || (q.tags ?? []).includes(TAG.NUMERICAL))) continue;
      if (type === "numerical" && !numerical) continue;
      out.push({
        id: String(q._id),
        ch: String(q.chapter),
        m: q.mark ?? 1,
        t: q.tags ?? [],
        u: q.timesUsed ?? 0,
        o: options,
        img: text.includes("![") || text.includes("<img"),
        ...(q.stats?.attempts ? { a: q.stats.attempts, cr: Math.round((q.stats.correctRate ?? 0) * 100) / 100 } : {}),
        s: text.replace(/\s+/g, " ").slice(0, 110),
      });
      if (out.length >= limit) break;
    }
    return nextSuccess({ questions: out, more: rows.length >= limit });
  } catch (err) {
    return nextError(err);
  }
};
