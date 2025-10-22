import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ColumnConfig<T> = {
  header: string;
  accessor?: keyof T;
  className?: string;
  cellClassName?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  loading: boolean;
  columns: ColumnConfig<T>[];
  className?: string;
  rowKey: (row: T) => string | number;
};

const DataTable = <T,>({
  data,
  loading,
  columns,
  className,
  rowKey,
}: DataTableProps<T>) => {
  return (
    <div className={className}>
      {loading ? (
        <div className="w-full flex flex-col gap-2 mt-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-full h-[60px]" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader className="border border-slate-300 bg-slate-200">
            <TableRow className="divide-x divide-slate-300 border-b border-slate-300">
              {columns.map((col, index) => (
                <TableHead
                  key={String(col.accessor) + index}
                  className={cn(`text-right`, index === 0 && 'text-left', col.className, col.headerClassName)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-300 border border-slate-300">
            {data.map((row, rowIndex) => (
              <TableRow
                key={rowKey(row)}
                className="divide-x divide-slate-300 border-slate-300"
              >
                {columns.map((col, index) => (
                  <TableCell
                    key={String(col.accessor) + index}
                    className={cn(`text-right`, index === 0 && 'text-left', col.cellClassName)}
                  >
                    {col.render
                      ? col.render(row, rowIndex)
                      : String(col.accessor ? row[col.accessor] : "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default DataTable;
