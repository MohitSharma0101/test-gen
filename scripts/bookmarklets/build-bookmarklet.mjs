// Build a bookmarklet (one-line "javascript:" URL) from a script in this folder.
// Usage: node scripts/bookmarklets/build-bookmarklet.mjs competishun-export.js > out.txt
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { minify } = require("next/dist/compiled/terser");
const file = path.join(path.dirname(new URL(import.meta.url).pathname), process.argv[2]);
const { code } = await minify(fs.readFileSync(file, "utf8"), { compress: true, mangle: true, format: { comments: false } });
process.stdout.write("javascript:" + encodeURIComponent(code));
