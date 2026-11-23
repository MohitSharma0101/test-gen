// Openly licensed diagrams from Wikimedia Commons (for anatomy / realistic structures
// that an SVG can't draw well). Only public domain, CC0, CC BY and CC BY-SA files.
//   node scripts/ai-runner/wiki-image.mjs search "human heart diagram unlabelled" [n]
//     -> candidates: title, license, size, page (also saved to /tmp/ai-runner/wiki-search.json)
//   node scripts/ai-runner/wiki-image.mjs get "File:Heart diagram-en.svg" <out.png> [width]
//     -> downloads a PNG/JPG rendering and prints the credit line to put in the solution
import fs from "node:fs";
import { createRequire } from "node:module";

if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== "1") {
  console.error("Set NODE_USE_ENV_PROXY=1: Node's fetch ignores the session proxy without it.");
  process.exit(2);
}
const API = "https://commons.wikimedia.org/w/api.php";
// Wikimedia asks automated clients for a descriptive User-Agent (generic, no personal details)
const HEADERS = { "User-Agent": "EducationPlusQuestionRunner/1.0 (internal teaching tool)" };
const OK_LICENSE = /^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?([ -][\d.]+)?\b)/i;
// Commons rate-limits busy shared networks (429): wait as asked, up to 3 tries
const politeFetch = async (url) => {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res;
    if (res.status !== 429 || i === 2) throw new Error(`Wikimedia ${res.status} for ${url.slice(0, 80)}`);
    const wait = Math.min(30, Number(res.headers.get("retry-after")) || 5 * (i + 1));
    console.error(`Wikimedia is busy (429); waiting ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
};
const strip = (h = "") => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const info = async (params) => {
  const q = new URLSearchParams({ action: "query", format: "json", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", ...params });
  const res = await politeFetch(`${API}?${q}`);
  return Object.values((await res.json())?.query?.pages ?? {});
};
const meta = (p) => {
  const ii = p.imageinfo?.[0] ?? {};
  const m = ii.extmetadata ?? {};
  return {
    title: p.title,
    license: strip(m.LicenseShortName?.value) || "unknown",
    artist: strip(m.Artist?.value) || "unknown",
    width: ii.width,
    height: ii.height,
    mime: ii.mime,
    thumb: ii.thumburl ?? ii.url,
    original: ii.url,
    page: ii.descriptionurl,
  };
};

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "search") {
  const pages = await info({ generator: "search", gsrnamespace: "6", gsrsearch: a, gsrlimit: String(Math.min(50, (Number(b) || 10) * 3)), iiurlwidth: "800" });
  const rows = pages.map(meta).filter((m) => OK_LICENSE.test(m.license) && /^image\/(png|jpeg|svg\+xml|gif)$/.test(m.mime ?? ""));
  fs.mkdirSync("/tmp/ai-runner", { recursive: true });
  fs.writeFileSync("/tmp/ai-runner/wiki-search.json", JSON.stringify(rows, null, 1));
  for (const r of rows) console.log(`${r.title} | ${r.license} | ${r.width}x${r.height} | ${r.mime}`);
  if (!rows.length) console.log("NONE: no openly licensed match; try other words (e.g. 'unlabelled', 'blank', 'numbered', 'line art')");
} else if (cmd === "get") {
  const [p] = await info({ titles: a, iiurlwidth: String(Number(c) || 1200) });
  if (!p || p.missing !== undefined) throw new Error(`No such file: ${a}`);
  const m = meta(p);
  if (!OK_LICENSE.test(m.license)) throw new Error(`Licence not allowed: ${m.license}`);
  /* Wikimedia's own resized PNG/JPG (thumb host) first; if that fails, the original
     from upload.wikimedia.org, with SVGs drawn to PNG here in the container's browser. */
  const thumb = m.thumb && m.thumb !== m.original ? await politeFetch(m.thumb).catch(() => null) : null;
  if (thumb) {
    fs.writeFileSync(b, Buffer.from(await thumb.arrayBuffer()));
    console.log(JSON.stringify({ saved: b, width: m.width, height: m.height, license: m.license, page: m.page }));
    console.log(`CREDIT: Diagram: ${m.artist}, ${m.license}, via Wikimedia Commons`);
    process.exit(0);
  }
  const orig = Buffer.from(await (await politeFetch(m.original)).arrayBuffer());
  if (/svg/.test(m.mime)) {
    const require = createRequire(import.meta.url);
    let chromium;
    try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
    const width = Number(c) || 1200;
    const height = Math.round((m.height / m.width) * width);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(`<html><body style="margin:0;background:#fff"><img src="data:image/svg+xml;base64,${orig.toString("base64")}" style="width:${width}px;height:${height}px"></body></html>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: b });
    await browser.close();
  } else fs.writeFileSync(b, orig);
  console.log(JSON.stringify({ saved: b, width: m.width, height: m.height, license: m.license, page: m.page }));
  console.log(`CREDIT: Diagram: ${m.artist}, ${m.license}, via Wikimedia Commons`);
} else {
  console.error('Usage: wiki-image.mjs search "<words>" [n] | get "File:..." <out.png> [width]');
  process.exit(2);
}
