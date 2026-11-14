# Questions (`/questions`)

**Contract:** browse by class/subject/book/chapter with marks and tag
filters and pagination; find one question by ID; edit text / answer / tags /
marks; select (one or page) and bulk delete; refresh.

**Target (same layout as Create Paper):** chapters pane on the left; one
toolbar row (chapter, Find by question ID, marks, tag, Select all N, pager,
refresh); compact cards (tap to select, answers folded, ⋯ = edit question /
answer / tags / change marks); "N selected · Delete N" bar with confirm.
Marks change in a drawer of 1-15 buttons (was a number box per card).
ID search shows "Showing question X · Back to chapter" (could not be cleared
before). Phone: chapter button + "Search & filters" drawer.
Selection clears when the chapter/filter/search changes. ChapterList and
QuestionCard now live in components/question-bank/.
