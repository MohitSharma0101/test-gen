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
