import mongoose from "mongoose";
import { TUser } from "./User";

export type TUserResult = TUser & {
    result?: TAnswerSheet
}

export type TAnswer = {
    question: string; // Question ID
    answer: string; // Selected answer (could be text or option key)
    isCorrect?: boolean;
};

export type TAnswerSheet = {
    _id: string;
    schedulePaper: string; // ObjectId as string
    user: string; // userId (not Mongo _id)
    answers: TAnswer[];
    submittedOn?: string;
    startedOn?: string;
    createdAt: string;
    updatedAt: string;
    correctAns?: number;
    incorrectAns?: number;
    skippedAns?: number;
    totalMarks?: number;
    obtainedMarks?: number;
    screenLeftCount?: number;
};

const AnswerSheetSchema = new mongoose.Schema(
    {
        schedulePaper: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SchedulePaper",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        startedOn: {
            type: Date,
            required: true,
            default: Date.now,
        },
        submittedOn: {
            type: Date,
        },
        correctAns: {
            type: Number,
            default: 0,
        },
        incorrectAns: {
            type: Number,
            default: 0,
        },
        skippedAns: {
            type: Number,
            default: 0,
        },
        totalMarks: {
            type: Number,
            default: 0,
        },
        obtainedMarks: {
            type: Number,
            default: 0,
        },
        screenLeftCount: {
            type: Number,
            default: 0,
        },
        answers: [
            {
                question: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                    required: true,
                },
                answer: {
                    type: mongoose.Schema.Types.String,
                    required: true,
                },
                timeSpent: {
                    type: Number, // in seconds
                    default: 0,
                },
                isCorrect: {
                    type: Boolean,
                    required: false,
                }
            },
        ],
    },
    { timestamps: true }
);

AnswerSheetSchema.index({ schedulePaper: 1, user: 1 }, { unique: true });

export default mongoose.models.AnswerSheet ||
    mongoose.model("AnswerSheet", AnswerSheetSchema);