import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { analyseTest } from "@/lib/test-utils";
import AnswerSheet, { TAnswerSheet } from "@/models/AnswerSheet";
import SchedulePaper, { TSchedulePaper } from "@/models/SchedulePaper";
import { NextRequest } from "next/server";

// Import related models for population
import '@/models/Question';
import '@/models/Chapter';

export const PUT = async (req: NextRequest) => {
    try {
        const { scheduleId } = await req.json();

        if (!scheduleId) {
            return nextError("Schedule ID is required.");
        }

        await dbConnect();

        // Fetch the schedule with paper and questions populated
        const schedule = await SchedulePaper.findById(scheduleId)
            .populate({
                path: "paper",
                select: "title questions",
                populate: {
                    path: "questions",
                },
            })
            .lean<TSchedulePaper>();

        if (!schedule) {
            return nextError("Schedule or associated paper not found.");
        }

        const questions = schedule.paper?.questions ?? [];
        const answerSheets = await AnswerSheet.find({ schedulePaper: scheduleId }).lean<TAnswerSheet[]>();

        if (!answerSheets.length) {
            return nextSuccess({ message: "No answer sheets found to analyze.", success: true });
        }

        // Prepare bulk update operations
        const bulkOps = answerSheets.map((sheet) => {
            const analysis = analyseTest(questions, sheet.answers);

            return {
                updateOne: {
                    filter: { schedulePaper: sheet.schedulePaper, user: sheet.user },
                    update: {
                        $set: {
                            answers: analysis?.analysedAns ?? sheet.answers,
                            correctAns: analysis?.correctAns,
                            incorrectAns: analysis?.incorrectAns,
                            skippedAns: analysis?.skippedAns,
                            totalMarks: analysis?.totalMarks,
                            obtainedMarks: analysis?.obtainedMarks,
                        }
                    }
                }
            };
        });

        // Perform bulk update
        await AnswerSheet.bulkWrite(bulkOps);

        return nextSuccess({
            message: "Answer sheets analyzed and updated successfully.",
            success: true
        });

    } catch (err: any) {
        console.error("Error in PUT /api/analyse:", err);
        return nextError("Internal server error.");
    }
};
