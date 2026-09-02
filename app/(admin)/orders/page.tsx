"use client";

import { useEffect, useMemo, useState } from "react";
import { OrderList } from "@/features/orders/components/order-list";
import { useOrders } from "@/features/orders/api/order-api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse, OrderResponse } from "@/lib/types";
import { slotCodes, orderStatuses, paymentStatuses } from "@/lib/constants";
import { humanizeToken } from "@/lib/format";

/** Statuses where pickup rider should be assigned but isn't. */
const PICKUP_UNASSIGNED_STATUSES = new Set([
  "CONFIRMED",
  "IN_PROGRESS",
]);

/** Status where delivery rider should be assigned (via trip). */
const DELIVERY_UNASSIGNED_STATUS = "READY_FOR_DELIVERY";

function orderLabel(order: OrderResponse) {
  return order.orderNumber || order.orderCode || "Order";
}

type QuickFilter = "" | "pickup_unassigned" | "delivery_unassigned" | "booking_asap" | "booking_scheduled";

export default function OrdersPage() {
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [bookingTypeFilter, setBookingTypeFilter] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");

  const { data: orders = [], isLoading: loadingOrders, error: orderError } = useOrders({});

  useEffect(() => {
    let cancelled = false;
    async function loadBranches() {
      try {
        const nextBranches = await apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" });
        if (!cancelled) setBranches(nextBranches);
      } catch (e) {
        console.error("Failed to load branches", e);
      }
    }
    void loadBranches();
    return () => { cancelled = true; };
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (branchFilter && order.branchId !== branchFilter) return false;
      if (bookingTypeFilter && order.bookingType !== bookingTypeFilter) return false;
      if (slotFilter && order.scheduledSlotCode !== slotFilter) return false;
      if (dateFilter && order.scheduledDate && !order.scheduledDate.startsWith(dateFilter)) return false;
      if (statusFilter && order.status !== statusFilter) return false;
      if (paymentStatusFilter && order.paymentStatus !== paymentStatusFilter) return false;

      // quick filters
      if (quickFilter === "pickup_unassigned") {
        if (!PICKUP_UNASSIGNED_STATUSES.has(order.status)) return false;
        if (order.pickupRiderAuthUserId) return false;
      }
      if (quickFilter === "delivery_unassigned") {
        if (order.status !== DELIVERY_UNASSIGNED_STATUS) return false;
      }
      if (quickFilter === "booking_asap") {
        if (order.bookingType !== "ASAP") return false;
      }
      if (quickFilter === "booking_scheduled") {
        if (order.bookingType !== "SCHEDULED") return false;
      }

      if (!q) return true;
      return (
        orderLabel(order).toLowerCase().includes(q) ||
        (order.customerAuthUserId ? order.customerAuthUserId.toLowerCase().includes(q) : false) ||
        (order.contactSnapshot?.fullName ? order.contactSnapshot.fullName.toLowerCase().includes(q) : false) ||
        (order.serviceCategoryName ?? order.serviceCategoryCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, branchFilter, bookingTypeFilter, slotFilter, dateFilter, statusFilter, paymentStatusFilter, quickFilter, search]);

  const quickFilterLabels: Record<QuickFilter, string> = {
    "": "",
    pickup_unassigned: "Needs Pickup Rider",
    delivery_unassigned: "Needs Delivery Rider",
    booking_asap: "⚡ 2-Hour Express Orders",
    booking_scheduled: "📅 Scheduled Slot Orders",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="View and manage all orders."
        description="Use the filters to find the order you need, then open it to update payment, timing, staff, and status."
      />

      {/* ── Filter bar ── */}
      <Card className="space-y-4">
        {/* Row 2 — Quick-filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Quick</span>
          {(["pickup_unassigned", "delivery_unassigned", "booking_asap", "booking_scheduled"] as QuickFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setQuickFilter(quickFilter === f ? "" : f)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${quickFilter === f
                ? f === "pickup_unassigned"
                  ? "bg-amber-500 text-white shadow-md"
                  : f === "delivery_unassigned"
                    ? "bg-rose-500 text-white shadow-md"
                    : f === "booking_asap"
                      ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-400"
                      : "bg-blue-600 text-white shadow-md ring-2 ring-blue-400"
                : "border border-[var(--border-soft)] bg-surface text-text-secondary hover:bg-surface-muted hover:text-foreground"
                }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${quickFilter === f
                  ? "bg-white"
                  : f === "pickup_unassigned"
                    ? "bg-amber-400"
                    : f === "delivery_unassigned"
                      ? "bg-rose-400"
                      : f === "booking_asap"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
              />
              {quickFilterLabels[f]}
            </button>
          ))}
          {quickFilter ? (
            <button
              type="button"
              onClick={() => setQuickFilter("")}
              className="text-xs text-text-muted underline hover:text-foreground"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* Row 3 — Local filters */}
        <div className="grid gap-3 border-t border-[var(--border-soft)] pt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <select
            className="input-surface px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by order status"
          >
            <option value="">All Statuses</option>
            {orderStatuses.map((s) => (
              <option key={s} value={s}>{humanizeToken(s)}</option>
            ))}
          </select>
          <select
            className="input-surface px-3 py-2 text-sm"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            aria-label="Filter by payment status"
          >
            <option value="">Payment Status</option>
            {paymentStatuses.map((s) => (
              <option key={s} value={s}>{humanizeToken(s)}</option>
            ))}
          </select>
          <select
            className="input-surface px-3 py-2 text-sm font-medium"
            value={bookingTypeFilter}
            onChange={(e) => setBookingTypeFilter(e.target.value)}
            aria-label="Filter by booking type"
          >
            <option value="">Booking Type</option>
            <option value="ASAP">⚡ 2-Hour Express</option>
            <option value="SCHEDULED">📅 Scheduled Slot</option>
          </select>
          <select
            className="input-surface px-3 py-2 text-sm"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Filter by branch"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            className="input-surface px-3 py-2 text-sm"
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            aria-label="Filter by slot"
          >
            <option value="">Time Slot</option>
            {slotCodes.map((s) => (
              <option key={s} value={s}>{humanizeToken(s)}</option>
            ))}
          </select>
          <input
            type="date"
            className="input-surface px-3 py-2 text-sm cursor-pointer"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            onClick={(e) => {
              try {
                (e.target as HTMLInputElement).showPicker();
              } catch (err) { }
            }}
            aria-label="Filter by date"
          />
          <input
            className="input-surface px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer…"
          />
        </div>
      </Card>

      {orderError ? (
        <Card>
          <p className="text-sm text-danger">
            {orderError instanceof Error ? orderError.message : "Failed to load orders"}
          </p>
        </Card>
      ) : null}

      <OrderList
        orders={filteredOrders}
        loading={loadingOrders}
        branches={branches}
        highlightUnassigned={quickFilter === "delivery_unassigned" || quickFilter === "pickup_unassigned"}
      />
    </div>
  );
}
