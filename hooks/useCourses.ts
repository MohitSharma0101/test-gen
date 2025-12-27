import { useAuth } from "@/context/auth-context";
import { COURSES, SUBJECT_MAP } from "@/data/const";
import { useState } from "react";

type Props = {
  defaultCourse?: string;
  defaultSubject?: string;
  stopDefaultSelection?: boolean;
};

export const useCourses = ({ defaultCourse, defaultSubject, stopDefaultSelection }: Props = {}) => {
  const { account } = useAuth();

  const courses =
    account?.courses && account?.courses?.length != 0
      ? COURSES.filter((course) => account?.courses?.some((c) => c.course === course))
      : COURSES;

  const [course, setCourse] = useState(stopDefaultSelection ? "" : defaultCourse || courses?.[0] || "");

  const selectedCourse = account?.courses?.find((c) => c.course === course);

  const subjects = selectedCourse
    ? SUBJECT_MAP[course].filter((subject) => selectedCourse?.subjects?.some((c) => c.includes(subject)))
    : SUBJECT_MAP[course];

  const [subject, setSubject] = useState(defaultSubject || subjects?.[0] || "");

  return { courses, subjects, course, subject, setCourse, setSubject };
};
