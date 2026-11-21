// Search the bank by cheap facts (least used first) and save the rows.
// Usage: node scripts/ai-runner/paper-search.mjs <out.json> chapters=<id,id> [type=mcq|numerical|any] [marks=1,4] [tags=Case Study] [limit=200] [exclude=<id,id>]
// Row: { id, ch, m (marks), t (tags), u (times used), o (has options), img, a/cr (online attempts / correct rate), s (first 110 chars) }
import fs from "node:fs";
import { call } from "./lib.mjs";

const [out, ...pairs] = process.argv.slice(2);
if (!out || !pairs.length) {
  console.error("Usage: paper-search.mjs <out.json> chapters=<ids> [type=] [marks=] [tags=] [limit=] [exclude=]");
  process.exit(2);
}
const q = new URLSearchParams(pairs.map((p) => p.split(/=(.*)/s).slice(0, 2)));
const data = await call(`questions?${q}`);
fs.writeFileSync(out, JSON.stringify(data.questions));
const byCh = {};
for (const r of data.questions) byCh[r.ch] = (byCh[r.ch] ?? 0) + 1;
console.log(`${data.questions.length} questions${data.more ? " (more available)" : ""} -> ${out}`, JSON.stringify(byCh));
