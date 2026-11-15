"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { CHART_VARS, ChartTooltip, PAD, SrTable, Y_TICKS, useWidth } from "./chart-frame";

type Props = {
  // value is a percent (0–100); null draws nothing (e.g. a month without class)
  items: { key: string; label: string; short: string; value: number | null; detail?: ReactNode }[];
  color: string;
  caption: string;
  height?: number;
  className?: string;
};

// Percent columns, one series. ≤24px wide with air around them, 4px rounded
// top and square at the baseline. The whole column band is the hit target;
// tooltip on hover, tap or keyboard focus. Only the latest value is labelled
// on its cap (the axis, tooltip and table carry the rest).
export const ColumnChart = ({ items, color, caption, height = 180, className }: Props) => {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = items.length;
  const w = Math.max(width - PAD.left - PAD.right, 1);
  const h = height - PAD.top - PAD.bottom;
  const band = w / Math.max(n, 1);
  const barW = Math.min(24, band * 0.6);
  const cx = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + h - (Math.min(Math.max(v, 0), 100) / 100) * h;
  const r = 4;

  // Rounded top, square bottom
  const column = (i: number, v: number) => {
    const x0 = cx(i) - barW / 2;
    const top = y(v);
    const base = PAD.top + h;
    const rr = Math.min(r, (base - top) / 2, barW / 2);
    return `M${x0},${base}V${top + rr}Q${x0},${top} ${x0 + rr},${top}H${x0 + barW - rr}Q${x0 + barW},${top} ${x0 + barW},${top + rr}V${base}Z`;
  };
  const lastIdx = (() => {
    for (let i = n - 1; i >= 0; i--) if (items[i].value !== null) return i;
    return -1;
  })();

  return (
    // w-full + min-w-0 + clip: the chart takes the width it's given and can
    // never hold its column open (an SVG drawn at a stale, wider measurement
    // used to push the whole page wider than a phone screen)
    <div className={cn("relative w-full min-w-0 overflow-hidden", CHART_VARS, className)} ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={caption} className="block" onPointerLeave={() => setHover(null)}>
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + w} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                {t}%
              </text>
            </g>
          ))}
          {items.map((it, i) => (
            <g
              key={it.key}
              tabIndex={0}
              role="button"
              aria-label={`${it.label}: ${it.value === null ? "no data" : `${Math.round(it.value)}%`}`}
              className="outline-none [&:focus-visible>rect]:fill-muted"
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              {/* The band, not just the bar, takes the pointer */}
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={h} fill={hover === i ? "hsl(var(--muted))" : "transparent"} opacity={0.6} />
              {it.value !== null && it.value > 0 && <path d={column(i, it.value)} fill={color} />}
              {(band >= 44 || (i % Math.ceil(44 / band) === 0 && n - 1 - i >= Math.ceil(44 / band) * 0.75) || i === n - 1) && (
                <text x={cx(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {it.short}
                </text>
              )}
              {i === lastIdx && it.value !== null && (
                <text x={cx(i)} y={y(it.value) - 6} textAnchor="middle" className="fill-foreground text-[11px] font-semibold tabular-nums">
                  {Math.round(it.value)}%
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {hover !== null && width > 0 && items[hover] && (
        <ChartTooltip x={cx(hover)} width={width}>
          <p className="mb-1 truncate font-semibold">{items[hover].label}</p>
          <p className="font-semibold tabular-nums">{items[hover].value === null ? "No data" : `${Math.round(items[hover].value as number)}%`}</p>
          {items[hover].detail}
        </ChartTooltip>
      )}
      <SrTable caption={caption} head={["", "%"]} rows={items.map((it) => [it.label, it.value === null ? "—" : `${Math.round(it.value)}%`])} />
    </div>
  );
};
