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
import {
  Clock,
  Zap,
  Calendar,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  LayoutGrid,
  List,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  formatMoney,
  formatTime,
  humanizeToken,
  orderStatusLabel,
  deliveryPromiseInfo,
  paymentBadgeInfo,
} from "@/lib/format";
import type { OrderResponse, BranchAdminResponse } from "@/lib/types";

function getAlertLabel(order: OrderResponse): string | null {
  const s = order.status;
  if ((s === "CONFIRMED" || s === "IN_PROGRESS") && !order.pickupRiderAuthUserId) {
    return "Needs Pickup Rider";
  }
  if (s === "READY_FOR_DELIVERY") {
    return "Needs Delivery Rider";
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
    header: () => (
      <div>
        <span>Order & Service</span>
        <p className="text-[10px] font-normal normal-case text-text-muted">ID · Service · Type</p>
      </div>
    ),
    cell: (info) => {
      const order = info.row.original;
      return (
        <div className="space-y-1 min-w-[190px]">
          <Link
            href={`/orders/${order.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors underline decoration-[rgba(39,193,165,0.35)] underline-offset-4 line-clamp-1"
          >
            {order.serviceCategoryName ?? order.serviceCategoryCode ?? "Order"}
            {order.serviceName ? ` · ${order.serviceName}` : ""}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono text-xs font-semibold text-text-secondary bg-surface-muted px-1.5 py-0.5 rounded border border-[var(--border-soft)]">
              {order.orderNumber || order.orderCode || `#${order.id.slice(0, 6)}`}
            </span>
            {order.bookingType === "ASAP" && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/30">
                <Zap className="h-2.5 w-2.5" /> ASAP
              </span>
            )}
            {order.serviceMode === "AT_HOME" ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                Home Visit
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                Pickup & Drop
              </span>
            )}
          </div>
        </div>
      );
    },
  }),

  columnHelper.accessor("customerAuthUserId", {
    id: "customer",
    header: () => (
      <div>
        <span>Customer</span>
        <p className="text-[10px] font-normal normal-case text-text-muted">Name & Contact</p>
      </div>
    ),
    cell: (info) => {
      const order = info.row.original;
      const name = order.contactSnapshot?.fullName;
      const phone = order.contactSnapshot?.phoneNumber;
      const address = order.serviceAddressSnapshot?.city || order.serviceAddressSnapshot?.line1;

      return (
        <div className="space-y-0.5 min-w-[150px]">
          <p className="text-sm font-semibold text-foreground">
            {name || "Customer"}
          </p>
          {phone ? (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
            >
              <Phone className="h-3 w-3 text-text-muted" />
              <span>{phone}</span>
            </a>
          ) : null}
          {address ? (
            <p className="flex items-center gap-1 text-[11px] text-text-muted truncate max-w-[170px]" title={address}>
              <MapPin className="h-2.5 w-2.5 shrink-0 text-text-muted" />
              <span className="truncate">{address}</span>
            </p>
          ) : null}
        </div>
      );
    },
  }),

  columnHelper.display({
    id: "deliveryTarget",
    header: () => (
      <div>
        <span>Delivery Target</span>
        <p className="text-[10px] font-normal normal-case text-text-muted">Commitment / Slot</p>
      </div>
    ),
    cell: (info) => {
      const order = info.row.original;
      const promise = deliveryPromiseInfo(order);

      return (
        <div className="space-y-1 min-w-[160px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${promise.badgeClass}`}>
              {promise.isOverdue && <AlertTriangle className="h-2.5 w-2.5" />}
              {!promise.isOverdue && promise.isAsap && <Zap className="h-2.5 w-2.5" />}
              {promise.statusLabel}
            </span>
          </div>
          <p className="text-xs text-text-secondary flex items-center gap-1 font-medium">
            <Clock className="h-3 w-3 text-text-muted shrink-0" />
            <span>{promise.timeDetail}</span>
          </p>
        </div>
      );
    },
  }),

  columnHelper.display({
    id: "assignment",
    header: () => (
      <div>
        <span>Staff Assignment</span>
        <p className="text-[10px] font-normal normal-case text-text-muted">Rider / Operator</p>
      </div>
    ),
    cell: (info) => {
      const order = info.row.original;
      const alert = getAlertLabel(order);
      const isFulfilled = order.status === "DELIVERED" || order.status === "COMPLETED";

      return (
        <div className="space-y-1 min-w-[140px]">
          {alert ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/30">
              <AlertTriangle className="h-2.5 w-2.5" />
              {alert}
            </span>
          ) : order.pickupRiderAuthUserId ? (
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary font-medium">
              <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
              Rider Assigned
            </span>
          ) : order.assignedOperatorAuthUserId ? (
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary font-medium">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              Operator Assigned
            </span>
          ) : isFulfilled ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Completed
            </span>
          ) : (
            <span className="text-xs text-text-muted">Unassigned</span>
          )}
        </div>
      );
    },
  }),

  columnHelper.accessor("grandTotalAmount", {
    id: "total",
    header: () => (
      <div>
        <span>Total & Payment</span>
        <p className="text-[10px] font-normal normal-case text-text-muted">Amount · Status</p>
      </div>
    ),
    cell: (info) => {
      const order = info.row.original;
      const pay = paymentBadgeInfo(order.paymentStatus);

      return (
        <div className="space-y-1 min-w-[120px]">
          <p className="text-sm font-bold text-foreground">
            {formatMoney(info.getValue(), order.currency)}
          </p>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${pay.badgeClass}`}>
            {pay.label}
          </span>
        </div>
      );
    },
  }),

  columnHelper.accessor("status", {
    id: "status",
    header: () => (
      <div>
        <span>Order Status</span>
        <p className="text-[10px] font-normal normal-case text-text-muted">Current Stage</p>
      </div>
    ),
    cell: (info) => <Badge value={info.getValue()}>{orderStatusLabel(info.getValue())}</Badge>,
  }),

  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: () => (
      <div>
        <span>Placed On</span>
        <p className="text-[10px] font-normal normal-case text-text-muted">Date & Time</p>
      </div>
    ),
    cell: (info) => (
      <div className="text-xs space-y-0.5 text-text-secondary whitespace-nowrap">
        <p className="font-medium text-foreground">{formatDate(info.getValue())}</p>
        <p className="text-[10px] text-text-muted">{formatTime(info.getValue())}</p>
      </div>
    ),
  }),

  columnHelper.display({
    id: "actions",
    header: "",
    cell: () => (
      <div className="flex justify-end">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-surface-muted text-text-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    ),
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
  { id: "ALL", label: "All Orders" },
  { id: "WAITING_PICKUP", label: "Waiting for Pickup" },
  { id: "PROCESSING", label: "In Processing" },
  { id: "READY_DELIVERY", label: "Ready for Delivery" },
  { id: "DELAYED", label: "Delayed Orders" },
  { id: "COMPLETED_TODAY", label: "Completed Today" },
  { id: "AWAITING_ASSIGNMENT", label: "Needs Assignment" },
];

function OrderCardItem({
  order,
  today,
  highlightUnassigned,
}: {
  order: OrderResponse;
  today: string;
  highlightUnassigned: boolean;
}) {
  const router = useRouter();
  const alert = getAlertLabel(order);
  const promise = deliveryPromiseInfo(order);
  const pay = paymentBadgeInfo(order.paymentStatus);
  const isDelayed =
    order.scheduledDate &&
    String(order.scheduledDate).slice(0, 10) < today &&
    order.status !== "COMPLETED" &&
    order.status !== "DELIVERED" &&
    order.status !== "CANCELLED";
  const rowHighlight = (highlightUnassigned && alert) || isDelayed || promise.isOverdue;

  const customerName = order.contactSnapshot?.fullName || "Customer";
  const customerPhone = order.contactSnapshot?.phoneNumber;
  const address = order.serviceAddressSnapshot?.city || order.serviceAddressSnapshot?.line1;

  return (
    <div
      onClick={() => router.push(`/orders/${order.id}`)}
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/40 ${rowHighlight
        ? "border-amber-400/50 bg-amber-500/[0.03]"
        : "border-[var(--border-soft)] bg-surface hover:bg-surface-primary"
        }`}
    >
      {/* Top Header */}
      <div className="space-y-2 pb-3 border-b border-[var(--border-soft)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded-md border border-[var(--border-soft)]">
              {order.orderNumber || order.orderCode || `#${order.id.slice(0, 6)}`}
            </span>
            {order.bookingType === "ASAP" && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/30">
                <Zap className="h-2.5 w-2.5" /> ASAP
              </span>
            )}
            {order.serviceMode === "AT_HOME" ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                Home Visit
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                Pickup & Drop
              </span>
            )}
          </div>
          <Badge value={order.status}>{orderStatusLabel(order.status)}</Badge>
        </div>

        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm line-clamp-1">
            {order.serviceCategoryName ?? order.serviceCategoryCode ?? "Order"}
            {order.serviceName ? ` · ${order.serviceName}` : ""}
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Placed on {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Middle Content */}
      <div className="py-3 space-y-2.5 text-xs">
        {/* Customer */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">{customerName}</p>
            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Phone className="h-3 w-3" />
                <span>{customerPhone}</span>
              </a>
            )}
          </div>
          {address && (
            <p className="flex items-center gap-1 text-[11px] text-text-muted text-right truncate max-w-[140px]" title={address}>
              <MapPin className="h-3 w-3 shrink-0 text-text-muted" />
              <span className="truncate">{address}</span>
            </p>
          )}
        </div>

        {/* Delivery Target (Clear Human Friendly Promise) */}
        <div className="rounded-xl bg-surface-muted/60 p-2.5 border border-[var(--border-soft)] space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-text-secondary">Delivery Target</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${promise.badgeClass}`}>
              {promise.isOverdue && <AlertTriangle className="h-2.5 w-2.5" />}
              {!promise.isOverdue && promise.isAsap && <Zap className="h-2.5 w-2.5" />}
              {promise.statusLabel}
            </span>
          </div>
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5 pt-0.5">
            <Clock className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <span>{promise.timeDetail}</span>
          </p>
        </div>

        {/* Staff Assignment Alert / Info */}
        {alert ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 ring-1 ring-amber-400/30">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Action Required: {alert}</span>
          </div>
        ) : order.pickupRiderAuthUserId ? (
          <p className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
            <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Pickup Rider Assigned</span>
          </p>
        ) : order.assignedOperatorAuthUserId ? (
          <p className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
            <User className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Operator Assigned</span>
          </p>
        ) : null}
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-[var(--border-soft)] flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-base font-bold text-foreground">
            {formatMoney(order.grandTotalAmount, order.currency)}
          </p>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${pay.badgeClass}`}>
            {pay.label}
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
          View Details
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const today = useMemo(() => startOfTodayIsoDate(), []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
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
          if (
            !d ||
            d >= today ||
            o.status === "DELIVERED" ||
            o.status === "COMPLETED" ||
            o.status === "CANCELLED"
          )
            return false;
        }
        if (quickFilter === "COMPLETED_TODAY") {
          const updatedDate = o.updatedAt ? String(o.updatedAt).slice(0, 10) : null;
          if (updatedDate !== today || (o.status !== "COMPLETED" && o.status !== "DELIVERED"))
            return false;
        }
        if (quickFilter === "AWAITING_ASSIGNMENT") {
          const alert = getAlertLabel(o);
          if (
            !alert &&
            !(
              !o.assignedOperatorAuthUserId &&
              o.serviceMode === "AT_HOME" &&
              (o.status === "PENDING" || o.status === "CONFIRMED")
            )
          ) {
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
      <div className="flex items-center gap-2 overflow-x-auto thin-scrollbar pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${selectedCategory === c.id
              ? "bg-foreground text-surface shadow-sm"
              : "bg-surface-muted text-text-secondary hover:bg-surface-primary hover:text-foreground"
              }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Main Orders Card */}
      <Card className="space-y-6 rounded-3xl p-5 shadow-sm border border-[var(--border-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Orders Queue</h2>
            <p className="text-sm text-text-secondary">
              Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} · Track schedules, customer details, and fulfillment
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setQuickFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${quickFilter === f.id
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30 font-semibold"
                    : "bg-surface text-text-muted ring-1 ring-[var(--border-soft)] hover:bg-surface-muted hover:text-foreground"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center border border-[var(--border-soft)] rounded-xl p-1 bg-surface-muted">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${viewMode === "table"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-text-muted hover:text-foreground"
                  }`}
                title="Table View"
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${viewMode === "cards"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-text-muted hover:text-foreground"
                  }`}
                title="Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content View: Table vs Cards */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-muted animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[var(--border-soft)] rounded-2xl">
            <div className="flex flex-col items-center justify-center space-y-2">
              <p className="text-base font-semibold text-foreground">No orders found.</p>
              <p className="text-sm text-text-muted max-w-[320px]">
                {quickFilter === "WAITING_PICKUP" && "No orders are currently waiting for pickup assignment."}
                {quickFilter === "DELAYED" && "No delayed orders right now. Great job!"}
                {quickFilter === "AWAITING_ASSIGNMENT" && "All operational assignments are up to date."}
                {quickFilter === "PROCESSING" && "No orders are currently being processed."}
                {quickFilter === "READY_DELIVERY" && "No orders are ready for delivery pickup."}
                {quickFilter === "ALL" && "There are no orders matching your current filters."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={`${viewMode === "cards" ? "hidden" : "hidden md:block"} overflow-hidden border border-[var(--border-soft)] rounded-2xl bg-surface shadow-sm`}>
              <div className="overflow-x-auto thin-scrollbar">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-surface-muted/50 text-left text-xs uppercase tracking-wider text-text-muted">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 font-semibold whitespace-nowrap border-b border-[var(--border-soft)]"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => {
                      const alert = getAlertLabel(row.original);
                      const promise = deliveryPromiseInfo(row.original);
                      const isDelayed =
                        row.original.scheduledDate &&
                        String(row.original.scheduledDate).slice(0, 10) < today &&
                        row.original.status !== "COMPLETED" &&
                        row.original.status !== "DELIVERED" &&
                        row.original.status !== "CANCELLED";
                      const rowHighlight =
                        (highlightUnassigned && alert) || isDelayed || promise.isOverdue;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => router.push(`/orders/${row.original.id}`)}
                          className={`border-b last:border-b-0 border-[var(--border-soft)] align-middle transition-all duration-150 cursor-pointer hover:bg-primary/5 relative group ${rowHighlight ? "bg-amber-500/[0.04]" : ""
                            }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="px-4 py-3.5 text-text-secondary group-hover:text-foreground transition-colors"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards View (Rendered in cards mode OR automatically on mobile devices) */}
            <div className={`${viewMode === "cards" ? "grid" : "grid md:hidden"} gap-4 sm:grid-cols-2 lg:grid-cols-3`}>
              {filteredOrders.map((order) => (
                <OrderCardItem
                  key={order.id}
                  order={order}
                  today={today}
                  highlightUnassigned={highlightUnassigned}
                />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
