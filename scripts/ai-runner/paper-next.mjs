// Claim the next "Make a paper" request.
// Usage: node scripts/ai-runner/paper-next.mjs <workdir>
// Writes <workdir>/request.json (request + the bank map: chapters with question
// counts) and prints a short summary, or "NONE ...".
import fs from "node:fs";
import path from "node:path";
import { call } from "./lib.mjs";

const dir = process.argv[2] || "/tmp/ai-runner/paper";
fs.mkdirSync(dir, { recursive: true });
const data = await call("next?type=paper");
if (!data?.request) {
  console.log(`NONE: ${data?.reason ?? "nothing to do"} (papers left tonight: ${data?.caps?.papersLeft ?? "?"})`);
  process.exit(0);
}
fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(data, null, 1));
// The map, one line per chapter: id | subject | book | chapter | total | numerical | marks spread
const lines = data.chapters.map((c) => `${c._id} | ${c.subject} | ${c.book ?? ""} | ${c.title} | ${c.total} | num ${c.numerical} | ${Object.entries(c.marks).map(([m, n]) => `${m}m:${n}`).join(" ")}`);
fs.writeFileSync(path.join(dir, "chapters.txt"), lines.join("\n"));
console.log(JSON.stringify({ id: data.request._id, input: data.request.input, chapters: data.chapters.length, questions: data.chapters.reduce((t, c) => t + c.total, 0), earlierPaper: data.request.result?.paper ?? null, caps: data.caps }, null, 1));
console.log(`chapter map: ${path.join(dir, "chapters.txt")}`);
