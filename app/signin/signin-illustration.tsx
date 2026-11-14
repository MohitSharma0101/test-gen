import { cn } from "@/lib/utils";

// A question paper being marked: what the app is for, in one picture.
// Drawn for this app (no third-party licence). Colors come from Tailwind
// classes so it follows the theme tokens; it is decorative, so hidden from
// screen readers.
export const SigninIllustration = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 360 280"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={cn("h-auto w-full", className)}
  >
    {/* backdrop */}
    <circle cx="180" cy="150" r="118" className="fill-white/10" />
    <circle cx="300" cy="52" r="6" className="fill-white/40" />
    <circle cx="48" cy="210" r="4" className="fill-white/40" />
    <circle cx="66" cy="70" r="3" className="fill-white/30" />

    {/* back sheet */}
    <rect x="112" y="46" width="160" height="200" rx="14" transform="rotate(6 192 146)" className="fill-white/30" />

    {/* front sheet */}
    <g transform="rotate(-4 170 150)">
      <rect x="92" y="40" width="168" height="212" rx="14" className="fill-white" />
      <rect x="92" y="40" width="168" height="40" rx="14" className="fill-brand-soft" />
      <rect x="92" y="66" width="168" height="14" className="fill-brand-soft" />
      <rect x="110" y="54" width="70" height="8" rx="4" className="fill-brand/70" />
      <rect x="196" y="54" width="44" height="8" rx="4" className="fill-brand/25" />

      {[0, 1, 2, 3].map((i) => {
        const y = 100 + i * 36;
        const done = i < 3;
        return (
          <g key={i}>
            <circle cx="120" cy={y + 6} r="9" className={done ? "fill-emerald-500" : "fill-slate-200"} />
            {done && (
              <path
                d={`M115.5 ${y + 6.5} l3 3 l6 -6.5`}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-white"
              />
            )}
            <rect x="138" y={y} width={i % 2 ? 84 : 104} height="6" rx="3" className="fill-slate-300" />
            <rect x="138" y={y + 11} width={i % 2 ? 60 : 72} height="5" rx="2.5" className="fill-slate-200" />
          </g>
        );
      })}
    </g>

    {/* grade badge */}
    <g transform="rotate(10 282 196)">
      <circle cx="282" cy="196" r="32" className="fill-amber-400" />
      <circle cx="282" cy="196" r="25" strokeWidth="2" strokeDasharray="3 4" className="stroke-amber-100" />
      <text
        x="282"
        y="205"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fontFamily="inherit"
        className="fill-white"
      >
        A+
      </text>
    </g>

    {/* pencil */}
    <g transform="rotate(38 74 132)">
      <rect x="64" y="84" width="18" height="84" rx="3" className="fill-amber-300" />
      <rect x="64" y="84" width="18" height="12" rx="3" className="fill-rose-300" />
      <rect x="64" y="94" width="18" height="5" className="fill-slate-300" />
      <path d="M64 168 h18 l-9 18 z" className="fill-amber-100" />
      <path d="M70 180 h6 l-3 6 z" className="fill-slate-700" />
    </g>
  </svg>
);
