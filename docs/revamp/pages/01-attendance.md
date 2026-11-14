# Attendance (`/attendance`)

**Contract:** batch + date (max today; past dates read-only); list of
students, tap to mark absent; "N absent out of M"; last updated time;
WhatsApp toggle (marking absent opens a message to the parent); Photos (face
attendance, today only) fills the absent list for review; Submit saves (and,
as before, clears the batch for the next class).

**Target:** PageHeader (CalendarCheck2, Daily) with present/absent counts.
Controls: batch, shadcn date picker (no native input), "Message parents"
switch. Past date → read-only banner. Students: whole row is the tap target
(56px), Present/Absent pill, absent rows tinted red; 2 columns on large
screens. Sticky bottom bar: Photos + "Submit · N absent" (brand), in thumb
reach. States: pick a batch, skeleton, error + retry, no students.

**Out of scope:** face attendance sheet internals.
