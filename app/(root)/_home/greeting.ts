// The institute works in IST. Rendering the greeting on the server in this
// zone means the first paint is already right: no "Hello" → "Good morning"
// flicker, and no dependence on the server's own clock zone (UTC on Vercel).
const TIME_ZONE = "Asia/Kolkata";

export const greetingFor = (now: Date) => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(now)
  );
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export const longDate = (now: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(now);

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "today", "yesterday", "3 days ago", "2 weeks ago"…
export const timeAgo = (date: Date | string | undefined, now = new Date()) => {
  // A missing or bad date would make Intl throw a RangeError
  const time = date ? new Date(date).getTime() : NaN;
  if (Number.isNaN(time)) return "";
  const days = Math.round((time - now.getTime()) / 86_400_000);
  if (days > -7) return relative.format(days, "day");
  if (days > -60) return relative.format(Math.round(days / 7), "week");
  if (days > -365) return relative.format(Math.round(days / 30), "month");
  return relative.format(Math.round(days / 365), "year");
};
