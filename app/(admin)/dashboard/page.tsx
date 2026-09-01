"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard, Skeleton } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import { getStuckOrderReasoning, orderStatusLabel } from "@/lib/format";
import type {
  DashboardMetricsResponse,
  OrderResponse,
} from "@/lib/types";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await apiRequest<DashboardMetricsResponse>({ path: "/admin/dashboard-metrics" });

        if (cancelled) return;
        setMetrics(data);
      } catch (nextError) {
        if (cancelled) return;
        setError(
          nextError instanceof Error ? nextError.message : "Unable to load dashboard.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Monitor today's workload and clear operational bottlenecks."
      />

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16 rounded-2xl" />
              </Card>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <InlineLoadingCard lines={5} />
            <InlineLoadingCard lines={4} />
          </div>
        </div>
      ) : null}

      {!loading && metrics ? (
        <>
          {/* Workload Summary */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Today's Workload Summary</h2>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {[
                ["Today's Orders", metrics.todayOrders],
                ["Pending Pickups", metrics.pendingPickups],
                ["Orders Processing", metrics.ordersProcessing],
                ["Deliveries Remaining", metrics.deliveriesRemaining],
                ["Operators Active", metrics.operatorsActive],
                ["Riders Active", metrics.ridersActive],
              ].map(([label, value]) => (
                <Card key={label} className="bg-surface-primary shadow-sm border border-[var(--border-soft)]">
                  <p className="text-xs font-medium text-text-secondary">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Operational Attention Grid */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Needs Attention Right Now</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                ["Needs Pickup Assignment", metrics.needsPickupAssignment, metrics.needsPickupAssignment > 0],
                ["Waiting for Pickup", metrics.waitingForPickup, false],
                ["Orders Awaiting Intake", metrics.awaitingIntake, metrics.awaitingIntake > 0],
                ["Needs Delivery Assignment", metrics.needsDeliveryAssignment, metrics.needsDeliveryAssignment > 0],
                ["Ready for Delivery", metrics.readyForDelivery, false],
                ["Delayed Orders", metrics.delayedOrders.length, metrics.delayedOrders.length > 0],
                ["Orders Stuck > 24h", metrics.stuckOrders.length, metrics.stuckOrders.length > 0],
                ["Idle Operators", metrics.idleOperatorsCount, false],
              ].map(([label, value, urgent]) => (
                <Link key={label as string} href="/orders" className="block">
                  <Card className={`rounded-[24px] transition hover:shadow-md ${urgent ? "border-amber-400 bg-amber-500/5 ring-1 ring-amber-400/20" : "bg-surface"}`}>
                    <div className="flex items-start justify-between">
                      <p className={`text-sm font-semibold ${urgent ? "text-amber-700" : "text-foreground"}`}>{label}</p>
                      {urgent && <Badge tone="warning">Action Needed</Badge>}
                    </div>
                    <p className={`mt-3 font-display text-4xl ${urgent ? "text-amber-600" : "text-foreground"}`}>{value as number}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Stuck & Delayed Orders List */}
          {(metrics.stuckOrders.length > 0 || metrics.delayedOrders.length > 0) && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground">Operational Bottlenecks</h2>
              <div className="grid gap-3">
                {Array.from(new Set([...metrics.stuckOrders, ...metrics.delayedOrders])).slice(0, 5).map((order) => {
                  const reason = getStuckOrderReasoning(order) || "Delayed behind schedule.";
                  return (
                    <Link key={order.id} href={`/orders/${order.id}`} className="block group">
                      <Card className="flex items-center justify-between border border-rose-200 bg-rose-500/5 p-4 transition-colors group-hover:bg-rose-500/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground underline decoration-[rgba(39,193,165,0.35)] underline-offset-4">{order.orderNumber || order.orderCode || "Order"}</span>
                            <Badge variant="fulfillment" value={order.status}>{orderStatusLabel(order.status)}</Badge>
                          </div>
                          <p className="mt-1 text-sm font-medium text-rose-700">
                            ⚠ {reason}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-rose-600 transition-transform group-hover:translate-x-1">Review &rarr;</span>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
