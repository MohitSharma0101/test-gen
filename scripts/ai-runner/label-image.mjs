// Put letter markers (A, B, C ...) with leader lines on a picture, as an SVG that embeds it.
// Usage: node scripts/ai-runner/label-image.mjs <image.png|jpg> <labels.json> <out.svg>
// labels.json: [{ "text": "A", "x": 0.42, "y": 0.31, "lx": 0.08, "ly": 0.20 }, ...]
//   or { "labels": [...], "cover": [{ "x": 0.70, "y": 0.10, "w": 0.25, "h": 0.05 }] }
//   cover = white boxes (fractions) that hide the picture's own printed labels or numbers
//   x,y   = the point on the structure (fractions of the picture's width/height)
//   lx,ly = where the letter sits (fractions; put it in empty space, usually near an edge)
// Black and white, serif letters in white circles, so it prints like the paper's own figures.
// Render it (render.mjs) and LOOK: every line must end on the structure it names.
import fs from "node:fs";
import path from "node:path";

const [img, labelsFile, out] = process.argv.slice(2);
if (!img || !labelsFile || !out) {
  console.error("Usage: label-image.mjs <image> <labels.json> <out.svg>");
  process.exit(2);
}
const buf = fs.readFileSync(img);
// PNG / JPEG size from the header (no image library needed)
const size = (() => {
  if (buf[0] === 0x89) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), mime: "image/png" };
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), mime: "image/jpeg" };
    i += 2 + len;
  }
  throw new Error("Unknown image format (use PNG or JPEG)");
})();
const W = 800;
const H = Math.round((size.h / size.w) * W);
const spec = JSON.parse(fs.readFileSync(labelsFile, "utf8"));
const labels = Array.isArray(spec) ? spec : spec.labels ?? [];
const covers = (Array.isArray(spec) ? [] : spec.cover ?? []).map(
  (c) => `<rect x="${c.x * W}" y="${c.y * H}" width="${c.w * W}" height="${c.h * H}" fill="#fff"/>`
);
const parts = labels.map((l) => {
  const [x, y, lx, ly] = [l.x * W, l.y * H, (l.lx ?? l.x) * W, (l.ly ?? l.y) * H];
  return `<line x1="${lx}" y1="${ly}" x2="${x}" y2="${y}" stroke="#000" stroke-width="2"/>` +
    `<circle cx="${x}" cy="${y}" r="3.5" fill="#000"/>` +
    `<circle cx="${lx}" cy="${ly}" r="17" fill="#fff" stroke="#000" stroke-width="2"/>` +
    `<text x="${lx}" y="${ly + 7}" text-anchor="middle" font-family="Times New Roman, serif" font-size="21" font-weight="bold">${l.text}</text>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<rect width="${W}" height="${H}" fill="#fff"/>` +
  `<image href="data:${size.mime};base64,${buf.toString("base64")}" x="0" y="0" width="${W}" height="${H}" style="filter:grayscale(1)"/>` +
  covers.join("") + parts.join("") + `</svg>`;
fs.writeFileSync(out, svg);
console.log(`${out}: ${labels.length} markers, ${W}x${H}, ${Math.round(svg.length / 1024)} KB`);
