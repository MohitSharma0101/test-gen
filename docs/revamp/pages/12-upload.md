# Upload (`/upload`)

**Contract:** load Mathpix .md as questions + answers files or one combined
file (also typed/edited in EditMarkdownSheet); pick class/subject/book/
chapter, marks, tag; preview/print; bulk upload; link to Variants.

**Target:** PageHeader (+ Generate variants). Three steps: 1 Files (slot per
source: choose, drop or edit; "N items read"; mismatch warning), 2 Save into
(dependent pickers reset when a parent changes), 3 Check (inline preview,
"No answer" flagged, 1/2 columns). Fixed bottom bar: totals, Preview v2
(print lives there), brand "Upload N". Questions are derived from the files,
so answers added before questions are no longer dropped; a failed upload
keeps everything.
