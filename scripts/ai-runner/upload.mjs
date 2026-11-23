// Upload checked drafts to a claimed request. Local diagram files referenced
// in the text as ![](something.svg|png) are uploaded first and replaced by
// their public URL. Usage: node scripts/ai-runner/upload.mjs <requestId> <drafts.json>
// drafts.json: [{ id, text, ans, questionType, mark?, sourceQuestion?, diagramKind?, checks,
//   chapter?, order?, chapterUnsure? }]  (chapter/order/chapterUnsure: "Make a paper", write new)
import fs from "node:fs";
import path from "node:path";
import { call } from "./lib.mjs";

const [requestId, file] = process.argv.slice(2);
const base = path.dirname(path.resolve(file));
const drafts = JSON.parse(fs.readFileSync(file, "utf8"));
const TYPES = { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

async function localImages(s, diagram) {
  const re = /!\[([^\]]*)\]\(((?!https?:)[^)\s]+\.(svg|png|jpe?g))\)/gi;
  let out = s, m;
  while ((m = re.exec(s))) {
    const p = path.resolve(base, m[2]);
    const type = TYPES[path.extname(p).toLowerCase()];
    const { url } = await call(`${requestId}/image`, { method: "POST", body: new Uint8Array(fs.readFileSync(p)), headers: { "content-type": type } });
    out = out.replace(m[0], `![${m[1]}](${url})`);
    diagram.url = diagram.url || url;
  }
  return out;
}

const ready = [];
for (const d of drafts) {
  const diagram = {};
  const text = await localImages(d.text, diagram);
  const ans = await localImages(d.ans, diagram);
  ready.push({
    text, ans, questionType: d.questionType, mark: d.mark, sourceQuestion: d.sourceQuestion,
    ...(d.chapter ? { chapter: d.chapter, order: d.order, chapterUnsure: d.chapterUnsure === true } : {}),
    ...(diagram.url ? { diagram: { kind: ["ai-image", "web-image"].includes(d.diagramKind) ? d.diagramKind : "svg", url: diagram.url } } : {}),
    checks: d.checks,
  });
}
for (let i = 0; i < ready.length; i += 25) {
  const r = await call(`${requestId}/drafts`, { method: "POST", body: { drafts: ready.slice(i, i + 25) } });
  console.log(`uploaded ${r.added}`);
}
