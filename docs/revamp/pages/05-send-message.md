# Send Message (`/send-message`) + Results (`/exam-results`)

**Send message — contract:** template, batch, template fields (date, result,
time range), preview, per-parent WhatsApp button; "Absent" lists only that
day's absentees. **Target:** template chips; shadcn date picker and 15-min
time dropdowns (no native inputs); preview as a WhatsApp bubble; recipients
card (sticky on desktop) with count, "No parent number saved" hint.

**Results — contract:** batch + date, list saved results, Add (needs batch
+ date) and open/edit via AddResultSheet. **Target:** search runs on filter
change (no Search button); date optional ("Any date", clearable); brand Add
result in the header; result cards; states incl. error + retry
(`useExamResults` now catches failures).
