// Post marked answer sheets of a claimed check (10 per call; the rubric goes with the first).
// Usage: node scripts/ai-runner/check-upload.mjs <requestId> <results.json>
// results.json: { "rubric": [{ "question": "<id>", "points": "..." }],
//   "sheets": [{ "student": "<id>", "answers": [{ "question", "answer", "marks",
//   "mistakeType"?, "note"?, "flagged"?, "page"? }] }] }
import fs from "node:fs";
import { call } from "./lib.mjs";

const [id, file] = process.argv.slice(2);
if (!id || !file) {
  console.error("Usage: check-upload.mjs <requestId> <results.json>");
  process.exit(2);
}
const { rubric, sheets = [] } = JSON.parse(fs.readFileSync(file, "utf8"));
let saved = 0;
for (let i = 0; i < sheets.length; i += 10) {
  const body = { sheets: sheets.slice(i, i + 10), ...(i === 0 && rubric ? { rubric } : {}) };
  const res = await call(`${id}/checked`, { method: "POST", body });
  saved += res?.saved ?? 0;
}
console.log(`saved ${saved} sheet${saved === 1 ? "" : "s"}`);
