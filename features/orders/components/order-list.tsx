"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  formatMoney,
  orderFulfillmentSurface,
  orderStatusLabel,
  paymentStatusLabel,
  scheduledSlotLabel,
} from "@/lib/format";
import type { OrderResponse, BranchAdminResponse } from "@/lib/types";

function shortCustomerRef(id: string) {
  if (id.length <= 14) return id;
  return `${id.slice(0, 12)}…`;
}

function getAlertLabel(order: OrderResponse): string | null {
  const s = order.status;
  if ((s === "CONFIRMED" || s === "IN_PROGRESS") && !order.pickupRiderAuthUserId) {
    return "No pickup rider";
  }
  if (s === "READY_FOR_DELIVERY") {
    return "Awaiting delivery trip";
  }
  return null;
}

function startOfTodayIsoDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const columnHelper = createColumnHelper<OrderResponse>();

const columns = [
  columnHelper.accessor("orderNumber", {
    id: "orderNumber",
    header: "Order",
    cell: (info) => {
      const order = info.row.original;
      return (
        <div>
          <Link
            href={`/orders/${order.id}`}
            className="font-semibold text-foreground underline decoration-[rgba(39,193,165,0.35)] underline-offset-4"
          >
            {order.serviceCategoryName ?? order.serviceCategoryCode ?? "Order"}
            {order.serviceName ? ` · ${order.serviceName}` : ""}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs font-medium text-text-secondary">
              {order.orderNumber || order.orderCode || "Order"}
            </p>
            {order.bookingType === "ASAP" && (
              <span className="inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                ⚡ ASAP
              </span>
            )}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("customerAuthUserId", {
    id: "customer",
    header: "Customer",
    cell: (info) => {
      const order = info.row.original;
      const name = order.contactSnapshot?.fullName;
      return (
        <span className="text-xs text-foreground font-medium" title={info.getValue()}>
          {name ? name : shortCustomerRef(info.getValue())}
        </span>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: "Order Placed",
    cell: (info) => (
      <span className="text-sm font-medium text-foreground">{formatDate(info.getValue())}</span>
    ),
  }),

  columnHelper.display({
    id: "assignment",
    header: "Assignment",
    cell: (info) => {
      const { assignmentState } = orderFulfillmentSurface(info.row.original);
      const alert = getAlertLabel(info.row.original);
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">{assignmentState}</span>
          {alert ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-400/30">
              ⚠ {alert}
            </span>
          ) : null}
        </div>
      );
    },
  }),
  columnHelper.display({
    id: "sla",
    header: "SLA",
    cell: (info) => {
      const order = info.row.original;
      if (order.bookingType !== "ASAP") return <span className="text-xs text-text-muted">—</span>;

      const statusMap: Record<string, { label: string; bg: string; text: string }> = {
        PENDING: { label: "Pending", bg: "bg-blue-100", text: "text-blue-700" },
        MET: { label: "Met", bg: "bg-green-100", text: "text-green-700" },
        BREACHED: { label: "Breached", bg: "bg-red-100", text: "text-red-700" },
        EXEMPT: { label: "Exempt", bg: "bg-gray-100", text: "text-gray-700" },
      };

      const state = order.slaStatus ? statusMap[order.slaStatus] : statusMap["PENDING"];
      return (
        <div className="flex flex-col gap-1">
          <span className={`inline-flex w-fit items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${state.bg} ${state.text}`}>
            {state.label}
          </span>
          {order.promisedArrivalTo && (
            <span className="text-[10px] text-text-secondary">
              By {new Date(order.promisedArrivalTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("grandTotalAmount", {
    id: "total",
    header: "Total",
    cell: (info) => (
      <span className="text-sm font-medium text-foreground">
        {formatMoney(info.getValue(), info.row.original.currency)}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => <Badge value={info.getValue()}>{orderStatusLabel(info.getValue())}</Badge>,
  }),

];

const CATEGORIES = [
  { id: "ALL", label: "All Orders" },
  { id: "LAUNDRY", label: "Laundry" },
  { id: "HOME_CLEANING", label: "Home Cleaning" },
  { id: "CAR_WASH", label: "Car Wash" },
  { id: "PEST_CONTROL", label: "Pest Control" },
];

const QUICK_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "WAITING_PICKUP", label: "Waiting for Pickup" },
  { id: "PROCESSING", label: "Processing" },
  { id: "READY_DELIVERY", label: "Ready for Delivery" },
  { id: "DELAYED", label: "Delayed" },
  { id: "COMPLETED_TODAY", label: "Completed Today" },
  { id: "AWAITING_ASSIGNMENT", label: "Awaiting Assignment" },
];

export function OrderList({
  orders,
  loading = false,
  branches = [],
  highlightUnassigned = false,
}: {
  orders: OrderResponse[];
  loading?: boolean;
  branches?: BranchAdminResponse[];
  highlightUnassigned?: boolean;
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [quickFilter, setQuickFilter] = useState("ALL");

  const today = useMemo(() => startOfTodayIsoDate(), []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (selectedCategory !== "ALL" && o.serviceCategoryCode !== selectedCategory) {
        return false;
      }

      if (quickFilter !== "ALL") {
        if (quickFilter === "WAITING_PICKUP") {
          if (o.status !== "CONFIRMED" && o.status !== "IN_PROGRESS") return false;
        }
        if (quickFilter === "PROCESSING") {
          if (o.status !== "PROCESSING") return false;
        }
        if (quickFilter === "READY_DELIVERY") {
          if (o.status !== "READY_FOR_DELIVERY") return false;
        }
        if (quickFilter === "DELAYED") {
          const d = o.scheduledDate ? String(o.scheduledDate).slice(0, 10) : null;
          if (!d || d >= today || o.status === "DELIVERED" || o.status === "COMPLETED" || o.status === "CANCELLED") return false;
        }
        if (quickFilter === "COMPLETED_TODAY") {
          const updatedDate = o.updatedAt ? String(o.updatedAt).slice(0, 10) : null;
          if (updatedDate !== today || (o.status !== "COMPLETED" && o.status !== "DELIVERED")) return false;
        }
        if (quickFilter === "AWAITING_ASSIGNMENT") {
          const alert = getAlertLabel(o);
          if (!alert && !(!o.assignedOperatorAuthUserId && o.serviceMode === "AT_HOME" && (o.status === "PENDING" || o.status === "CONFIRMED"))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [orders, selectedCategory, quickFilter, today]);

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { branches },
  });

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto thin-scrollbar pb-2">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${selectedCategory === c.id
              ? "bg-foreground text-surface"
              : "bg-surface-muted text-text-secondary hover:bg-surface-primary hover:text-foreground"
              }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Card className="space-y-6 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Operational Queue</h2>
            <p className="text-sm text-text-secondary">
              Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setQuickFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${quickFilter === f.id
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-surface text-text-muted ring-1 ring-[var(--border-soft)] hover:bg-surface-muted"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden border border-[var(--border-soft)] rounded-2xl bg-surface shadow-sm">
          <div className="overflow-x-auto thin-scrollbar">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-surface-muted/50 text-left text-xs uppercase tracking-wider text-text-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-semibold whitespace-nowrap border-b border-[var(--border-soft)]">
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
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={`skeleton-${rowIndex}`} className="border-t border-[var(--border-soft)] align-top">
                      {columns.map((_, colIndex) => (
                        <td key={colIndex} className="px-4 py-3">
                          <div className="skeleton h-3 rounded-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => {
                    const alert = getAlertLabel(row.original);
                    const isDelayed = row.original.scheduledDate && String(row.original.scheduledDate).slice(0, 10) < today && row.original.status !== "COMPLETED" && row.original.status !== "DELIVERED" && row.original.status !== "CANCELLED";
                    const rowHighlight = (highlightUnassigned && alert) || isDelayed;

                    return (
                      <tr
                        key={row.id}
                        onClick={() => router.push(`/orders/${row.original.id}`)}
                        className={`border-b last:border-b-0 border-[var(--border-soft)] align-middle transition-all duration-200 cursor-pointer hover:bg-primary/5 hover:shadow-sm hover:scale-[1.01] hover:z-10 relative group ${rowHighlight ? "bg-amber-500/5" : ""
                          }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-4 text-text-secondary group-hover:text-foreground transition-colors">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <p className="text-base font-semibold text-foreground">No orders found.</p>
                        <p className="text-sm text-text-muted max-w-[280px]">
                          {quickFilter === "WAITING_PICKUP" && "No orders waiting for pickup assignment."}
                          {quickFilter === "DELAYED" && "No delayed deliveries right now. Great job!"}
                          {quickFilter === "AWAITING_ASSIGNMENT" && "All operational assignments are up to date."}
                          {quickFilter === "PROCESSING" && "No orders are currently in processing."}
                          {quickFilter === "READY_DELIVERY" && "No orders are ready for delivery pickup."}
                          {quickFilter === "ALL" && "There are no orders matching the current filters."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
