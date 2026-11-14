# Question variants (`/variants`) — new page

**Why:** variant generation lived in a half-width side sheet on Upload and
felt cramped. It now has its own page (admin-only, Question bank group).

**Contract (unchanged):** tabs per question (photo, paste or text), same
settings, Generate, review, recheck, save to the chosen chapter/marks/tag.
Tabs persist in `variantBatchStore` across navigation. Pasting a screenshot
anywhere on the page fills the open tab's photo.

**Layout:** title + one-line help, then the tab chips and the unchanged tab
content. No pickers on the page: pressing Upload on a tab opens a **Save to**
drawer (bottom on phones, floating right panel on wider screens) with Class,
Subject, Book, Chapter, Marks, Tag, pre-filled from the last choice
(`saveTargetStore`, session storage). Changing class/subject/book clears the
book/chapter below it; Upload is disabled until a chapter is picked.

**Upload:** its Generate button now links here, carrying the current picks in
the URL; they become the remembered save target. The sheet component is removed (`components/variants/variant-batch`
holds the moved tab logic).
