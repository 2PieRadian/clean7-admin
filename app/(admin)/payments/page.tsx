"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useOrders, useFinanceStats } from "@/features/orders/api/order-api";
import { useCategories } from "@/features/catalog/api/catalog-api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/field";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/format";

export default function FinancePage() {
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Load branches for filter dropdown
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

  const { data: categories = [] } = useCategories();

  // Query parameters for backend request
  const orderQuery = useMemo(() => {
    const q: Record<string, string | number> = {
      page,
      limit,
    };
    if (branchFilter) q.branchId = branchFilter;
    if (categoryFilter) q.serviceCategory = categoryFilter;
    if (paymentStatusFilter) q.paymentStatus = paymentStatusFilter;
    if (startDate) q.startDate = startDate;
    if (endDate) q.endDate = endDate;
    return q;
  }, [page, limit, branchFilter, categoryFilter, paymentStatusFilter, startDate, endDate]);

  const { data: ordersData, isLoading: loadingOrders, error: orderError } = useOrders(orderQuery);
  const orders = ordersData?.orders ?? [];
  const serverPagination = ordersData?.pagination;

  // Backend stats query matching selected branch and date range
  const statsQuery = useMemo(() => {
    const q: Record<string, string> = {};
    if (branchFilter) q.branchId = branchFilter;
    if (startDate) q.startDate = startDate;
    if (endDate) q.endDate = endDate;
    return q;
  }, [branchFilter, startDate, endDate]);

  const { data: financeStats } = useFinanceStats(statsQuery);

  // Financial KPIs (use server finance-stats aggregate if available, otherwise compute from orders)
  const financeSummary = useMemo(() => {
    if (financeStats) {
      return {
        collectedRevenue: Number(financeStats.payments?.paidAmount ?? 0),
        pendingCollection: Number((financeStats.payments?.pendingAmount ?? 0) + (financeStats.payments?.codPendingAmount ?? 0)),
        paidOrdersCount: (financeStats.payments?.paidOrders ?? 0) + (financeStats.payments?.codCollectedOrders ?? 0),
        pendingOrdersCount: (financeStats.payments?.pendingOrders ?? 0) + (financeStats.payments?.codPendingOrders ?? 0),
        totalOrdersCount: financeStats.orders?.totalOrders ?? 0,
        completedOrdersCount: financeStats.orders?.completedOrders ?? 0,
        cancelledOrdersCount: financeStats.orders?.cancelledOrders ?? 0,
        refundedAmount: Number(financeStats.payments?.refundedAmount ?? 0),
        refundedOrdersCount: financeStats.payments?.refundedOrders ?? 0,
      };
    }

    let collectedRevenue = 0;
    let pendingCollection = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let refundedAmount = 0;
    let refundedOrdersCount = 0;

    for (const order of orders) {
      const amount = Number(order.grandTotalAmount || 0);

      // Status tracking
      if (order.status === "COMPLETED" || order.status === "DELIVERED") {
        completedOrdersCount++;
      } else if (order.status === "CANCELLED") {
        cancelledOrdersCount++;
      }

      // Financial status tracking (exclude CANCELLED orders from active revenue/pending)
      if (order.paymentStatus === "REFUNDED") {
        refundedAmount += amount;
        refundedOrdersCount++;
      } else if (order.status !== "CANCELLED") {
        if (order.paymentStatus === "PAID" || order.paymentStatus === "COD_COLLECTED") {
          collectedRevenue += amount;
          paidOrdersCount++;
        } else if (
          order.paymentStatus === "COD_PENDING_COLLECTION" ||
          order.paymentStatus === "PENDING"
        ) {
          pendingCollection += amount;
          pendingOrdersCount++;
        }
      }
    }

    return {
      collectedRevenue,
      pendingCollection,
      paidOrdersCount,
      pendingOrdersCount,
      totalOrdersCount: orders.length,
      completedOrdersCount,
      cancelledOrdersCount,
      refundedAmount,
      refundedOrdersCount,
    };
  }, [financeStats, orders]);

  const total = serverPagination?.total ?? orders.length;
  const totalPages = Math.max(1, serverPagination?.totalPages ?? (Math.ceil(total / limit) || 1));
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  if (orderError) {
    return <Card className="p-4 text-danger">Failed to load transactions.</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Finance & Transactions"
          description="View and filter all financial transactions, revenue, and payouts across branches."
        />
        <Link
          href="/analytics"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-sm font-semibold transition-all shadow-sm shrink-0 self-start sm:self-auto"
        >
          <span>View Analytics & Charts</span>
          <span>→</span>
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 flex flex-col justify-center space-y-2">
          <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Total Collected Revenue
          </span>
          <span className="text-3xl font-bold text-success">
            {formatMoney(financeSummary.collectedRevenue)}
          </span>
          <span className="text-xs text-text-muted">
            {financeSummary.paidOrdersCount} paid orders (Online + COD Collected)
          </span>
        </Card>

        <Card className="p-6 flex flex-col justify-center space-y-2">
          <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Pending Collection
          </span>
          <span className="text-3xl font-bold text-warning">
            {formatMoney(financeSummary.pendingCollection)}
          </span>
          <span className="text-xs text-text-muted">
            {financeSummary.pendingOrdersCount} orders awaiting collection
          </span>
        </Card>

        <Card className="p-6 flex flex-col justify-center space-y-2">
          <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Total Orders
          </span>
          <span className="text-3xl font-bold text-foreground">
            {financeSummary.totalOrdersCount}
          </span>
          <span className="text-xs text-text-muted">
            {financeSummary.completedOrdersCount} completed · {financeSummary.cancelledOrdersCount} cancelled
          </span>
        </Card>

        <Card className="p-6 flex flex-col justify-center space-y-2">
          <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Refunded
          </span>
          <span className="text-3xl font-bold text-danger">
            {formatMoney(financeSummary.refundedAmount)}
          </span>
          <span className="text-xs text-text-muted">
            {financeSummary.refundedOrdersCount} refunded order{financeSummary.refundedOrdersCount !== 1 ? "s" : ""}
          </span>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Branch"
            name="branch"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>

          <Select
            label="Service Category"
            name="category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id || c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>

          <Select
            label="Payment Status"
            name="paymentStatus"
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="COD_PENDING_COLLECTION">COD Pending</option>
            <option value="COD_COLLECTED">COD Collected</option>
            <option value="REFUNDED">Refunded</option>
          </Select>
        </div>

        {/* Date Range Picker Row */}
        <div className="border-t border-[var(--border-soft)] pt-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={({ startDate: s, endDate: e }) => {
              setStartDate(s);
              setEndDate(e);
              setPage(1);
            }}
            label="Transaction Date Range (Native Calendar)"
          />
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        {loadingOrders ? (
          <div className="p-6">
            <InlineLoadingCard lines={5} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-text-secondary whitespace-nowrap">
                <thead className="bg-surface-elevated/50 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Branch</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                        No transactions found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const branch = branches.find((b) => b.id === order.branchId);
                      return (
                        <tr key={order.id} className="hover:bg-surface-elevated/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <Link href={`/orders/${order.id}`} className="hover:underline">
                              {order.orderNumber || order.orderCode}
                            </Link>
                          </td>
                          <td className="px-4 py-3">{formatDate(order.createdAt || order.scheduledDate)}</td>
                          <td className="px-4 py-3">{branch ? branch.name : order.branchId}</td>
                          <td className="px-4 py-3">{order.serviceCategoryName || order.serviceCategoryCode}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{formatMoney(order.grandTotalAmount, order.currency)}</td>
                          <td className="px-4 py-3">
                            <Badge value={order.paymentStatus} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border-soft)] text-sm">
              <div className="text-text-secondary text-xs sm:text-sm">
                Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
                <span className="font-semibold text-foreground">{endItem}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> transactions
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span>Rows:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="input-surface px-2 py-1 text-xs rounded-lg font-medium text-foreground bg-surface border border-[var(--border-soft)] cursor-pointer"
                    aria-label="Rows per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-[var(--border-soft)] bg-surface text-text-secondary hover:bg-surface-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-[var(--border-soft)] bg-surface text-text-secondary hover:bg-surface-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="text-xs font-medium text-foreground px-2">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-[var(--border-soft)] bg-surface text-text-secondary hover:bg-surface-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-[var(--border-soft)] bg-surface text-text-secondary hover:bg-surface-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
