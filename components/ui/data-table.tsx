import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage: string;
  loading?: boolean;
  skeletonRows?: number;
};

export function DataTable<T>({
  columns,
  rows,
  emptyMessage,
  loading = false,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const columnHelper = createColumnHelper<T>();
  
  const tanstackColumns = useMemo(
    () =>
      columns.map((col) =>
        columnHelper.display({
          id: col.key,
          header: col.header,
          cell: (info) => col.render(info.row.original),
        }),
      ),
    [columns, columnHelper]
  );

  const table = useReactTable({
    data: rows,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden border border-[var(--border-soft)] bg-surface">
      <div className="overflow-x-auto thin-scrollbar">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-[0.12em] text-text-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3.5 py-2.5 font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr
                  key={`skeleton-${rowIndex}`}
                  className="border-t border-[var(--border-soft)] align-top"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-3.5 py-2.5">
                      <div className="skeleton h-3.5 rounded-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--border-soft)] align-top transition hover:bg-surface-muted/70"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3.5 py-2.5 text-text-secondary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
