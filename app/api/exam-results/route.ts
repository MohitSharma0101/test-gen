import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import ExamResult from "@/models/ExamResult";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    await dbConnect();

    const body = await req.json();

    const { batchId, subject, date, results, name, totalMarks } = body;

    if (!batchId || !subject || !date) {
      return nextError("batchId, subject, and date are required");
    }

    const newExamResult = await ExamResult.create({
      name,
      totalMarks,
      batchId,
      subject,
      date,
      results: results || [],
    });

    return nextSuccess(newExamResult, 201);
  } catch (error: any) {
    console.error("Error creating exam result:", error);
    return nextError("Failed to create exam result");
  }
};

export const GET = async (req: NextRequest) => {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const batchId = searchParams.get("batchId");
    const subject = searchParams.get("subject");
    const date = searchParams.get("date");

    const filter: any = {};
    if (batchId) filter.batchId = batchId;
    if (subject) filter.subject = subject;
    if (date) filter.date = new Date(date);

    const examResults = await ExamResult.find(filter).lean();

    return nextSuccess(examResults);
  } catch (error: any) {
    console.error("GET /api/exam-results failed:", error.message);
    return nextError("Failed to fetch exam results");
  }
};
