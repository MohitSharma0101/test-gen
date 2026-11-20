// Print the house formatting rules (lib/ai/generateVariants.ts FORMAT_RULES),
// so the skill never re-reads or re-states them. Usage: node scripts/ai-runner/format-rules.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../lib/ai/generateVariants.ts"), "utf8");
const m = src.match(/export const FORMAT_RULES = `([\s\S]*?)`;/);
if (!m) { console.error("FORMAT_RULES not found"); process.exit(1); }
console.log(m[1].replace(/\\\\/g, "\\").replace(/\\`/g, "`"));
