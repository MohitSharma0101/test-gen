import { dbConnect } from "@/lib/dbUtils";
import { nextError, nextSuccess } from "@/lib/nextUtils";
import AnswerSheet, { TAnswerSheet } from "@/models/AnswerSheet";
import { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const scheduleId = searchParams.get("scheduleId");
        if (!scheduleId) {
            return nextError("Schedule Id is required");
        }
        await dbConnect();

        const answerSheets = await AnswerSheet.find({
            schedulePaper: scheduleId,
        }).lean<TAnswerSheet[]>();
        return nextSuccess({ results: answerSheets })

    } catch (err) {
        console.error(err);
        return nextError();
    }
}