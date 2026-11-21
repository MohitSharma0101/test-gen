// Save the paper of a claimed request: question ids in paper order + Claude's note.
// Usage: node scripts/ai-runner/paper-save.mjs <requestId> <paper.json>
// paper.json: { "questions": ["<id>", ...], "note": "..." }
import fs from "node:fs";
import { call } from "./lib.mjs";

const [id, file] = process.argv.slice(2);
if (!id || !file) {
  console.error("Usage: paper-save.mjs <requestId> <paper.json>");
  process.exit(2);
}
const { questions, note } = JSON.parse(fs.readFileSync(file, "utf8"));
const res = await call(`${id}/paper`, { method: "POST", body: { questions, note } });
console.log(`saved paper ${res.paper}: ${res.questions} questions, ${res.marks} marks`);
