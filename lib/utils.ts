import { TUserResult } from "@/models/AnswerSheet";
import type { SubjectQuestions, TQuestion } from "@/models/Question";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Clock from "./clock";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const readFile = (file: File, onRead: (content: string) => void) => {
  const reader = new FileReader();
  reader.onload = function (re) {
    const content = re?.target?.result;
    if (content) onRead(content?.toString());
  };
  reader.readAsText(file);
};

export function getRandomItems<T>(arr: T[], numItems?: number): T[] {
  let length = numItems || arr.length;
  if (length > arr.length) {
    length = arr.length;
  }

  const shuffled = arr.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, length);
}

export function addQueryToUrl(
  url: string,
  key: string,
  value: string | number
): string {
  // Check if the URL already has a query string
  const separator = url.includes("?") ? "&" : "?";

  // Encode the key and value
  const encodedKey = encodeURIComponent(key);
  const encodedValue = encodeURIComponent(value);

  // Construct the new URL with the added query parameter
  const updatedUrl = `${url}${separator}${encodedKey}=${encodedValue}`;

  return updatedUrl;
}

export function segregateQuestionsBySubject(
  questions: TQuestion[],
  defaultSubject: string = "-"
): SubjectQuestions[] {
  const subjectMap = questions.reduce((acc, question, index) => {
    let subject: string | undefined;

    if (typeof question.chapter === "string") {
      subject = defaultSubject;
    } else if (question.chapter && question.chapter.subject) {
      subject = question.chapter.subject;
    } else {
      subject = defaultSubject;
    }

    // Add continuous index to each question
    question.index = index + 1;

    if (!acc[subject]) {
      acc[subject] = [];
    }

    acc[subject].push(question);

    return acc;
  }, {} as { [subject: string]: TQuestion[] });

  return Object.keys(subjectMap).map((subject) => ({
    subject,
    questions: subjectMap[subject],
  }));
}

export const getTotalMarks = (questions: TQuestion[]) =>
  questions.reduce((sum, item) => sum + (item.mark || 1), 0);

export const getDateFromISO = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString();
};

export function isArrayIncluded<T extends { id?: string; _id?: string }>(
  subArray: T[],
  mainArray: T[]
): boolean {
  if (mainArray.length === 0 || subArray.length === 0) return false;
  const mainSet = new Set(mainArray.map((item) => item.id || item._id));

  for (const element of subArray) {
    if (!mainSet.has(element.id || element._id)) {
      return false;
    }
  }

  return true;
}

export function removeElementsById<T extends { id?: string; _id?: string }>(
  parentArray: T[],
  elementsToRemove: T[]
): T[] {
  const idsToRemove = new Set(
    elementsToRemove.map((item) => item.id || item._id)
  );
  return parentArray.filter((item) => !idsToRemove.has(item.id || item._id));
}

export function getUniqueElementsById<T extends { id?: string; _id?: string }>(
  array: T[]
): T[] {
  const seenIds = new Set();
  return array.filter((item) => {
    if (seenIds.has(item.id || item._id)) {
      return false;
    } else {
      seenIds.add(item.id || item._id);
      return true;
    }
  });
}

export const sortQuestionsByMarks = (questions?: TQuestion[]) => {
  if (!questions) return [];
  return questions.sort((a, b) => (a.mark || 0) - (b.mark || 0));
};

export const getWhatsappURL = (phone?: string, message?: string) => {
  if (!phone) return "";
  const encodedMessage = encodeURIComponent(message || "");
  return `https://wa.me/91${phone.replaceAll(" ", "")}?text=${encodedMessage}`;
};

export const redirectToWhatsapp = (phone?: string, message?: string) => {
  if (!phone) return;
  const url = getWhatsappURL(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
};

/*
 * Check schedule status
 * @param startTime ISO string
 * @param endTime ISO string
 * @returns "active" | "expired" | "upcoming"
 */
export function getScheduleStatus(startTime: string, endTime: string) {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now >= start && now <= end) return "active";
  if (now > end) return "expired";
  return "upcoming";
}



export const sortResultsOnRank = (results: TUserResult[]) => {
  return results?.toSorted((a, b) => {
    const aMarks = a.result?.obtainedMarks || 0;
    const bMarks = b.result?.obtainedMarks || 0;

    if (bMarks !== aMarks) {
      return bMarks - aMarks; // Higher marks first
    }

    const aCorrect = a.result?.correctAns || 0;
    const bCorrect = b.result?.correctAns || 0;

    if (bCorrect !== aCorrect) {
      return bCorrect - aCorrect; // Higher correct answers next
    }

    const aIncorrect = a.result?.incorrectAns || 0;
    const bIncorrect = b.result?.incorrectAns || 0;

    if (aIncorrect !== bIncorrect) {
      return aIncorrect - bIncorrect; // Lower incorrect answers last
    }

    if (!a.result?.submittedOn || !a.result.startedOn || !b.result?.submittedOn || !b.result?.startedOn) return -1;

    // Tie-breaker: Submission time (faster is better)
    const aTimeTaken = Clock.getTimeDifference(a.result?.submittedOn || 0, a.result?.startedOn || 0);
    const bTimeTaken = Clock.getTimeDifference(b.result?.submittedOn || 0, b.result?.startedOn || 0);

    return bTimeTaken - aTimeTaken; // Less time taken = higher rank
  }) ?? []
}