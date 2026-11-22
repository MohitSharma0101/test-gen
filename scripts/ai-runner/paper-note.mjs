// Set the note of a "Make a paper" request (written-new papers have no
// paper-save step). Usage: node scripts/ai-runner/paper-note.mjs <requestId> <note.txt>
import fs from "node:fs";
import { call } from "./lib.mjs";

const [id, file] = process.argv.slice(2);
if (!id || !file) {
  console.error("Usage: paper-note.mjs <requestId> <note.txt>");
  process.exit(2);
}
await call(`${id}/note`, { method: "POST", body: { note: fs.readFileSync(file, "utf8") } });
console.log("note saved");
