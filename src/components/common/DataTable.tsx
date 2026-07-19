import type { ReactNode } from "react";

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

export type SimpleColumn<T> = {
  id: string;
  header: string;
  className?: string;
  priority?: "primary" | "secondary" | "detail" | "action";
  mobileLabel?: string | false;
  cell: (row: T) => ReactNode;
};

function priorityClass(
  priority: SimpleColumn<unknown>["priority"],
  header = false,
) {
  if (priority === "secondary") return "hidden sm:table-cell";
  if (priority === "detail") return "hidden xl:table-cell";
  if (priority === "action") {
    return cn(
      "sticky right-0 bg-card max-sm:static",
      header ? "z-20" : "z-10",
    );
  }
  return undefined;
}

export function DataTable<T>({
  rows,
  columns,
  isLoading,
  empty,
  getRowId,
}: {
  rows: T[];
  columns: SimpleColumn<T>[];
  isLoading?: boolean;
  empty?: ReactNode;
  getRowId: (row: T) => string | number;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!rows.length) {
    return empty ?? null;
  }

  return (
    <Table className="max-sm:block">
      <TableHeader className="max-sm:hidden">
        <TableRow>
          {columns.map((c) => (
            <TableHead
              key={c.id}
              className={cn(priorityClass(c.priority, true), c.className)}
            >
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="max-sm:block">
        {rows.map((row) => (
          <TableRow
            key={String(getRowId(row))}
            className="max-sm:mb-3 max-sm:grid max-sm:gap-2 max-sm:rounded-xl max-sm:border max-sm:p-3"
          >
            {columns.map((c) => (
              <TableCell
                key={c.id}
                className={cn(
                  "max-sm:flex max-sm:min-w-0 max-sm:items-start max-sm:justify-between max-sm:gap-3 max-sm:p-0 max-sm:whitespace-normal",
                  priorityClass(c.priority),
                  c.className,
                )}
              >
                {c.mobileLabel === false ? null : (
                  <span className="text-muted-foreground shrink-0 text-xs sm:hidden">
                    {c.mobileLabel ?? c.header}
                  </span>
                )}
                <div className="min-w-0 max-sm:text-right">{c.cell(row)}</div>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
