import { SquareUserIcon } from "lucide-react";
import { FileClockIcon } from "lucide-react";
import {
  BookOpenTextIcon,
  BookTextIcon,
  FilePenLineIcon,
  FileQuestion,
  FileUpIcon,
  NewspaperIcon,
  Users2Icon,
  Edit3Icon,
  ScrollTextIcon,
  IndianRupeeIcon,
  MessageCircleIcon,
  GraduationCapIcon,
} from "lucide-react";

export const ROUTES = [
  {
    label: "Create Paper",
    href: "/create-paper",
    icon: <FilePenLineIcon className="w-5 h-5 " strokeWidth={2} />,
  },
  {
    label: "Upload Paper",
    href: "/upload",
    icon: <FileUpIcon className="w-5 h-5 " strokeWidth={2} />,
    adminOnly: true,
  },
  {
    label: "Chapters",
    href: "/chapters",
    icon: <BookOpenTextIcon className="w-5 h-5 " strokeWidth={2} />,
    adminOnly: true,
  },
  {
    label: "Books",
    href: "/books",
    icon: <BookTextIcon className="w-5 h-5" strokeWidth={2} />,
    adminOnly: true,
  },
  {
    label: "Papers",
    href: "/papers",
    icon: <NewspaperIcon className="w-5 h-5 " strokeWidth={2} />,
  },
  {
    label: "Questions",
    href: "/questions",
    icon: <FileQuestion className="w-5 h-5 " strokeWidth={2} />,
    adminOnly: true,
  },
  {
    label: "Users",
    href: "/users",
    icon: <Users2Icon className="w-5 h-5 " strokeWidth={2} />,
    adminOnly: true,
  },
  {
    label: "Batches",
    href: "/batch",
    icon: <GraduationCapIcon className="w-5 h-5 " strokeWidth={2} />,
    adminOnly: true,
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: <Edit3Icon className="w-5 h-5 " strokeWidth={2} />,
  },
  {
    label: "Send Message",
    href: "/send-message",
    icon: <MessageCircleIcon className="w-5 h-5 " strokeWidth={2} />,
  },
  {
    label: "Results",
    href: "/exam-results",
    icon: <ScrollTextIcon className="w-5 h-5 " strokeWidth={2} />,
  },
  {
    label: "Fees",
    href: "/fees",
    icon: <IndianRupeeIcon className="w-5 h-5 " strokeWidth={2} />,
    adminOnly: true,
  },
  {
    label: "Online Test",
    href: "/online-test",
    icon: <FileClockIcon className="w-5 h-5 " strokeWidth={2} />,
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: <SquareUserIcon className="w-5 h-5 " strokeWidth={2} />,
    adminOnly: true,
  },
];
