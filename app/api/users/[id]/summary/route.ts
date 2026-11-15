import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import ExamResult from "@/models/ExamResult";
import FeeSummary from "@/models/FeeSummary";
import AnswerSheet from "@/models/AnswerSheet";
import "@/models/Batch";
import "@/models/SchedulePaper";
import "@/models/Paper";

type TBatchRef = { _id: mongoose.Types.ObjectId; name?: string; fee?: number };

// "YYYY-MM-DD", or "" for a missing/invalid date (toISOString throws on those)
const isoDay = (value: unknown) => {
  const d = value ? new Date(value as string) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
};

// Everything about one student for the student page, in one request: the
// reads run in parallel (attendance, results, fees, online tests) instead of
// the page making five calls. Read-only.
export const GET = async (_request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) return nextError("Student not found", 404);
    await dbConnect();

    const user = (await User.findById(id).populate("batchIds", "name fee archived").lean()) as any;
    if (!user) return nextError("Student not found", 404);

    const batches = ((user.batchIds ?? []) as TBatchRef[]).filter((b) => b && b._id);
    const batchIds = batches.map((b) => b._id);
    const batchName = new Map(batches.map((b) => [String(b._id), b.name ?? "Batch"]));
    // Days and exams before the student joined don't count against them
    const joined = isoDay(user.createdAt);

    const [attendanceDocs, examDocs, feeDoc, sheets] = await Promise.all([
      Attendance.find({ batch: { $in: batchIds } })
        .select("date batch absentUsers")
        .lean(),
      ExamResult.find({ batchId: { $in: batchIds } })
        .select("name subject date totalMarks batchId results")
        .sort({ date: -1 })
        .lean(),
      FeeSummary.findOne({ studentId: id }).select("totalPaid payments").lean(),
      AnswerSheet.find({ user: id })
        .select("schedulePaper obtainedMarks totalMarks correctAns incorrectAns skippedAns submittedOn createdAt")
        .populate({ path: "schedulePaper", select: "startTime paper", populate: { path: "paper", select: "title" } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // ---- Attendance -------------------------------------------------------
    const days = (attendanceDocs as any[])
      .filter((a) => typeof a.date === "string" && (!joined || a.date >= joined))
      .map((a) => ({
        date: a.date as string,
        batch: batchName.get(String(a.batch)) ?? "Batch",
        present: !(a.absentUsers ?? []).some((u: any) => String(u) === id),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const byBatch = batches.map((b) => {
      const mine = days.filter((d) => d.batch === (b.name ?? "Batch"));
      return { batch: b.name ?? "Batch", total: mine.length, present: mine.filter((d) => d.present).length };
    });

    // ---- Results: own marks, rank and batch average per exam --------------
    const results = (examDocs as any[])
      .filter((e) => !joined || !isoDay(e.date) || isoDay(e.date) >= joined)
      .map((e) => {
        const scores = ((e.results ?? []) as { userId: unknown; marks: number }[]).filter((r) => Number.isFinite(r?.marks));
        const mine = scores.find((r) => String(r.userId) === id);
        const avg = scores.length ? scores.reduce((s, r) => s + r.marks, 0) / scores.length : null;
        const rank = mine ? 1 + scores.filter((r) => r.marks > mine.marks).length : null;
        return {
          _id: String(e._id),
          name: e.name,
          subject: e.subject,
          date: e.date,
          batch: batchName.get(String(e.batchId)) ?? "",
          totalMarks: e.totalMarks,
          marks: mine ? mine.marks : null, // null = absent / not entered
          rank,
          outOf: scores.length,
          batchAverage: avg === null ? null : Math.round(avg * 10) / 10,
        };
      });

    // ---- Fees (same arithmetic as /api/fees/batch) -------------------------
    const totalFee = batches.reduce((s, b) => s + (Number(b.fee) || 0), 0);
    const totalPaid = Number((feeDoc as any)?.totalPaid) || 0;
    const fees = {
      totalFee,
      totalPaid,
      due: totalFee - totalPaid,
      payments: ((feeDoc as any)?.payments ?? []).map((p: any) => ({ date: p.date, amount: p.amount, mode: p.mode })),
    };

    // ---- Online tests -----------------------------------------------------
    const onlineTests = (sheets as any[]).map((s) => ({
      _id: String(s._id),
      title: s.schedulePaper?.paper?.title ?? "Online test",
      date: s.schedulePaper?.startTime ?? s.createdAt,
      obtainedMarks: s.obtainedMarks ?? null,
      totalMarks: s.totalMarks ?? null,
      correct: s.correctAns ?? null,
      incorrect: s.incorrectAns ?? null,
      skipped: s.skippedAns ?? null,
      submitted: Boolean(s.submittedOn),
    }));

    return nextSuccess({
      user,
      attendance: { days, byBatch },
      results,
      fees,
      onlineTests,
    });
  } catch (err) {
    return nextError(err);
  }
};
