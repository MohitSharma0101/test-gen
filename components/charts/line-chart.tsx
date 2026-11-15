"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { CHART_VARS, ChartTooltip, PAD, SrTable, TooltipRow, Y_TICKS, useWidth } from "./chart-frame";

export type TLineSeries = { name: string; color: string; values: (number | null)[] };

type Props = {
  // One label per x position (e.g. the test name); `short` is the axis text
  points: { label: string; short: string }[];
  series: TLineSeries[]; // ≤ 2 here: student vs batch average
  // Extra tooltip lines for a point (marks, rank…)
  detail?: (index: number) => ReactNode;
  caption: string;
  height?: number;
  className?: string;
};

// Percent (0–100) over a sequence of points. 2px lines, ≥8px end dots with a
// surface ring, hairline solid grid, one y-axis. A crosshair snaps to the
// nearest point and the tooltip lists every series there. Legend for ≥2
// series plus a direct label at each line's end.
export const LineChart = ({ points, series, detail, caption, height = 200, className }: Props) => {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const endLabelRoom = series.length > 1 ? 44 : 0;
  const w = Math.max(width - PAD.left - PAD.right - endLabelRoom, 1);
  const h = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => PAD.top + h - (Math.min(Math.max(v, 0), 100) / 100) * h;

  const pathOf = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        pen = false; // a missing point breaks the line rather than inventing a value
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const nearest = (clientX: number, el: Element) => {
    const left = el.getBoundingClientRect().left;
    const px = clientX - left - PAD.left;
    return n <= 1 ? 0 : Math.min(n - 1, Math.max(0, Math.round((px / w) * (n - 1))));
  };

  // Sparse x labels: first, last and a few between, never overlapping
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 70))));
  const lastValue = (s: TLineSeries) => {
    for (let i = s.values.length - 1; i >= 0; i--) if (s.values[i] !== null) return { i, v: s.values[i] as number };
    return null;
  };

  return (
    // w-full + min-w-0 + clip: the chart takes the width it's given and can
    // never hold its column open (an SVG drawn at a stale, wider measurement
    // used to push the whole page wider than a phone screen)
    <div className={cn("relative w-full min-w-0 overflow-hidden", CHART_VARS, className)} ref={ref}>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={caption}
          tabIndex={0}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onPointerMove={(e) => setHover(nearest(e.clientX, e.currentTarget))}
          onPointerDown={(e) => setHover(nearest(e.clientX, e.currentTarget))}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
            else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
            else if (e.key === "Escape") setHover(null);
          }}
        >
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + w} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
                {t}%
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            // Every `every`-th label, plus the last; one that would crowd the last is skipped
            (i % every === 0 && n - 1 - i >= every * 0.75) || i === n - 1 ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">
                {p.short}
              </text>
            ) : null
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + h} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.5} />}
          {series.map((s) => (
            <path key={s.name} d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {series.map((s) =>
            s.values.map((v, i) =>
              v === null ? null : (
                <circle
                  key={`${s.name}-${i}`}
                  cx={x(i)}
                  cy={y(v)}
                  r={hover === i ? 5 : 4}
                  fill={s.color}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                />
              )
            )
          )}
          {series.length > 1 &&
            series.map((s) => {
              const last = lastValue(s);
              return last ? (
                <text key={s.name} x={x(last.i) + 8} y={y(last.v)} dy="0.32em" className="fill-foreground text-[11px] font-semibold tabular-nums">
                  {Math.round(last.v)}%
                </text>
              ) : null;
            })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <ChartTooltip x={x(hover)} width={width}>
          <p className="mb-1 truncate font-semibold">{points[hover]?.label}</p>
          {series.map((s) => (
            <TooltipRow key={s.name} color={s.color} value={s.values[hover] === null ? "—" : `${Math.round(s.values[hover] as number)}%`} label={s.name} />
          ))}
          {detail?.(hover)}
        </ChartTooltip>
      )}
      <SrTable
        caption={caption}
        head={["", ...series.map((s) => s.name)]}
        rows={points.map((p, i) => [p.label, ...series.map((s) => (s.values[i] === null ? "—" : `${Math.round(s.values[i] as number)}%`))])}
      />
    </div>
  );
};
