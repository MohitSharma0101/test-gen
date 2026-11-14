// Turns whatever an error carries into one readable sentence. Servers and
// libraries report errors as strings, Error objects, { message }, { error },
// FastAPI's { detail: [{ msg, loc }] } and so on; interpolating any of the
// object shapes gave "[object Object]" in toasts. Never returns that.
export const toMessage = (value: unknown, fallback = "Something went wrong."): string => {
  const seen = new Set<unknown>();
  const read = (v: unknown, depth: number): string => {
    if (v == null || depth > 4) return "";
    if (typeof v === "string") return v.trim() === "[object Object]" ? "" : v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v !== "object" || seen.has(v)) return "";
    seen.add(v);
    if (Array.isArray(v)) {
      return v
        .map((item) => read(item, depth + 1))
        .filter(Boolean)
        .slice(0, 3)
        .join("; ");
    }
    const obj = v as Record<string, unknown>;
    // FastAPI validation items: { loc: ["body", "images"], msg: "Field required" }
    if (typeof obj.msg === "string") {
      const where = Array.isArray(obj.loc) ? obj.loc.filter((p) => p !== "body").join(".") : "";
      return where ? `${where}: ${obj.msg}` : obj.msg;
    }
    for (const field of ["message", "error", "detail", "msg", "reason", "statusText"]) {
      const text = read(obj[field], depth + 1);
      if (text) return text;
    }
    return "";
  };
  return read(value, 0) || fallback;
};
