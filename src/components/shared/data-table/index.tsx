"use client";

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

export interface Column<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  loadingRows?: number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  keyExtractor,
  emptyMessage = "No results found.",
  loadingRows = 5,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={String(col.key)}
                className={cn("text-xs font-medium", col.headerClassName)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={String(col.key)}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={keyExtractor(row)}>
                {columns.map((col) => (
                  <TableCell key={String(col.key)} className={col.className}>
                    {col.cell
                      ? col.cell(row)
                      : String((row as Record<string, unknown>)[col.key as string] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
