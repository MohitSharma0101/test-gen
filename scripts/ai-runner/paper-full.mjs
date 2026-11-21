// Full text + answer of a shortlist, written as Markdown for reading.
// Usage: node scripts/ai-runner/paper-full.mjs <ids.json | id,id,...> <out.md>
import fs from "node:fs";
import { call } from "./lib.mjs";

const [src, out] = process.argv.slice(2);
const ids = fs.existsSync(src) ? JSON.parse(fs.readFileSync(src, "utf8")) : src.split(",");
const rows = [];
for (let i = 0; i < ids.length; i += 150) rows.push(...(await call("questions/full", { method: "POST", body: { ids: ids.slice(i, i + 150) } })).questions);
const md = rows.map((q) => `## ${q._id} [${q.mark ?? 1}m] used ${q.timesUsed ?? 0}${q.tags?.length ? ` · ${q.tags.join(", ")}` : ""}\n\n${q.text}\n\n**Ans:** ${(q.ans ?? "").split("\n")[0]}`);
fs.writeFileSync(out, md.join("\n\n---\n\n"));
console.log(`${rows.length} questions -> ${out}`);
