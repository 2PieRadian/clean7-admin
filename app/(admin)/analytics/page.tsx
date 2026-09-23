"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/field";
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import { useOrders } from "@/features/orders/api/order-api";
import { formatMoney, orderStatusLabel } from "@/lib/format";
import type { BranchAdminResponse } from "@/lib/types";

/* ── Brand Colors (Clean7 Gold, Brass, Ink, Cream - Rule 25 compliant, NO orange) ── */
const GOLD = "#C8A951";
const BRASS = "#A68B3A";
const EMERALD = "#10B981";
const SAPPHIRE = "#3B82F6";
const INDIGO = "#6366F1";
const PURPLE = "#8B5CF6";
const TEAL = "#14B8A6";
const ROSE = "#EF4444";
const YELLOW = "#EAB308";

const PIE_PALETTE = [GOLD, BRASS, SAPPHIRE, EMERALD, PURPLE, TEAL, INDIGO, ROSE];

const STATUS_COLOR_MAP: Record<string, string> = {
  COMPLETED: EMERALD,
  DELIVERED: "#059669",
  CANCELLED: ROSE,
  PENDING: YELLOW,
  CONFIRMED: SAPPHIRE,
  IN_PROGRESS: INDIGO,
  PROCESSING: PURPLE,
  READY_FOR_DELIVERY: "#06B6D4",
  OUT_FOR_DELIVERY: "#0EA5E9",
  RECEIVED_AT_BRANCH: TEAL,
  PICKUP_FAILED: ROSE,
  DELIVERY_FAILED: "#DC2626",
  ASSIGNED: INDIGO,
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonthLabel(monthStr: string) {
  const [year, month] = monthStr.split("-");
  const monthIdx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIdx] || month} '${year?.slice(2) || ""}`;
}

function formatCompactMoney(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

/* ── Custom Chart Tooltip ── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-xl text-sm min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5 border-b border-border pb-1">{label}</p>
      {payload.map((entry: any, idx: number) => {
        const isMoney =
          entry.name?.toLowerCase().includes("revenue") ||
          entry.name?.toLowerCase().includes("amount") ||
          entry.dataKey === "revenue" ||
          entry.dataKey === "amount";
        return (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs py-0.5">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-semibold text-foreground">
              {isMoney ? formatMoney(entry.value) : entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── KPI Metric Card ── */
function MetricCard({
  title,
  value,
  subtext,
  badge,
  tone = "default",
}: {
  title: string;
  value: string;
  subtext?: string;
  badge?: string;
  tone?: "gold" | "success" | "warning" | "danger" | "info" | "default";
}) {
  const toneClasses = {
    gold: "text-amber-500",
    success: "text-success",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-danger",
    info: "text-primary",
    default: "text-foreground",
  }[tone];

  return (
    <Card className="p-5 flex flex-col justify-between space-y-2 relative overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          {title}
        </span>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary border border-border">
            {badge}
          </span>
        )}
      </div>
      <div>
        <span className={`text-2xl lg:text-3xl font-bold tracking-tight ${toneClasses}`}>
          {value}
        </span>
      </div>
      {subtext && (
        <span className="text-xs text-text-secondary line-clamp-1">{subtext}</span>
      )}
    </Card>
  );
}

