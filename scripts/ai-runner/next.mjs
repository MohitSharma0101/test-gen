// Claim the next request and save everything needed to work on it.
// Usage: node scripts/ai-runner/next.mjs <workdir>
// Writes <workdir>/request.json and prints a one-screen summary (or "NONE").
import fs from "node:fs";
import path from "node:path";
import { call } from "./lib.mjs";

const dir = process.argv[2] || "/tmp/ai-runner";
fs.mkdirSync(dir, { recursive: true });
const data = await call("next");
if (!data?.request) {
  console.log(`NONE: ${data?.reason ?? "nothing to do"} (drafts left tonight: ${data?.caps?.draftsLeft ?? "?"})`);
  process.exit(0);
}
fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(data, null, 1));
const r = data.request;
console.log(JSON.stringify({
  id: r._id,
  mode: r.input.mode,
  count: r.input.count,
  topic: r.input.topic,
  sources: data.sources.length,
  difficulty: r.input.difficulty,
  questionType: r.input.questionType,
  instructions: r.input.instructions,
  chapter: data.chapter,
  alreadyMade: data.alreadyMade,
  caps: data.caps,
}, null, 1));
