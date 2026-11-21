// Claim the next answer-sheet check and download its pages.
// Usage: node scripts/ai-runner/check-next.mjs <workdir>
// Writes <workdir>/request.json, <workdir>/paper.md (questions + solutions,
// numbered as in the paper), <workdir>/pages/<n>-<name>/p<k>.jpg, and prints a
// short summary (or "NONE ...").
import fs from "node:fs";
import path from "node:path";
import { call } from "./lib.mjs";

const dir = process.argv[2] || "/tmp/ai-runner/check";
fs.mkdirSync(dir, { recursive: true });
const data = await call("next?type=check");
if (!data?.request) {
  console.log(`NONE: ${data?.reason ?? "nothing to do"} (sheets left tonight: ${data?.caps?.sheetsLeft ?? "?"})`);
  process.exit(0);
}
fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(data, null, 1));

const qs = data.paper?.questions ?? [];
const md = [
  `# ${data.paper?.title ?? "Paper"} (${qs.length} questions, ${qs.reduce((t, q) => t + q.mark, 0)} marks)`,
  ...qs.map((q) => `\n## Q${q.n} [${q.mark} mark${q.mark === 1 ? "" : "s"}] id=${q._id}${q.chapter ? ` · ${q.chapter}` : ""}\n\n${q.text}\n\n### Answer / solution\n\n${q.ans || "(none in the bank)"}`),
].join("\n");
fs.writeFileSync(path.join(dir, "paper.md"), md);

// Pages, 4 downloads at a time
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
const jobs = [];
data.sheets.forEach((s, i) => {
  const folder = path.join(dir, "pages", `${String(i + 1).padStart(2, "0")}-${slug(s.name)}`);
  fs.mkdirSync(folder, { recursive: true });
  s.folder = folder;
  s.pages.forEach((url, k) => jobs.push({ url, file: path.join(folder, `p${k + 1}.jpg`) }));
});
fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(data, null, 1));
let next = 0;
let failed = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      if (fs.existsSync(j.file)) continue;
      const res = await fetch(j.url).catch((e) => ({ ok: false, status: e.message }));
      if (!res.ok) {
        failed++;
        console.error(`page download failed (${res.status}): ${j.url}`);
        continue;
      }
      fs.writeFileSync(j.file, Buffer.from(await res.arrayBuffer()));
    }
  })
);

console.log(JSON.stringify({
  id: data.request._id,
  test: data.test,
  paper: { title: data.paper?.title, questions: qs.length },
  sheets: data.sheets.map((s) => ({ student: s.student, name: s.name, pages: s.pages.length, folder: s.folder })),
  alreadyChecked: data.alreadyChecked,
  rubricSaved: data.request.rubric?.length ?? 0,
  pagesDownloaded: jobs.length - failed,
  pagesFailed: failed,
  caps: data.caps,
}, null, 1));
if (failed) process.exit(1);
