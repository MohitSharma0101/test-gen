// Workers AI image for diagrams Claude can't draw well (biology and other
// detailed drawings). Unlabelled on purpose: labels are added as SVG on top.
// Usage: node scripts/ai-runner/ai-image.mjs "<prompt>" <out.png>
// Needs CF_ACCOUNT_ID; the API token is a network secret for api.cloudflare.com.
import fs from "node:fs";
const [prompt, out] = process.argv.slice(2);
const acct = process.env.CF_ACCOUNT_ID;
if (!acct) { console.error("CF_ACCOUNT_ID is not set"); process.exit(2); }
const model = process.env.CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model}`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.CF_API_TOKEN || "injected-by-proxy"}`, "content-type": "application/json" },
  body: JSON.stringify({
    prompt: `${prompt}. Clean black line drawing on a white background, textbook diagram style, no text, no labels, no letters.`,
    steps: 6,
  }),
});
const json = await res.json();
if (!res.ok || !json?.result?.image) { console.error(JSON.stringify(json).slice(0, 300)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(json.result.image, "base64"));
console.log(`saved ${out}`);
