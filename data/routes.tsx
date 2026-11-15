import {
  BookOpenTextIcon,
  CalendarCheck2Icon,
  FilePenLineIcon,
  FileQuestionIcon,
  FileUpIcon,
  FilesIcon,
  GraduationCapIcon,
  IndianRupeeIcon,
  LibraryIcon,
  MessageCircleIcon,
  TimerIcon,
  TrophyIcon,
  UserCogIcon,
  Users2Icon,
  WandSparklesIcon,
  SparklesIcon,
} from "lucide-react";

// Sections used to group pages on Home (and, later, in the sidebar).
// Order here is display order.
export const ROUTE_GROUPS = {
  daily: { label: "Daily", tile: "bg-blue-50 text-blue-700" },
  papers: { label: "Papers", tile: "bg-violet-50 text-violet-700" },
  bank: { label: "Question bank", tile: "bg-amber-50 text-amber-700" },
  institute: { label: "Institute", tile: "bg-emerald-50 text-emerald-700" },
} as const;

// Every lucide icon has this component type
type TIcon = typeof FilesIcon;

export type TRouteGroup = keyof typeof ROUTE_GROUPS;

export type TRoute = {
  label: string;
  href: string;
  // Rendered component, kept for existing callers (header menu)
  icon: JSX.Element;
  Icon: TIcon;
  description: string;
  group: TRouteGroup;
  adminOnly?: boolean;
};

const route = (r: Omit<TRoute, "icon">): TRoute => ({
  ...r,
  icon: <r.Icon className="w-5 h-5" strokeWidth={2} />,
});

// Single source for every page link in the app (menu, home).
// Array order is the menu order.
export const ROUTES: TRoute[] = [
  route({
    label: "Create Paper",
    href: "/create-paper",
    Icon: FilePenLineIcon,
    description: "Pick questions and build a paper",
    group: "papers",
  }),
  route({
    label: "Generate Paper",
    href: "/generate-paper",
    Icon: WandSparklesIcon,
    description: "Make a paper automatically from chapters",
    group: "papers",
  }),
  route({
    label: "Upload Paper",
    href: "/upload",
    Icon: FileUpIcon,
    description: "Add questions from a Mathpix file",
    group: "bank",
    adminOnly: true,
  }),
  route({
    label: "Question Variants",
    href: "/variants",
    Icon: SparklesIcon,
    description: "Make new questions from a photo or text with AI",
    group: "bank",
    adminOnly: true,
  }),
  route({
    label: "Chapters",
    href: "/chapters",
    Icon: BookOpenTextIcon,
    description: "Organise chapters in each book",
    group: "bank",
    adminOnly: true,
  }),
  route({
    label: "Books",
    href: "/books",
    Icon: LibraryIcon,
    description: "Manage books by course and subject",
    group: "bank",
    adminOnly: true,
  }),
  route({
    label: "Papers",
    href: "/papers",
    Icon: FilesIcon,
    description: "Find, print and share saved papers",
    group: "papers",
  }),
  route({
    label: "Questions",
    href: "/questions",
    Icon: FileQuestionIcon,
    description: "Browse and edit the question bank",
    group: "bank",
    adminOnly: true,
  }),
  route({
    label: "Users",
    href: "/users",
    Icon: Users2Icon,
    description: "Students and their details",
    group: "institute",
    adminOnly: true,
  }),
  route({
    label: "Batches",
    href: "/batch",
    Icon: GraduationCapIcon,
    description: "Create batches and assign students",
    group: "institute",
    adminOnly: true,
  }),
  route({
    label: "Attendance",
    href: "/attendance",
    Icon: CalendarCheck2Icon,
    description: "Mark today's attendance for a batch",
    group: "daily",
  }),
  route({
    label: "Send Message",
    href: "/send-message",
    Icon: MessageCircleIcon,
    description: "WhatsApp updates to parents",
    group: "daily",
  }),
  route({
    label: "Results",
    href: "/exam-results",
    Icon: TrophyIcon,
    description: "Enter and view exam results",
    group: "daily",
  }),
  route({
    label: "Fees",
    href: "/fees",
    Icon: IndianRupeeIcon,
    description: "Track fee payments by batch",
    group: "institute",
    adminOnly: true,
  }),
  route({
    label: "Online Test",
    href: "/online-test",
    Icon: TimerIcon,
    description: "Schedule tests and check answer sheets",
    group: "daily",
  }),
  route({
    label: "Accounts",
    href: "/accounts",
    Icon: UserCogIcon,
    description: "Staff logins and permissions",
    group: "institute",
    adminOnly: true,
  }),
];

export const routesFor = (isAdmin: boolean) =>
  ROUTES.filter((r) => !r.adminOnly || isAdmin);

// "/papers/edit/123" → Papers, "/batch/archive" → Batches. Longest match wins
// so a future "/papers-x" can't be mistaken for "/papers".
// Pages with no menu entry or tile, reachable only by URL (each still checks
// the role itself). useRoutes leaves them alone instead of redirecting home.
export const HIDDEN_PATHS = ["/dev-suggestions"];

export const routeForPath = (pathname: string) =>
  ROUTES.filter((r) => pathname === r.href || pathname.startsWith(r.href + "/")).sort(
    (a, b) => b.href.length - a.href.length
  )[0];
