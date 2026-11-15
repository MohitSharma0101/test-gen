"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

// Chart colours: categorical slots 1 and 2 of the validated data-viz palette
// (blue / orange: CVD ΔE 24.7, normal-vision ΔE 33.6, ≥3:1 on the surface),
// stepped for dark mode. Used as CSS variables so marks never hard-code hex.
export const CHART_VARS =
  "[--viz-1:#2a78d6] [--viz-2:#eb6834] dark:[--viz-1:#3987e5] dark:[--viz-2:#d95926] [--viz-grid:hsl(var(--border))]";

// Width of the element, kept in sync, so the SVG is drawn at real pixels
// (no viewBox stretching: lines stay 2px and text stays its size)
export const useWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
};

// Tooltip: values lead, labels follow; positioned inside the chart box and
// flipped to stay on screen. Content only ever rendered as React text.
export const ChartTooltip = ({ x, width, children }: { x: number; width: number; children: ReactNode }) => {
  const left = Math.min(Math.max(x - 90, 0), Math.max(width - 180, 0));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 w-[180px] rounded-lg border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left }}
    >
      {children}
    </div>
  );
};

export const TooltipRow = ({ color, value, label }: { color?: string; value: ReactNode; label: ReactNode }) => (
  <div className="flex items-center gap-1.5">
    {color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
    <span className="font-semibold tabular-nums">{value}</span>
    <span className="truncate text-muted-foreground">{label}</span>
  </div>
);

// Same numbers as a table for screen readers (tooltips enhance, never gate)
export const SrTable = ({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) => (
  <table className="sr-only">
    <caption>{caption}</caption>
    <thead>
      <tr>
        {head.map((h) => (
          <th key={h} scope="col">
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i}>
          {r.map((c, j) => (
            <td key={j}>{c}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export const Y_TICKS = [0, 25, 50, 75, 100];
export const PAD = { top: 12, right: 12, bottom: 24, left: 34 };
