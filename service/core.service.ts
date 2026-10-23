import { toast } from "@/components/ui/use-toast";
import { PaperStatus } from "@/data/const";
import { api, ENDPOINT } from "@/lib/api";
import { TAttendance } from "@/models/Attendance";
import { TBook } from "@/models/Book";
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

// Chapters of several books at once, for generating a paper across books
export const fetchChaptersOfBooks = async (books: string[]) => {
  if (!books.length) return [];
  return (
    await api.get(ENDPOINT.chapters, {
      params: {
        books: books.join(","),
      },
    })
  ).data.chapters as TChapter[];
};

// One subject's share of a paper
export type TGenerateSection = {
  subject?: string;
  chapterIds: string[];
  maxQuestions: number;
  marks?: number;
  tags?: string[];
  unusedOnly?: boolean;
};

export type TGeneratePaperParams = {
  sections: TGenerateSection[];
  seed?: number;
  excludeQuestionIds?: string[];
};

export type TChapterDepth = {
  chapter: string;
  available: number;
  picked: number;
};

export type TGeneratedSectionResult = {
  subject?: string;
  requested: number;
  picked: number;
  short: boolean;
  depth: TChapterDepth[];
};

export type TGeneratePaperResult = {
  questions: TQuestion[];
  seed: number;
  requested: number;
  short: boolean;
  sections: TGeneratedSectionResult[];
  depth: TChapterDepth[];
};

export const generatePaper = async (params: TGeneratePaperParams) => {
  const res = await api.post(ENDPOINT.generatePaper, params);
  return res.data.data as TGeneratePaperResult;
};

export type TSectionAvailability = {
  subject?: string;
  available: number;
  requested: number;
  perChapter: { chapter: string; available: number }[];
};

export type TAvailability = {
  available: number;
  sections: TSectionAvailability[];
  perChapter: { chapter: string; available: number }[];
};

// How many questions the current filters leave, without picking any
export const fetchAvailability = async (sections: TGenerateSection[]) => {
  const res = await api.post(ENDPOINT.generatePaper, {
    sections,
    countOnly: true,
  });
  return res.data.data as TAvailability;
};

// Books across several subjects at once, for a multi-subject paper
export const fetchBooksOfSubjects = async (subjects: string[], course?: string) => {
  if (!subjects.length) return [] as TBook[];
  return (
    await api.get(ENDPOINT.books, {
      params: {
        subjects: subjects.join(","),
        course,
      },
    })
  ).data.books as TBook[];
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
  limit?: number,
  status?: PaperStatus
) => {
  return (
    await api.get(ENDPOINT.papers, {
      params: {
        id: id,
        author: author,
        course: course,
        status: status,
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
  author?: string,
  status?: PaperStatus
) => {
  if (questions.length === 0) return;
  try {
    await api.post(ENDPOINT.papers, {
      title,
      questions,
      id,
      author,
      status,
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

// Only the ids are needed to bump the counter, and a paper's worth of full
// question objects is ~35 KB of upload on a link whose uplink is the slow half.
export const postUpdateUsage = async (questions: TQuestion[]) => {
  return await api.post(ENDPOINT.questionsUsed, {
    ids: questions.map((q) => q._id).filter(Boolean),
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
