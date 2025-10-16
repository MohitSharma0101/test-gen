import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import { analyseTest } from "@/lib/test-utils";
import AnswerSheet, { TAnswerSheet } from "@/models/AnswerSheet";
import SchedulePaper, { TSchedulePaper } from "@/models/SchedulePaper";
import { NextRequest } from "next/server";
import '@/models/Question';
import '@/models/Chapter';

export const PUT = async (req: NextRequest) => {
    try {
        const { scheduleId } = await req.json();
        if (!scheduleId) {
            return nextError("Schedule Id is required");
        }
        await dbConnect();

        const schedule = await SchedulePaper.findById(scheduleId)
            .populate({
                path: "paper",
                select: "title questions",
                populate: {
                    path: "questions",
                    populate: {
                        path: "chapter",
                    },
                },
            })
            .lean<TSchedulePaper>();
        const answerSheets = await AnswerSheet.find({
            schedulePaper: scheduleId,
        }).lean<TAnswerSheet[]>();


        for (const sheet of answerSheets) {
            const testAnalysis = analyseTest(schedule?.paper?.questions ?? [], sheet.answers);
            await AnswerSheet.findOneAndUpdate(
                { schedulePaper: sheet.schedulePaper, user: sheet.user }, // Match condition
                {
                    $set: {
                        answers: testAnalysis?.analysedAns || sheet.answers,
                        correctAns: testAnalysis?.correctAns,
                        incorrectAns: testAnalysis?.incorrectAns,
                        skippedAns: testAnalysis?.skippedAns,
                        totalMarks: testAnalysis?.totalMarks,
                        obtainedMarks: testAnalysis?.obtainedMarks,
                    } as TAnswerSheet,
                }
            );
        }

        return nextSuccess({ success: true })

    } catch (err) {
        console.error(err);
        return nextError();
    }
}