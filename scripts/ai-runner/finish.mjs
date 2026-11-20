// Mark a claimed request done. Usage: node scripts/ai-runner/finish.mjs <id> [--requeue] [--error "why"]
import { call } from "./lib.mjs";
const [id, ...rest] = process.argv.slice(2);
const requeue = rest.includes("--requeue");
const i = rest.indexOf("--error");
const error = i >= 0 ? rest[i + 1] : undefined;
const r = await call(`${id}/finish`, { method: "POST", body: { requeue, error } });
console.log(`status: ${r.status}`);
