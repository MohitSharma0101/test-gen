import { toast } from "@/components/ui/use-toast";
import { api, ENDPOINT } from "@/lib/api";
import { TAttendance } from "@/models/Attendance";
import { TChapter } from "@/models/Chapter";
import { TPaper } from "@/models/Paper";
import { TQuestion } from "@/models/Question";
import { TUser } from "@/models/User";

type TFetchQuestionsResponse = {
  questions: TQuestion[];
  totalPages: Number;
  totalQuestions: Number;
  currentPage: Number;
};

export const fetchQuestion = async (questionId: string) => {
  return (
    await api.get(ENDPOINT.questions, {
      params: {
        questionId: questionId,
      },
    })
  ).data as TFetchQuestionsResponse;
};

export const fetchQuestions = async (
  chapter?: string,
  page?: number | null,
  limit?: number | null,
  marks?: string,
  questionId?: string,
  tag?: string,
  timesUsed?: number
) => {
  return (
    await api.get(ENDPOINT.questions, {
      params: {
        chapter: chapter,
        page: page || 1,
        limit: limit,
        marks: marks,
        questionId: questionId,
        tag: tag,
        timesUsed: timesUsed,
      },
    })
  ).data as TFetchQuestionsResponse;
};

export const fetchChapters = async (book?: string) => {
  return (
    await api.get(ENDPOINT.chapters, {
      params: {
        book,
      },
    })
  ).data.chapters as TChapter[];
};

export const uploadQuestionsInBatch = async (questions: TQuestion[]) => {
  return await api.post(ENDPOINT.bulkQuestion, {
    questions: questions,
  });
};

export const deleteQuestionsInBatch = async (questions: TQuestion[]) => {
  return await api.patch(ENDPOINT.bulkQuestion, {
    questions: questions,
  });
};

export const fetchBooks = async (subject?: string, course?: string) => {
  return (
    await api.get(ENDPOINT.books, {
      params: {
        subject,
        course,
      },
    })
  ).data.books;
};

export const fetchPapers = async (
  id?: string | null,
  author?: string,
  course?: string,
  page?: number,
  limit?: number
) => {
  return (
    await api.get(ENDPOINT.papers, {
      params: {
        id: id,
        author: author,
        course: course,
        page: page ?? 1,
        limit: limit ?? 10,
      },
    })
  ).data.data as {
    papers: TPaper[];
    totalPages: number;
    totalPapers: number;
    currentPage: number;
  };
};

export const savePaper = async (
  title: string,
  questions: TQuestion[],
  id?: string,
  author?: string
) => {
  if (questions.length === 0) return;
  try {
    await api.post(ENDPOINT.papers, {
      title,
      questions,
      id,
      author,
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

export const postUpdateUsage = async (questions: TQuestion[]) => {
  return await api.post(ENDPOINT.questionsUsed, {
    questions,
  });
};

export const putUpdateQuestion = async (question: TQuestion) => {
  return await api.put(ENDPOINT.questions, {
    id: question._id,
    ...question,
  });
};

export const moveChapter = async (chapterIds: string[], bookId: string) => {
  return api.put(ENDPOINT.moveChapters, {
    ids: chapterIds,
    book: bookId,
  });
};

export type TAttendanceRes = {
  data: {
    attendance: TAttendance;
    users: TUser[];
  };
};

export const fetchAttendance = async (batchId?: string, date?: string) => {
  if (!batchId || !date) return null;
  return api.get<TAttendanceRes>(ENDPOINT.attendance, {
    params: {
      batchId,
      date,
    },
  });
};
