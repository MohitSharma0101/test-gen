# Create Paper (`/create-paper`, `/papers/edit/[id]`)

**Contract:** browse questions by class/subject/book/chapter with marks, tag
and unused filters, pagination; pick questions (one, page, random N); edit
question/answer/tags; save (new or update), preview, print (usage counted).

**Target (decided with the user, round 2):**
- Desktop: chapters on the left; questions take the rest in 2 columns (xl)
  of compact cards with answers folded ("Answer ▾"). One toolbar row:
  chapter, marks, tag, Unused, "Add all 50", "5 Random", pager, refresh.
  Bottom bar: "51 questions · 124 marks", 1M×14 2M×13…, Review (paper as a
  slide-over: grouped by marks, ×, Remove all, layout), Save, Preview, Print.
- Phone: sticky chapter button + Filters; cards; bottom bar opens the paper.
- Unsaved work is kept per paper on this device and restored automatically
  ("Unsaved paper restored · Start new"); cleared after Save. Also covers
  edits to a saved paper.
- Fixed: page kept when switching chapter; random could re-pick; save dialog
  closed on failure; edits didn't update the copy already in the paper.
