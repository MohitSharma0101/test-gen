import type { SubjectQuestions, TQuestion } from "@/models/Question";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
  const idsToRemove = new Set(elementsToRemove.map((item) => item.id || item._id));
  return parentArray.filter((item) => !idsToRemove.has(item.id || item._id));
}
