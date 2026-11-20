// Render drafts (and their diagrams) to PNGs to look at, exactly as the app
// shows them. Usage: node scripts/ai-runner/render.mjs <drafts.json> <outdir>
// Writes <outdir>/<id>.png per draft. Diagram files referenced as local paths
// (![](file.svg)) are resolved relative to drafts.json.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { MathpixMarkdownModel: M } = require("../../node_modules/mathpix-markdown-it");
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const [file, outdir] = process.argv.slice(2);
const base = path.dirname(path.resolve(file));
fs.mkdirSync(outdir, { recursive: true });
const drafts = JSON.parse(fs.readFileSync(file, "utf8"));
const css = M.getMathpixStyle(true) || "";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
for (const d of drafts) {
  const md = `${d.text}\n\n---\n\n${d.ans}`;
  const html = `<!doctype html><meta charset="utf-8"><base href="file://${base}/"><style>${css}</style>
<style>body{margin:0;background:#fff;font-family:system-ui,sans-serif}.c{padding:16px;font-size:16px;line-height:1.5}img{max-width:100%}</style>
<div class="c">${M.markdownToHTML(md, { outMath: { include_table_html: true } })}</div>`;
  const tmp = path.join(base, `.render-${d.id}.html`);
  fs.writeFileSync(tmp, html);
  await page.goto(`file://${tmp}`);
  await page.waitForTimeout(300);
  await page.locator(".c").screenshot({ path: path.join(outdir, `${d.id}.png`) });
  fs.unlinkSync(tmp);
}
await browser.close();
console.log(`rendered ${drafts.length} to ${outdir}`);
