import { api, ENDPOINT } from "@/lib/api";
import { TQuestion } from "@/models/Question";

export const fetchQuestions = async (chapter?: string) => {
  return (
    await api.get(ENDPOINT.questions, {
      params: {
        chapter: chapter,
      },
    })
  ).data.questions;
};

export const fetchChapters = async (subject?: string, course?: string) => {
  return (
    await api.get(ENDPOINT.chapters, {
      params: {
        subject,
        course,
      },
    })
  ).data.chapters;
};

export const uploadQuestionsInBatch = async (questions: TQuestion[]) => {
  return await api.post(ENDPOINT.bulkUploadQuestion, {
    questions: questions
  });
}
