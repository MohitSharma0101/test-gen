# Papers (`/papers`)

**Contract:** filter by author / class / status (+ clear); refresh; total
count; pagination; select papers → merge (2+); per paper: schedule online
test, preview & print (records usage), open (view/edit sheet), delete
(confirm). Info per paper: title, questions, marks, class, author, status,
created, updated. Teachers see only their own (useAuthors rule).

**Target:**
- Header: icon + "Papers" + count; Refresh (icon, spins while loading);
  primary "Create paper" link.
- Filters in one row (scrolls sideways on phones); "Clear" when any set.
- Desktop ≥ 768: compact table, title is the click target to open; actions
  at row end (Schedule, Preview, Delete). Phone: one card per paper, title +
  meta lines + status badge, action row (Open, Preview, Schedule, Delete).
- Selection → floating bar at the bottom: "N selected · Clear · Merge"
  (Merge needs 2+). Replaces the header Merge button.
- States: skeleton rows, error + Try again, empty (no papers → Create paper;
  filtered → Clear filters).

**Out of scope:** the sheets themselves (view, schedule, merge, preview).
