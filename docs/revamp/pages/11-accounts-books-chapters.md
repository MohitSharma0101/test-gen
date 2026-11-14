# Accounts, Books, Chapters

**Accounts contract:** list staff logins; edit name, role, class/subjects.
Target: PageHeader with counts, ResponsiveList (name, @username, role badge,
classes & subjects or "All"), search when >6. EditAccountSheet on
ResponsiveDrawer: role as two cards, subjects as one-tap chips per class
(was class → subject → Add). Load errors show a retry.

**Books contract:** per class+subject: list, add, rename, delete.
**Chapters contract:** per class+subject+book: list, add, rename, set order,
delete (with its questions), select + move to another book, refresh.
Target: PageHeader, class/subject(/book) selects, one card with an inline
"New … title" + Add row and the list. Rename/order in a shared
EditTitleSheet (replaces the fake inline inputs and per-row order box).
Move: sticky "N selected · Move to book" bar → ResponsiveDrawer (current
book not offered). Hooks return success so typed text is kept on failure.
Fixed: subject not reset when the class changes; delete toast said "add".
