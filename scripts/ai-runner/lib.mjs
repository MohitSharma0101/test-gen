// Shared helpers for the nightly AI runner scripts (.claude/skills/generate-variants).
// The runner key is injected by the session's network proxy (a network secret
// for the app's host, header x-ai-runner-key), so scripts send a placeholder.
export const APP = (process.env.AI_APP_URL || "https://eplus-test-gen.vercel.app").replace(/\/$/, "");
const KEY = process.env.AI_RUNNER_KEY || "injected-by-proxy";

if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== "1") {
  console.error("Set NODE_USE_ENV_PROXY=1: Node's fetch ignores the session proxy without it.");
  process.exit(2);
}

export async function call(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${APP}/api/ai-runner/${path}`, {
    method,
    headers: { "x-ai-runner-key": KEY, ...(body && !(body instanceof Uint8Array) ? { "content-type": "application/json" } : {}), ...headers },
    body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json?.error ?? "error"}`);
  return json.data;
}
