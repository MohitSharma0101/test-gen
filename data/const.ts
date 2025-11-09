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

export const MARKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const QUESTION_PAGE_LIMITS = [10, 20, 25, 30, 45, 50, 75, 90, 180, 300];

export enum MSG_TEMPLATE {
  EXTRA_CLASS = "EXTRA_CLASS",
  ABSENT = "ABSENT",
  RESULT = "RESULT",
  PTM = "PTM",
  FEE_REMINDER = "FEE_REMINDER",
}

export enum INPUT_FIELD {
  DATE = "DATE",
  RESULT_NAME = "RESULT_NAME",
  TIME_RANGE = "TIME_RANGE",
}

export const MSG_TEMPLATES_OPTIONS = [
  { label: "Extra Class Template", value: MSG_TEMPLATE.EXTRA_CLASS },
  { label: "Absent Template", value: MSG_TEMPLATE.ABSENT },
  { label: "Result Template", value: MSG_TEMPLATE.RESULT },
  { label: "Fee Reminder", value: MSG_TEMPLATE.FEE_REMINDER },
  { label: "PTM", value: MSG_TEMPLATE.PTM },
];

export const MSG_TEMPLATES_META = {
  [MSG_TEMPLATE.ABSENT]: {
    extraFields: [INPUT_FIELD.DATE],
    preview: WA_MSG.absent("<NAME>", "<DATE>", "<BATCH>"),
  },
  [MSG_TEMPLATE.EXTRA_CLASS]: {
    extraFields: [INPUT_FIELD.DATE, INPUT_FIELD.TIME_RANGE],
    preview: WA_MSG.extraClass({
      name: "<NAME>",
      date: "<DATE>",
      startTime: "<START_TIME>",
      endTime: "<END_TIME>",
    }),
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
  [MSG_TEMPLATE.PTM]: {
    extraFields: [INPUT_FIELD.DATE, INPUT_FIELD.TIME_RANGE],
    preview: WA_MSG.ptm({
      name: "<NAME>",
      date: "<DATE>",
      startTime: "<START_TIME>",
      endTime: "<END_TIME>",
    }),
  },
  [MSG_TEMPLATE.FEE_REMINDER]: {
    extraFields: [],
    preview: WA_MSG.feesReminder("NAME"),
  },
};

export const PAPER_DURATION_OPTIONS = [
  { label: "180 min", value: "180" },
  { label: "90 min", value: "90" },
  { label: "60 min", value: "60" },
  { label: "45 min", value: "45" },
  { label: "30 min", value: "30" },
  { label: "20 min", value: "20" },
  { label: "10 min", value: "10" },
];

export enum QuestionAnalyze {
  INCORRECT = "INCORRECT",
  TIME_SPENT = "TIME_SPENT",
}

export const QuestionAnalyzeOptions = [
  { label: "Incorrect", value: QuestionAnalyze.INCORRECT },
  { label: "Time Spent", value: QuestionAnalyze.TIME_SPENT },
];

export enum Threshold {
  ZERO = "0.0",
  ONE = "0.1",
  TWO = "0.2",
  THREE = "0.3",
  FOUR = "0.4",
  FIVE = "0.5",
  SIX = "0.6",
  SEVEN = "0.7",
  EIGHT = "0.8",
  NINE = "0.9",
  TEN = "1.0",
}

export const ThresholdOptions = [
  { label: "0%", value: Threshold.ZERO },
  { label: "10%", value: Threshold.ONE },
  { label: "20%", value: Threshold.TWO },
  { label: "30%", value: Threshold.THREE },
  { label: "40%", value: Threshold.FOUR },
  { label: "50%", value: Threshold.FIVE },
  { label: "60%", value: Threshold.SIX },
  { label: "70%", value: Threshold.SEVEN },
  { label: "80%", value: Threshold.EIGHT },
  { label: "90%", value: Threshold.NINE },
  { label: "100%", value: Threshold.TEN },
];

export enum PaperStatus {
  DRAFT = "DRAFT",
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  ONLINE = "ONLINE",
}

export const PaperStatusOptions = [
  { label: "Public", value: PaperStatus.PUBLIC },
  { label: "Private", value: PaperStatus.PRIVATE },
  { label: "Draft", value: PaperStatus.DRAFT },
  { label: "Online", value: PaperStatus.ONLINE },
];

// sync
export enum TAG {
  NUMERICAL = "Numerical",
  CASE_STUDY = "Case Study",
  NEET_2020 = "NEET 2020",
  NEET_2019 = "NEET 2019",
  LONG_QUESTIONS = "Long Questions",
  PRACTICAL = "Practical",
  SHORT_QUESTIONS = "Short Questions",
}