/* ── Section Container ── */
function ChartSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [branchFilter, setBranchFilter] = useState("");

  // Load branches
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" });
        if (!cancelled) {
          setBranches(data);
          // For branch admins, automatically lock/select their assigned branch
          if (!isDirector && data.length > 0) {
            setBranchFilter((current) => {
              if (current && data.some((b) => b.id === current)) {
                return current;
              }
              return data[0].id;
            });
          }
        }
      } catch (e) {
        console.error("Failed to load branches", e);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [isDirector]);

  // Load orders for responsive analytics calculation
  const orderQuery = useMemo(() => {
    if (!isDirector && branchFilter) {
      return { branchId: branchFilter };
    }
    return undefined;
  }, [isDirector, branchFilter]);

  const { data: orders = [], isLoading: loadingOrders, error: orderError } = useOrders(orderQuery);

  // Filter orders by selected branch (strictly enforce branch admin scope)
  const branchOrders = useMemo(() => {
    if (!isDirector) {
      if (branchFilter) {
        return orders.filter((o) => o.branchId === branchFilter);
      }
      if (branches.length > 0) {
        const allowedBranchIds = new Set(branches.map((b) => b.id));
        return orders.filter((o) => allowedBranchIds.has(o.branchId));
      }
      return [];
    }
    if (!branchFilter) return orders;
    return orders.filter((o) => o.branchId === branchFilter);
  }, [orders, branchFilter, isDirector, branches]);

  // Compute full financial and operations analytics from branchOrders
  const analytics = useMemo(() => {
    let collectedRevenue = 0;
    let pendingAmount = 0;
    let onlinePaidAmount = 0;
    let onlinePaidOrders = 0;
    let onlinePendingAmount = 0;
    let onlinePendingOrders = 0;
    let codCollectedAmount = 0;
    let codCollectedOrders = 0;
    let codPendingAmount = 0;
    let codPendingOrders = 0;
    let refundedAmount = 0;
    let refundedOrders = 0;
    let failedAmount = 0;
    let failedOrders = 0;

    let totalOrders = branchOrders.length;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let activeOrders = 0;

    // Service popularity map
    const serviceMap = new Map<string, { serviceName: string; categoryName: string; orders: number; revenue: number }>();

    // Payment method breakdown
    const paymentMethodMap = new Map<string, { method: string; orders: number; amount: number }>();

    // Order status map
    const statusMap = new Map<string, number>();

    // Monthly trend map: initialize 6 previous months
    const now = new Date();
    const monthlyMap = new Map<string, { month: string; revenue: number; orders: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { month: key, revenue: 0, orders: 0 });
    }

    for (const order of branchOrders) {
      const amount = Number(order.grandTotalAmount || 0);
      const isCod = order.paymentMethod === "COD";

      // Status aggregation
      if (order.status === "COMPLETED" || order.status === "DELIVERED") {
        completedOrders++;
      } else if (order.status === "CANCELLED") {
        cancelledOrders++;
      } else {
        activeOrders++;
      }
      statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);

      // Payment method grouping
      const method = order.paymentMethod || "UNKNOWN";
      const existingMethod = paymentMethodMap.get(method) || { method, orders: 0, amount: 0 };
      existingMethod.orders += 1;
      existingMethod.amount += amount;
      paymentMethodMap.set(method, existingMethod);

      // Financial calculations (exclude CANCELLED orders from active revenue/pending)
      if (order.paymentStatus === "REFUNDED") {
        refundedAmount += amount;
        refundedOrders++;
      } else if (order.status !== "CANCELLED") {
        if (order.paymentStatus === "PAID") {
          collectedRevenue += amount;
          if (isCod) {
            codCollectedAmount += amount;
            codCollectedOrders++;
          } else {
            onlinePaidAmount += amount;
            onlinePaidOrders++;
          }
        } else if (order.paymentStatus === "COD_COLLECTED") {
          collectedRevenue += amount;
          codCollectedAmount += amount;
          codCollectedOrders++;
        } else if (order.paymentStatus === "COD_PENDING_COLLECTION") {
          pendingAmount += amount;
          codPendingAmount += amount;
          codPendingOrders++;
        } else if (order.paymentStatus === "PENDING") {
          pendingAmount += amount;
          if (isCod) {
            codPendingAmount += amount;
            codPendingOrders++;
          } else {
            onlinePendingAmount += amount;
            onlinePendingOrders++;
          }
        } else if (order.paymentStatus === "FAILED") {
          failedAmount += amount;
          failedOrders++;
        }

        // Service wise breakdown
        const serviceName = order.serviceName || order.serviceCategoryName || "General Laundry";
        const categoryName = order.serviceCategoryName || "General";
        const sEntry = serviceMap.get(serviceName) || { serviceName, categoryName, orders: 0, revenue: 0 };
        sEntry.orders += 1;
        if (order.paymentStatus === "PAID" || order.paymentStatus === "COD_COLLECTED") {
          sEntry.revenue += amount;
        }
        serviceMap.set(serviceName, sEntry);

        // Monthly trends for collected revenue & orders
        if (order.paymentStatus === "PAID" || order.paymentStatus === "COD_COLLECTED") {
          const dateStr = order.createdAt || order.scheduledDate;
          if (dateStr) {
            const d = new Date(dateStr);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const mEntry = monthlyMap.get(key);
            if (mEntry) {
              mEntry.revenue += amount;
              mEntry.orders += 1;
            }
          }
        }
      }
    }

    // Sorted services: highest booked to lowest
    const serviceBreakdown = Array.from(serviceMap.values()).sort((a, b) => b.orders - a.orders);

    const paymentMethodBreakdown = Array.from(paymentMethodMap.values());

    const orderStatusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    const monthlyTrend = Array.from(monthlyMap.values()).map((item) => ({
      ...item,
      label: formatMonthLabel(item.month),
    }));

    return {
      totals: {
        collectedRevenue,
        pendingAmount,
        refundedAmount,
        failedAmount,
        totalOrders,
        completedOrders,
        cancelledOrders,
        activeOrders,
      },
      online: {
        paidOrders: onlinePaidOrders,
        paidAmount: onlinePaidAmount,
        pendingOrders: onlinePendingOrders,
        pendingAmount: onlinePendingAmount,
      },
      cod: {
        collectedOrders: codCollectedOrders,
        collectedAmount: codCollectedAmount,
        pendingOrders: codPendingOrders,
        pendingAmount: codPendingAmount,
      },
      serviceBreakdown,
      paymentMethodBreakdown,
      orderStatusBreakdown,
      monthlyTrend,
    };
  }, [branchOrders]);

  // Payment Breakdown Pie Chart Data
  const paymentBreakdownData = useMemo(() => {
    const data: Array<{ name: string; value: number; amount: number; color: string }> = [];
    if (analytics.online.paidOrders > 0) {
      data.push({
        name: "Online Paid",
        value: analytics.online.paidOrders,
        amount: analytics.online.paidAmount,
        color: SAPPHIRE,
      });
    }
    if (analytics.cod.collectedOrders > 0) {
      data.push({
        name: "COD Collected",
        value: analytics.cod.collectedOrders,
        amount: analytics.cod.collectedAmount,
        color: EMERALD,
      });
    }
    if (analytics.cod.pendingOrders > 0) {
      data.push({
        name: "COD Pending",
        value: analytics.cod.pendingOrders,
        amount: analytics.cod.pendingAmount,
        color: YELLOW,
      });
    }
    if (analytics.online.pendingOrders > 0) {
      data.push({
        name: "Online Pending",
        value: analytics.online.pendingOrders,
        amount: analytics.online.pendingAmount,
        color: BRASS,
      });
    }
    if (analytics.totals.refundedAmount > 0) {
      data.push({
        name: "Refunded",
        value: branchOrders.filter((o) => o.paymentStatus === "REFUNDED").length,
        amount: analytics.totals.refundedAmount,
        color: ROSE,
      });
    }
    return data;
  }, [analytics, branchOrders]);

  // Top 10 Services for chart
  const topServicesData = useMemo(() => {
    return analytics.serviceBreakdown.slice(0, 10).map((s) => ({
      name: s.serviceName.length > 22 ? `${s.serviceName.slice(0, 20)}…` : s.serviceName,
      fullName: s.serviceName,
      orders: s.orders,
      revenue: s.revenue,
    }));
  }, [analytics.serviceBreakdown]);

  // Order Status Chart Data
  const statusData = useMemo(() => {
    return analytics.orderStatusBreakdown
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((s) => ({
        name: orderStatusLabel(s.status as any),
        rawStatus: s.status,
        count: s.count,
        color: STATUS_COLOR_MAP[s.status] || BRASS,
      }));
  }, [analytics.orderStatusBreakdown]);

  if (orderError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financial Analytics" description="Comprehensive financial overview with charts and insights." />
        <Card className="p-6 text-center text-danger">Failed to load order and financial data.</Card>
      </div>
    );
  }

  const selectedBranchName = useMemo(() => {
    if (branchFilter) {
      return branches.find((b) => b.id === branchFilter)?.name || "Branch";
    }
    if (!isDirector && branches.length > 0) {
      return branches[0].name;
    }
    return "All Branches";
  }, [branchFilter, branches, isDirector]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={isDirector ? "Financial Analytics & Reports" : "Branch Analytics & Reports"}
          description={`Comprehensive live financial dashboard, service popularity, and payment analytics for ${selectedBranchName}.`}
        />

        {/* Branch Filter */}
        <div className="w-full sm:w-72 shrink-0">
          {isDirector ? (
            <Select
              label="Filter by Branch"
              name="branch"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All Branches (Aggregate)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          ) : branches.length > 1 ? (
            <Select
              label="Filter by Branch"
              name="branch"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Assigned Branch
              </span>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-surface-elevated/60 text-sm font-semibold text-foreground">
                <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">{branches[0]?.name || "Loading branch..."}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {loadingOrders ? (
        <InlineLoadingCard lines={8} />
      ) : (
        <>
          {/* ── KPI Metrics Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue Collected"
              value={formatMoney(analytics.totals.collectedRevenue)}
              subtext={`${analytics.online.paidOrders} Online · ${analytics.cod.collectedOrders} COD Collected`}
              badge="PAID"
              tone="success"
            />
            <MetricCard
              title="Amount Pending Collection"
              value={formatMoney(analytics.totals.pendingAmount)}
              subtext={`${analytics.cod.pendingOrders} COD pending (${formatMoney(analytics.cod.pendingAmount)})`}
              badge="PENDING"
              tone="warning"
            />
            <MetricCard
              title="Online Payments Revenue"
              value={formatMoney(analytics.online.paidAmount)}
              subtext={`${analytics.online.paidOrders} orders paid via Razorpay`}
              badge="ONLINE"
              tone="info"
            />
            <MetricCard
              title="COD Collected Revenue"
              value={formatMoney(analytics.cod.collectedAmount)}
              subtext={`${analytics.cod.collectedOrders} orders collected in cash`}
              badge="CASH"
              tone="gold"
            />
          </div>

          {/* ── Secondary Summary Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <span className="text-xs text-text-muted block">Total Orders</span>
              <span className="text-xl font-bold text-foreground mt-1 block">
                {analytics.totals.totalOrders}
              </span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-text-muted block">Completed / Delivered</span>
              <span className="text-xl font-bold text-success mt-1 block">
                {analytics.totals.completedOrders}
              </span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-text-muted block">Active In Progress</span>
              <span className="text-xl font-bold text-primary mt-1 block">
                {analytics.totals.activeOrders}
              </span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-text-muted block">Refunded Volume</span>
              <span className="text-xl font-bold text-danger mt-1 block">
                {formatMoney(analytics.totals.refundedAmount)}
              </span>
            </Card>
          </div>

          {/* ── Monthly Revenue & Orders Trend ── */}
          <ChartSection
            title="Monthly Revenue & Orders Trend (Last 6 Months)"
            subtitle="Demonstrating historical financial performance and booking volume"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Area Chart */}
              <div className="lg:col-span-2">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                  Monthly Revenue (₹)
                </span>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.monthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGoldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" strokeOpacity={0.5} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-text-muted, #9ca3af)" />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="var(--color-text-muted, #9ca3af)"
                        tickFormatter={(v) => formatCompactMoney(v)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke={GOLD}
                        strokeWidth={2.5}
                        fill="url(#revenueGoldGradient)"
                        dot={{ fill: GOLD, r: 4 }}
                        activeDot={{ r: 6, fill: GOLD }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Orders Bar Chart */}
              <div>
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                  Orders Count
                </span>
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" strokeOpacity={0.5} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-text-muted, #9ca3af)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted, #9ca3af)" allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="orders" name="Paid Orders" fill={BRASS} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </ChartSection>

          {/* ── Services Wise Chart (Most Booked to Lowest) ── */}
          <ChartSection
            title="Service Popularity & Revenue (Most Booked to Lowest)"
            subtitle="Comparing order counts and revenue generated across all offered services"
          >
            {topServicesData.length === 0 ? (
              <p className="text-sm text-text-muted py-8 text-center">No service data available for the selected branch.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Horizontal Bar Chart for Bookings */}
                <div className="lg:col-span-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-3">
                    Top Services by Order Count
                  </span>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={topServicesData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" strokeOpacity={0.5} />
                        <XAxis type="number" allowDecimals={false} stroke="var(--color-text-muted, #9ca3af)" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 11 }}
                          width={110}
                          stroke="var(--color-text-muted, #9ca3af)"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="orders" name="Total Bookings" fill={GOLD} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Service Leaderboard List */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                    Service Revenue Breakdown
                  </span>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {analytics.serviceBreakdown.map((s, idx) => (
                      <div
                        key={s.serviceName}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated/40 border border-border/50 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-medium text-foreground truncate">{s.serviceName}</p>
                            <p className="text-[10px] text-text-muted">{s.categoryName}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-semibold text-foreground">{formatMoney(s.revenue)}</p>
                          <p className="text-[10px] text-text-muted">{s.orders} order{s.orders !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ChartSection>

          {/* ── Payment Split & COD Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Distribution */}
            <ChartSection
              title="Online vs Cash on Delivery (COD) Status"
              subtitle="Breakdown of paid vs pending amounts across payment channels"
            >
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {paymentBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_PALETTE[index % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val, entry: any) => (
                        <span className="text-xs text-text-secondary">{val}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Payment Stats Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Online (Razorpay)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  </div>
                  <p className="text-base font-bold text-foreground mt-1">
                    {formatMoney(analytics.online.paidAmount)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {analytics.online.paidOrders} paid · {analytics.online.pendingOrders} pending
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">COD Collected</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-base font-bold text-foreground mt-1">
                    {formatMoney(analytics.cod.collectedAmount)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {analytics.cod.collectedOrders} orders collected
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">COD Pending</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  </div>
                  <p className="text-base font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                    {formatMoney(analytics.cod.pendingAmount)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {analytics.cod.pendingOrders} orders to collect
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Refunded</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  </div>
                  <p className="text-base font-bold text-danger mt-1">
                    {formatMoney(analytics.totals.refundedAmount)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Cancelled/returned orders
                  </p>
                </div>
              </div>
            </ChartSection>

            {/* Order Fulfillment Status Breakdown */}
            <ChartSection
              title="Order Fulfillment Lifecycle Status"
              subtitle="Distribution of orders currently across all fulfillment stages"
            >
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      angle={-30}
                      textAnchor="end"
                      stroke="var(--color-text-muted, #9ca3af)"
                    />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted, #9ca3af)" allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {statusData.map((s) => (
                  <span
                    key={s.rawStatus}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-surface-elevated border border-border text-text-secondary"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="font-medium text-foreground">{s.name}:</span>
                    <span>{s.count}</span>
                  </span>
                ))}
              </div>
            </ChartSection>
          </div>
        </>
      )}
    </div>
  );
}
