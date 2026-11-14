# Users (`/users`)

**Contract:** list all students; search; add (AddUserSheet, incl. CSV);
edit (EditUserSheet); face enrollment status → EnrollFaceSheet; call /
WhatsApp parent. All fields stay reachable (rare ones via Edit).

**Target:** PageHeader with count ("Showing 8 of 120" when filtered) and
brand "Add student". Search (name, ID, phone, parent phone, father's name),
filters: batch (incl. "No batch"), face status, "No parent phone" chip,
sort (name / newest / ID), Clear. ResponsiveList: Student · Batches ·
Parent (phone + WhatsApp + call, father's name) · Face · Edit; cards on
phones. Renders 50 at a time with "Show more". Fixed: search crashed on
students without a phone number.
