# Batches (`/batch`, `/batch/archive`)

**Contract:** list active batches with student count; add / edit (name, fee,
students); view a batch's students (tap to call); archive / restore.

**Target:** PageHeader ("8 active batches · 220 students"), Archived link,
brand Add batch. Card grid (name, students, fee, edit icon); search when >6.
Skeleton / empty / error states. ViewBatchSheet and AddBatchSheet on
ResponsiveDrawer: student picker with search, count, Clear; save waits for
current members to load. Create now sends the picked students (the API
already took `userIds`; the old form dropped them). Restore/Archive confirms
no longer use the red bin. `useBatches` no longer throws on a failed load.
Backend: student counts aggregate only the listed batches.
