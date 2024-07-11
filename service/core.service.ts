import { api, ENDPOINT } from "@/lib/api";
import { TQuestion } from "@/models/Question";

type TFetchQuestionsResponse = {
  questions: TQuestion[];
  totalPages: Number;
  totalQuestions: Number;
  currentPage: Number;
};

export const fetchQuestions = async (
  chapter?: string,
  page?: number | null,
  limit?: number | null,
  marks?: number
) => {
  return (
    await api.get(ENDPOINT.questions, {
      params: {
        chapter: chapter,
        page: page || 1,
        limit: limit,
        marks: marks,
      },
    })
  ).data as TFetchQuestionsResponse;
};

export const fetchChapters = async (
  subject?: string,
  course?: string,
  book?: string
) => {
  return (
    await api.get(ENDPOINT.chapters, {
      params: {
        subject,
        course,
        book,
      },
    })
  ).data.chapters;
};

export const uploadQuestionsInBatch = async (questions: TQuestion[]) => {
  return await api.post(ENDPOINT.bulkUploadQuestion, {
    questions: questions,
  });
};

export const fetchBooks = async () => {
  return (await api.get(ENDPOINT.books)).data.books;
};
