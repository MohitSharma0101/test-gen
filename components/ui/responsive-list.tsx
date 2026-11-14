import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ListColumn<T> = {
  // Header text; screen-reader only when `srOnlyHeader` (checkbox, actions)
  header: string;
  srOnlyHeader?: boolean;
  cell: (row: T) => ReactNode;
  // Fixed width class for <col>, e.g. "w-20"; omit for the flexible column
  width?: string;
  align?: "left" | "right";
  className?: string;
};

type Props<T> = {
  rows: T[];
  rowKey: (row: T) => string;
  columns: ListColumn<T>[];
  // How one row looks on phones; the table is used from `md` up
  renderCard: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
  // Dims the rows while new data is on its way
  busy?: boolean;
  className?: string;
};

// One data set, two layouts: a compact table on tablets and desktops, a card
// per row on phones (wide tables don't fit a phone). Selection, actions and
// states (loading/empty/error) stay with the page.
export function ResponsiveList<T>({ rows, rowKey, columns, renderCard, rowClassName, busy, className }: Props<T>) {
  return (
    <div className={className}>
      <ul className={cn("space-y-2 md:hidden", busy && "opacity-60 transition-opacity")}>
        {rows.map((row) => (
          <li key={rowKey(row)}>{renderCard(row)}</li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            {columns.map((c, i) => (
              <col key={i} className={c.width} />
            ))}
          </colgroup>
          <thead className="border-b bg-muted/50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  scope="col"
                  className={cn("px-3 py-2.5 first:pl-4", c.align === "right" && "text-right", c.className)}
                >
                  <span className={cn(c.srOnlyHeader && "sr-only")}>{c.header}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn(busy && "opacity-60 transition-opacity")}>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={cn("border-b last:border-0 hover:bg-muted/50", rowClassName?.(row))}>
                {columns.map((c, i) => (
                  <td
                    key={i}
                    className={cn("px-3 py-2 align-middle first:pl-4", c.align === "right" && "text-right tabular-nums", c.className)}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
