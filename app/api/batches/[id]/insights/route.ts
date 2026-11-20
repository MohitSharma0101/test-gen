import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { suspectReason } from "@/lib/difficulty";
import AnswerSheet from "@/models/AnswerSheet";
import SchedulePaper from "@/models/SchedulePaper";
import "@/models/Question";
import "@/models/Chapter";
import "@/models/User";

// Per-student chapter accuracy below this, with at least MIN_A attempts,
// puts the student in that chapter's re-teach group
const WEAK = 0.5;
const MIN_A = 3;
// Chapters below this batch accuracy get a group
const GROUP_BELOW = 0.7;

const rate = (c: number, a: number) => (a > 0 ? c / a : null);

// A batch's online tests, read for planning: which chapters to re-teach
// (batch accuracy, how many students are below 50%), the student groups that
// share a weak chapter, the hardest questions for this batch, and questions
// whose overall results look wrong (suspect key or wording).
export const GET = async (_request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) return nextError("Batch not found", 404);
    await dbConnect();

    const schedules = await SchedulePaper.find({ batch: id }).select("_id").lean();
    const sheets = (await AnswerSheet.find({ schedulePaper: { $in: schedules.map((s: any) => s._id) } })
      .select("user answers submittedOn createdAt")
      .populate({ path: "user", select: "name userId" })
      .populate({
        path: "answers.question",
        select: "text ans mark tags stats chapter",
        populate: { path: "chapter", select: "title subject course book" },
      })
      .lean()) as any[];

    type TCh = { chapter: any; a: number; c: number; students: Map<string, { name: string; a: number; c: number }> };
    const chapters = new Map<string, TCh>();
    const questions = new Map<string, { q: any; a: number; c: number }>();
    const students = new Set<string>();

    // Newest sheets first; each student's question counted once, from their
    // latest answer, so a retest of the same paper doesn't inflate accuracy.
    const whenOf = (sheet: any) => new Date(sheet.submittedOn ?? sheet.createdAt ?? 0).getTime() || 0;
    sheets.sort((x, y) => whenOf(y) - whenOf(x));
    const seen = new Set<string>(); // `${student}:${question}`

    for (const sheet of sheets) {
      const user = sheet.user && typeof sheet.user === "object" ? sheet.user : null;
      if (!user?._id) continue;
      const uid = String(user._id);
      students.add(uid);
      for (const ans of sheet.answers ?? []) {
        const q = ans?.question;
        if (!q || typeof q !== "object" || typeof ans.isCorrect !== "boolean") continue;
        const seenKey = `${uid}:${String(q._id)}`;
        if (seen.has(seenKey)) continue;
        seen.add(seenKey);
        const ok = ans.isCorrect;
        const qe = questions.get(String(q._id)) ?? { q, a: 0, c: 0 };
        qe.a += 1;
        if (ok) qe.c += 1;
        questions.set(String(q._id), qe);
        const ch = q.chapter && typeof q.chapter === "object" ? q.chapter : null;
        if (!ch?._id) continue;
        const ce = chapters.get(String(ch._id)) ?? { chapter: ch, a: 0, c: 0, students: new Map() };
        ce.a += 1;
        if (ok) ce.c += 1;
        const se = ce.students.get(uid) ?? { name: user.name || user.userId || "Student", a: 0, c: 0 };
        se.a += 1;
        if (ok) se.c += 1;
        ce.students.set(uid, se);
        chapters.set(String(ch._id), ce);
      }
    }

    const chapterRef = (ch: any) => ({
      chapterId: String(ch._id),
      title: ch.title ?? "Chapter",
      subject: ch.subject ?? "",
      course: ch.course ?? "",
    });

    const reteach = Array.from(chapters.values())
      .map((e) => {
        const weak = Array.from(e.students.entries())
          .filter(([, s]) => s.a >= MIN_A && s.c / s.a < WEAK)
          .map(([uid, s]) => ({ userId: uid, name: s.name, accuracy: s.c / s.a, attempted: s.a }))
          .sort((x, y) => x.accuracy - y.accuracy);
        return {
          ...chapterRef(e.chapter),
          attempted: e.a,
          accuracy: rate(e.c, e.a),
          studentsTested: e.students.size,
          studentsBelow: weak.length,
          weakStudents: weak,
        };
      })
      .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1));

    const groups = reteach
      .filter((c) => (c.accuracy ?? 1) < GROUP_BELOW && c.weakStudents.length > 0)
      .map(({ weakStudents, ...c }) => ({ ...c, students: weakStudents }));

    const questionRef = (e: { q: any; a: number; c: number }) => ({
      _id: String(e.q._id),
      text: e.q.text ?? "",
      ans: e.q.ans ?? "",
      mark: e.q.mark ?? 1,
      tags: e.q.tags ?? [],
      stats: e.q.stats ?? null,
      chapter: e.q.chapter && typeof e.q.chapter === "object" ? { ...chapterRef(e.q.chapter), book: e.q.chapter.book ? String(e.q.chapter.book) : "" } : null,
      batchAttempts: e.a,
      batchCorrectRate: rate(e.c, e.a),
    });

    const allQuestions = Array.from(questions.values());
    const hardest = allQuestions
      .filter((e) => e.a >= MIN_A)
      .sort((x, y) => x.c / x.a - y.c / y.a)
      .slice(0, 12)
      .map(questionRef);
    const suspect = allQuestions
      .map((e) => ({ e, reason: suspectReason(e.q.stats) }))
      .filter((x) => x.reason)
      .map((x) => ({ ...questionRef(x.e), reason: x.reason as string }));

    return nextSuccess({
      tests: schedules.length,
      sheets: sheets.length,
      students: students.size,
      reteach: reteach.map(({ weakStudents, ...c }) => c),
      groups,
      hardest,
      suspect,
    });
  } catch (err) {
    return nextError(err);
  }
};
