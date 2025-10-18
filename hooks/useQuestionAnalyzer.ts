import { QuestionAnalyze, Threshold } from "@/data/const";
import { api, ENDPOINT } from "@/lib/api";
import { TQuestion } from "@/models/Question";
import { useEffect, useState } from "react";

type AnalyzedQuestion = {
    question: TQuestion;
    totalAttempts: number;
    incorrectAttempts: number;
    incorrectRate: number;
    avgTimeSpent: number;
};

type Props = {
    scheduleId?: string | null;
    threshold?: Threshold;
    analyzeOn?: QuestionAnalyze;
    shouldLoad?: boolean;
};

export const useQuestionAnalyzer = ({
    scheduleId,
    threshold,
    analyzeOn,
    shouldLoad = true,
}: Props) => {
    const [questions, setQuestions] = useState<AnalyzedQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shouldLoad || !scheduleId) return;

        const fetchQuestions = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await api.get(
                    ENDPOINT.analyzeQuestions, {
                    params: {
                        scheduleId, threshold, analyzeOn
                    }
                }
                );
                const data = res.data?.data?.analyzedQuestions;
                if (Array.isArray(data)) {
                    setQuestions(data);
                } else {
                    setError("Invalid data received");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch weak questions");
                // toast.error("Failed to load weak questions");
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();


    }, [scheduleId, threshold, analyzeOn, shouldLoad]);

    return { questions, loading, error };
};