// Deterministic checks for drafts before anything is uploaded. No model needed:
// format rules, a real Mathpix render, and near-duplicate detection.
// Usage: node scripts/ai-runner/check.mjs <drafts.json> [request.json]
// drafts.json: [{ id, text, ans, questionType }]. Prints one line per draft:
// "ok <id>" or "fail <id>: reason; reason". Exit code 1 if any failed.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { MathpixMarkdownModel: M } = require("../../node_modules/mathpix-markdown-it");

const drafts = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const req = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : null;
const existing = (req?.existingStarts ?? []).map((t) => norm(t));

function norm(s) {
  return String(s).toLowerCase().replace(/\$[^$]*\$/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
// Word-trigram Jaccard: ~0.6+ means the same question with small edits
function similar(a, b) {
  const grams = (s) => { const w = s.split(" "); const g = new Set(); for (let i = 0; i + 2 < w.length; i++) g.add(w.slice(i, i + 3).join(" ")); return g; };
  const A = grams(a), B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
const UNSUPPORTED = /\\(degree|cancel|si|SI|ang|num|unit|intertext|require|includegraphics|label|eqref|ref)\b/;

function outsideMath(s) {
  // Strip $$...$$ and $...$; what's left is plain text
  return s.replace(/\$\$[\s\S]*?\$\$/g, " ").replace(/\$[^$]*\$/g, " ");
}
function problems(d) {
  const out = [];
  for (const [field, s] of [["text", d.text], ["ans", d.ans]]) {
    if (!s || !String(s).trim()) { out.push(`${field} empty`); continue; }
    const dollars = (String(s).replace(/\\\$/g, "").match(/\$/g) || []).length;
    if (dollars % 2) out.push(`${field}: odd number of $`);
    if (/```/.test(s)) out.push(`${field}: code fence`);
    if (/(^|[^\\])%/.test(outsideMath(s))) out.push(`${field}: % comment/sign outside maths`);
    if (/\\[a-zA-Z]+/.test(outsideMath(s).replace(/\\textbf\{\([a-d]\)\}/g, ""))) out.push(`${field}: LaTeX command outside $...$`);
    // The renderer's typographer turns a plain "(c)" into ©. The ans line "(c\)" avoids it, but in
    // running text "(c\)" shows its backslash, so prose says "option c".
    if (/\([a-d]\\\)/.test(String(s).split("\n").slice(field === "ans" ? 1 : 0).join("\n"))) out.push(`${field}: "(x\\)" shows a backslash in running text, write "option x"`);
    if (/\([cC]\)/.test(outsideMath(s).replace(/\\textbf\{\([a-d]\)\}/g, ""))) out.push(`${field}: plain "(c)" becomes ©: first line "(c\\)", elsewhere write "option c"`);
    if (UNSUPPORTED.test(s)) out.push(`${field}: unsupported command ${s.match(UNSUPPORTED)[0]}`);
    try {
      const html = M.markdownToHTML(String(s), { outMath: { include_table_html: true } });
      if (/\(\?\?\?\)|mjx-merror|class="error"/.test(html)) out.push(`${field}: renders with an error`);
    } catch (e) { out.push(`${field}: render threw ${e.message}`); }
  }
  const first = String(d.ans || "").split("\n")[0].trim();
  if (d.questionType === "MCQ") {
    const opts = ["a", "b", "c", "d"].map((l) => (String(d.text).match(new RegExp(`\\\\textbf\\{\\(${l}\\)\\}`, "g")) || []).length);
    if (opts.some((n) => n !== 1)) out.push("text: needs exactly one each of \\textbf{(a)}..\\textbf{(d)}");
    if (!/^\([a-d]\\\)$/.test(first)) out.push('ans: first line must be exactly "(x\\)" with x in a-d');
  } else if (!/^-?\d+(\.\d+)?$/.test(first)) out.push("ans: first line must be the bare number");
  const n = norm(d.text);
  const dup = existing.find((e) => similar(n, e) >= 0.6);
  if (dup) out.push(`near-duplicate of an existing question: "${dup.slice(0, 60)}"`);
  return out;
}

let failed = 0;
const seen = [];
for (const d of drafts) {
  const p = problems(d);
  const n = norm(d.text);
  if (seen.some((x) => similar(n, x) >= 0.6)) p.push("near-duplicate of another draft in this batch");
  seen.push(n);
  if (p.length) { failed++; console.log(`fail ${d.id}: ${p.join("; ")}`); } else console.log(`ok ${d.id}`);
}
process.exit(failed ? 1 : 0);
