"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOrders } from "@/features/orders/api/order-api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/field";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/format";

export default function FinancePage() {
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  const { data: orders = [], isLoading: loadingOrders, error: orderError } = useOrders({});

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

  // Unique categories derived from loaded orders
  const uniqueCategories = useMemo(() => {
    const categories = new Map<string, string>();
    orders.forEach(order => {
      if (order.serviceCategoryCode) {
        categories.set(order.serviceCategoryCode, order.serviceCategoryName || order.serviceCategoryCode);
      }
    });
    return Array.from(categories.entries()).map(([code, name]) => ({ code, name }));
  }, [orders]);

  // Orders scoped to the selected branch (or all branches)
  const branchOrders = useMemo(() => {
    if (!branchFilter) return orders;
    return orders.filter((o) => o.branchId === branchFilter);
  }, [orders, branchFilter]);

  // Financial KPIs calculated logically from orders (server-side loaded data)
  const financeSummary = useMemo(() => {
    let collectedRevenue = 0;
    let pendingCollection = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let refundedAmount = 0;
    let refundedOrdersCount = 0;

    for (const order of branchOrders) {
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
      totalOrdersCount: branchOrders.length,
      completedOrdersCount,
      cancelledOrdersCount,
      refundedAmount,
      refundedOrdersCount,
    };
  }, [branchOrders]);

  // Filtered orders for the transactions table
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (branchFilter && order.branchId !== branchFilter) return false;
      if (categoryFilter && order.serviceCategoryCode !== categoryFilter) return false;
      if (paymentStatusFilter && order.paymentStatus !== paymentStatusFilter) return false;
      return true;
    });
  }, [orders, branchFilter, categoryFilter, paymentStatusFilter]);

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

      {loadingOrders ? (
        <InlineLoadingCard lines={4} />
      ) : (
        <>
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
          <Card className="space-y-5 p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Branch"
                name="branch"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>

              <Select
                label="Service Category"
                name="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </Select>

              <Select
                label="Payment Status"
                name="paymentStatus"
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
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
          </Card>

          {/* Transactions Table */}
          <Card className="overflow-hidden">
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
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                        No transactions found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const branch = branches.find(b => b.id === order.branchId);
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
          </Card>
        </>
      )}
    </div>
  );
}
