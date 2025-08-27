import { WA_MSG } from "./wa-msg";

export const COURSES = ["8", "9", "10", "11", "12", "JEE", "NEET"];

export const SUBJECT = ["Physics", "Maths", "Chemistry", "Bio"];

export const BOARDS_SUBJECTS = [
  "Science",
  "Maths",
  "English",
  "Social Studies",
];
export const STREAM_SUBJECTS = ["Physics", "Maths", "Chemistry", "Bio"];
export const JEE_SUBJECTS = ["Physics", "Maths", "Chemistry", "JEE Test"];
export const NEET_SUBJECTS = ["Physics", "Chemistry", "Bio", "NEET Test"];

type TSubjectMap = {
  [key: string]: string[];
};
export const SUBJECT_MAP: TSubjectMap = {
  "8": BOARDS_SUBJECTS,
  "9": BOARDS_SUBJECTS,
  "10": BOARDS_SUBJECTS,
  "11": STREAM_SUBJECTS,
  "12": STREAM_SUBJECTS,
  JEE: JEE_SUBJECTS,
  NEET: NEET_SUBJECTS,
};

export const MARKS = [1, 2, 3, 4, 5, 6];

export const QUESTION_PAGE_LIMITS = [10, 20, 25, 30, 45, 50, 75, 90, 180, 300];

export enum MSG_TEMPLATE {
  EXTRA_CLASS = "EXTRA_CLASS",
  ABSENT = "ABSENT",
  RESULT = "RESULT",
}

export enum INPUT_FIELD {
  DATE = "DATE",
  RESULT_NAME = "RESULT_NAME",
}

export const MSG_TEMPLATES_OPTIONS = [
  { label: "Extra Class Template", value: MSG_TEMPLATE.EXTRA_CLASS },
  { label: "Absent Template", value: MSG_TEMPLATE.ABSENT },
  { label: "Result Template", value: MSG_TEMPLATE.RESULT },
];

export const MSG_TEMPLATES_META = {
  [MSG_TEMPLATE.ABSENT]: {
    extraFields: [INPUT_FIELD.DATE],
    preview: WA_MSG.absent("<NAME>", "<DATE>", "<BATCH>"),
  },
  [MSG_TEMPLATE.EXTRA_CLASS]: {
    extraFields: [INPUT_FIELD.DATE],
    preview: WA_MSG.extraClass("<NAME>", "<DATE>"),
  },
  [MSG_TEMPLATE.RESULT]: {
    extraFields: [INPUT_FIELD.DATE, INPUT_FIELD.RESULT_NAME],
    preview: WA_MSG.result({
      name: "NAME",
      date: "DATE",
      marks_obtained: "OBTAINED MARKS",
      total_marks: "TOTAL",
      subject: "SUBJECT",
    }),
  },
};
