import { toast } from "@/components/ui/use-toast";
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

export const fetchPapers = async () => {
  return (await api.get(ENDPOINT.papers)).data.papers;
};

export const savePaper = async (title: string, questions: TQuestion[]) => {
  if(questions.length === 0) return;
  try {
    await api.post(ENDPOINT.papers, {
      title,
      questions,
    });
    toast({
      title: "💾 Question Paper saved!",
      variant: "success",
    });
  } catch (err) {
    toast({
      title: "Unable to save question paper!",
      variant: "destructive",
    });
    console.log(err);
  }
};
