# Student page (`/users/[id]`)

New page (opened by tapping a student's name on Users). Read-only summary,
one request: `GET /api/users/:id/summary` (user + attendance days per batch,
exam results with rank / batch average, fees, online-test answer sheets).
Days and exams before the student joined are not counted.

Layout: header (initials, name, ID · batches, Edit; Call/WhatsApp on phones),
4 stats (attendance %, test average, online tests, fees due), then
Attendance (per-batch bars, last 30 days strip, recent absences), Results
(score trend bars + list with rank and batch average), Online tests;
side column: Contact (WhatsApp/Call parent, details), Fees (+ Payment →
AddFeeSheet). Cache key ["student", id], refreshed by writes to users,
batches, fees, attendance, exam-results, answer-sheets (lib/swr.ts).

Charts (hand-drawn SVG, no chart library: components/charts/): attendance %
per month (columns), test score % vs batch average (line, 2 series, legend +
end labels), online-test % (columns). Validated palette slots 1-2 (blue /
orange) via CSS vars, crosshair/hover tooltips, keyboard, sr-only tables.
