import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import AnswerSheet from "@/models/AnswerSheet";
import "@/models/Question";
import "@/models/Chapter";
import "@/models/SchedulePaper";

const DAY = 24 * 60 * 60 * 1000;
// "Recent" for the per-chapter trend
const RECENT_DAYS = 30;
// Same rules as the student app (eplus-crack-it lib/server/insights.ts), so a
// teacher and the student see the same thing:
// a chapter is only rated with MIN_ANSWERS answers (0 of 1 is noise, not 0%);
// ranking pulls accuracy toward the student's overall by SMOOTHING answers'
// worth; weak = rated and below 50% or 15+ points under their overall.
const MIN_ANSWERS = 5;
const SMOOTHING = 5;
const WEAK_BELOW = 0.5;
const WEAK_GAP = 0.15;

type TChapterAcc = {
  chapterId: string;
  title: string;
  subject: string;
  course: string;
  attempted: number;
  correct: number;
  recentA: number;
  recentC: number;
  earlierA: number;
  earlierC: number;
  wrongTests: Set<string>;
};

const rate = (c: number, a: number) => (a > 0 ? c / a : null);

// What a student's online-test history says, for planning their teaching:
// chapter mastery (with a 30-day trend), persistent gaps
// and accuracy by tag and by marks.
export const GET = async (_request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) return nextError("Student not found", 404);
    await dbConnect();

    const sheets = (await AnswerSheet.find({ user: id })
      .select("schedulePaper answers createdAt submittedOn")
      .populate({ path: "answers.question", select: "chapter mark tags stats.avgTime stats.attempts", populate: { path: "chapter", select: "title subject course" } })
      .populate({ path: "schedulePaper", select: "startTime" })
      .lean()) as any[];


    const now = Date.now();
    const chapters = new Map<string, TChapterAcc>();
    const tags = new Map<string, { a: number; c: number }>();
    const marks = new Map<number, { a: number; c: number }>();
    let tests = 0;

    for (const sheet of sheets) {
      const when = new Date(sheet.schedulePaper?.startTime ?? sheet.submittedOn ?? sheet.createdAt ?? 0).getTime();
      const recent = Number.isFinite(when) && now - when <= RECENT_DAYS * DAY;
      const testId = String(sheet.schedulePaper?._id ?? sheet._id);
      let counted = false;

      for (const a of sheet.answers ?? []) {
        const q = a?.question;
        if (!q || typeof q !== "object") continue;
        if (typeof a.isCorrect !== "boolean") continue; // not rechecked yet
        counted = true;
        const ok = a.isCorrect;
        const ch = q.chapter && typeof q.chapter === "object" ? q.chapter : null;
        if (ch?._id) {
          const key = String(ch._id);
          const e =
            chapters.get(key) ??
            ({
              chapterId: key,
              title: ch.title ?? "Chapter",
              subject: ch.subject ?? "",
              course: ch.course ?? "",
              attempted: 0,
              correct: 0,
              recentA: 0,
              recentC: 0,
              earlierA: 0,
              earlierC: 0,
              wrongTests: new Set<string>(),
            } as TChapterAcc);
          e.attempted += 1;
          if (ok) e.correct += 1;
          else e.wrongTests.add(testId);
          if (recent) {
            e.recentA += 1;
            if (ok) e.recentC += 1;
          } else {
            e.earlierA += 1;
            if (ok) e.earlierC += 1;
          }
          chapters.set(key, e);
        }
        for (const t of (q.tags ?? []).filter(Boolean)) {
          const e = tags.get(t) ?? { a: 0, c: 0 };
          e.a += 1;
          if (ok) e.c += 1;
          tags.set(t, e);
        }
        const m = Number(q.mark) || 1;
        const me = marks.get(m) ?? { a: 0, c: 0 };
        me.a += 1;
        if (ok) me.c += 1;
        marks.set(m, me);

      }

      if (counted) tests += 1;
    }

    let allA = 0,
      allC = 0;
    chapters.forEach((e) => {
      allA += e.attempted;
      allC += e.correct;
    });
    const overall = allA ? allC / allA : 0;
    const chapterList = Array.from(chapters.values())
      .map((e) => ({
        chapterId: e.chapterId,
        title: e.title,
        subject: e.subject,
        course: e.course,
        attempted: e.attempted,
        correct: e.correct,
        accuracy: rate(e.correct, e.attempted),
        recentAccuracy: e.recentA >= 3 ? rate(e.recentC, e.recentA) : null,
        earlierAccuracy: e.earlierA >= 3 ? rate(e.earlierC, e.earlierA) : null,
        testsWrong: e.wrongTests.size,
        rated: e.attempted >= MIN_ANSWERS,
        adjusted: (e.correct + SMOOTHING * overall) / (e.attempted + SMOOTHING),
      }))
      // Rated chapters weakest first; the few-answer ones after, most answered first
      .sort((a, b) => Number(b.rated) - Number(a.rated) || (a.rated ? a.adjusted - b.adjusted : b.attempted - a.attempted));

    return nextSuccess({
      tests,
      chapters: chapterList,
      overall: allA ? overall : null,
      // "Chapters to work on" (kept under its old key for the client)
      persistentGaps: chapterList
        .filter((c) => c.rated && c.accuracy !== null && (c.accuracy < WEAK_BELOW || c.accuracy <= overall - WEAK_GAP))
        .slice(0, 8),
      byTag: Array.from(tags.entries())
        .map(([tag, e]) => ({ key: tag, attempted: e.a, accuracy: rate(e.c, e.a) }))
        .sort((a, b) => b.attempted - a.attempted),
      byMark: Array.from(marks.entries())
        .map(([m, e]) => ({ key: `${m} mark${m === 1 ? "" : "s"}`, mark: m, attempted: e.a, accuracy: rate(e.c, e.a) }))
        .sort((a, b) => a.mark - b.mark),
    });
  } catch (err) {
    return nextError(err);
  }
};
