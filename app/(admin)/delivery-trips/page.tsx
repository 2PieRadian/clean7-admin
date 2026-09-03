"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  User,
  Phone,
  Search,
  Plus,
  X,
  ExternalLink,
  Check,
  CheckCheck,
  RotateCcw,
  Bike,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, TextArea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import type {
  BranchAdminResponse,
  DeliveryTripResponse,
  OrderResponse,
  OperatorProfileResponse,
} from "@/lib/types";
import {
  formatDateTime,
  formatTime,
  formatMoney,
  humanizeToken,
  paymentStatusLabel,
} from "@/lib/format";

type StatusFilter = "" | "CREATED" | "IN_PROGRESS" | "COMPLETED";

export default function DeliveryTripsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  const [trips, setTrips] = useState<DeliveryTripResponse[]>([]);
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [operators, setOperators] = useState<OperatorProfileResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Trip Modal Form State
  const [createBranch, setCreateBranch] = useState("");
  const [createRiderAuthUserId, setCreateRiderAuthUserId] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (branchFilter) query.branchId = branchFilter;

      const [t, b, w, o] = await Promise.all([
        apiRequest<DeliveryTripResponse[]>({
          path: "/admin/delivery-trips",
          query,
        }),
        apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" }),
        apiRequest<OperatorProfileResponse[]>({ path: "/admin/operators" }),
        apiRequest<OrderResponse[]>({ path: "/admin/orders" }),
      ]);
      setTrips(t);
      setBranches(b);
      setOperators(w);
      setOrders(o);

      if (!branchFilter && !isDirector && b[0]?.id) {
        setBranchFilter(b[0].id);
      }
      setCreateBranch((prev) => prev || b[0]?.id || "");
    } catch (nextError) {
      const msg = nextError instanceof Error ? nextError.message : "Unable to load delivery trips.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialData() {
      try {
        const query: Record<string, string> = {};
        if (branchFilter) query.branchId = branchFilter;

        const [t, b, w, o] = await Promise.all([
          apiRequest<DeliveryTripResponse[]>({
            path: "/admin/delivery-trips",
            query,
          }),
          apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" }),
          apiRequest<OperatorProfileResponse[]>({ path: "/admin/operators" }),
          apiRequest<OrderResponse[]>({ path: "/admin/orders" }),
        ]);

        if (!cancelled) {
          setTrips(t);
          setBranches(b);
          setOperators(w);
          setOrders(o);
          if (!branchFilter && !isDirector && b[0]?.id) {
            setBranchFilter(b[0].id);
          }
          setCreateBranch((prev) => prev || b[0]?.id || "");
          setLoading(false);
        }
      } catch (nextError) {
        if (!cancelled) {
          const msg = nextError instanceof Error ? nextError.message : "Unable to load delivery trips.";
          setError(msg);
          toast.error(msg);
          setLoading(false);
        }
      }
    }

    void fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [branchFilter, isDirector]);

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches],
  );

  const riderDisplayByAuthId = useMemo(
    () => Object.fromEntries(operators.map((w) => [w.authUserId, w.displayName])),
    [operators],
  );

  const riderByAuthId = useMemo(
    () => Object.fromEntries(operators.map((w) => [w.authUserId, w])),
    [operators],
  );

  const orderById = useMemo(
    () => Object.fromEntries(orders.map((o) => [o.id, o])),
    [orders],
  );

  // Orders already assigned to active delivery trips (CREATED or IN_PROGRESS)
  const activeTripOrderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const trip of trips) {
      if (trip.status === "CREATED" || trip.status === "IN_PROGRESS") {
        for (const stop of trip.stops ?? []) {
          ids.add(stop.orderId);
        }
      }
    }
    return ids;
  }, [trips]);

  // Orders that are READY_FOR_DELIVERY per branch AND not already assigned to an active trip
  const readyOrdersByBranch = useMemo(() => {
    const map: Record<string, OrderResponse[]> = {};
    for (const o of orders) {
      if (o.status !== "READY_FOR_DELIVERY") continue;
      if (activeTripOrderIds.has(o.id)) continue;
      const list = map[o.branchId] ?? [];
      list.push(o);
      map[o.branchId] = list;
    }
    return map;
  }, [orders, activeTripOrderIds]);

  const readyOrdersForActiveBranch = useMemo(
    () => (branchFilter
      ? (readyOrdersByBranch[branchFilter] ?? [])
      : orders.filter((o) => o.status === "READY_FOR_DELIVERY" && !activeTripOrderIds.has(o.id))),
    [branchFilter, readyOrdersByBranch, orders, activeTripOrderIds],
  );

  // Operational metrics for the top cards
  const stats = useMemo(() => {
    let needsDispatch = 0;
    let inProgress = 0;
    let completed = 0;

    for (const t of trips) {
      if (branchFilter && t.branchId !== branchFilter) continue;
      if (t.status === "CREATED") needsDispatch++;
      else if (t.status === "IN_PROGRESS") inProgress++;
      else if (t.status === "COMPLETED") completed++;
    }

    return {
      needsDispatch,
      inProgress,
      completed,
      readyOrdersCount: readyOrdersForActiveBranch.length,
    };
  }, [trips, branchFilter, readyOrdersForActiveBranch]);

  // Filtered trips for the list
  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trips.filter((t) => {
      if (branchFilter && t.branchId !== branchFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;

      const riderName = (riderDisplayByAuthId[t.riderAuthUserId] ?? "").toLowerCase();
      const tripCode = t.id.slice(-6).toLowerCase();
      const branchName = (branchNameById[t.branchId] ?? "").toLowerCase();

      // Check if any stop's order number matches
      const stopOrderMatch = (t.stops ?? []).some((s) => {
        const o = orderById[s.orderId];
        const num = (o?.orderNumber || o?.orderCode || "").toLowerCase();
        const cust = (o?.contactSnapshot?.fullName || "").toLowerCase();
        return num.includes(q) || cust.includes(q);
      });

      return (
        t.id.toLowerCase().includes(q) ||
        tripCode.includes(q) ||
        riderName.includes(q) ||
        branchName.includes(q) ||
        stopOrderMatch
      );
    });
  }, [trips, branchFilter, statusFilter, searchQuery, riderDisplayByAuthId, branchNameById, orderById]);

  // Helper for starting a trip
  function handleStartTrip(tripId: string) {
    if (!confirm("Hand over the garments to the rider and start this delivery trip? This will update all orders in this trip to 'Out for Delivery'.")) {
      return;
    }
    startTransition(async () => {
      try {
        await apiRequest({
          path: `/admin/delivery-trips/${tripId}/start`,
          method: "POST",
        });
        toast.success("Delivery trip started! Orders are now Out for Delivery.");
        await loadData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start delivery trip.";
        toast.error(msg);
      }
    });
  }

  // Helper for completing a trip
  function handleCompleteTrip(tripId: string) {
    if (!confirm("Complete this delivery trip? Please confirm that all cash collections have been received at the counter.")) {
      return;
    }
    startTransition(async () => {
      try {
        await apiRequest({
          path: `/admin/delivery-trips/${tripId}/complete`,
          method: "POST",
        });
        toast.success("Delivery trip completed and archived.");
        await loadData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to complete delivery trip.";
        toast.error(msg);
      }
    });
  }

  // Helper for deleting a trip
  function handleDeleteTrip(tripId: string, tripCode: string) {
    if (!confirm(`Are you sure you want to delete Trip #${tripCode}? All orders on this trip will return to 'Ready for Delivery' so you can reassign them.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await apiRequest({
          path: `/admin/delivery-trips/${tripId}`,
          method: "DELETE",
        });
        toast.success(`Trip #${tripCode} was deleted.`);
        setSelectedTripId((prev) => (prev === tripId ? "" : prev));
        await loadData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete delivery trip.";
        toast.error(msg);
      }
    });
  }

  // Quick action: Open Create Modal and pre-select all ready orders
  function openCreateModalWithReadyOrders() {
    const targetBranch = branchFilter || branches[0]?.id || "";
    setCreateBranch(targetBranch);
    const available = readyOrdersByBranch[targetBranch] ?? [];
    setSelectedOrderIds(available.map((o) => o.id));
    setCreateRiderAuthUserId("");
    setCreateNote("");
    setFormError(null);
    setShowCreateModal(true);
  }

  // Toggle order in create modal
  function toggleOrderSelection(orderId: string) {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  }

  const effectiveCreateBranch = createBranch || branches[0]?.id || "";
  const ordersAvailableForCreation = readyOrdersByBranch[effectiveCreateBranch] ?? [];
  const availableRidersForBranch = operators.filter(
    (w) => w.role === "RIDER" && (!effectiveCreateBranch || w.branchId === effectiveCreateBranch),
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Delivery trips"
          description="Group cleaned garments into delivery batches, dispatch to riders, and track stops to customer doors."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading || isPending}
            className="gap-1.5"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setCreateBranch(branchFilter || branches[0]?.id || "");
              setSelectedOrderIds([]);
              setCreateRiderAuthUserId("");
              setCreateNote("");
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create a Trip
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-danger/30 bg-danger-surface p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0" />
            <p className="text-sm font-medium text-danger">{error}</p>
          </div>
        </Card>
      ) : null}

      {/* ── High-Priority Action Alert: Orders Waiting for Trip ── */}
      {stats.readyOrdersCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-surface to-primary/5 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                <Package className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary-strong">
                    Action Needed
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    {stats.readyOrdersCount} {stats.readyOrdersCount === 1 ? "Order" : "Orders"} Ready for Delivery
                  </h3>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Laundry processing is finished and items are packaged at the branch counter. Group them into a trip to send them out to customers.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={openCreateModalWithReadyOrders}
              className="flex-shrink-0 gap-2 shadow-md hover:scale-[1.02]"
            >
              <Truck className="h-4 w-4" />
              Batch & Dispatch Orders ({stats.readyOrdersCount})
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── 4 Quick-Filter Metric Cards (What to do next) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ready to Dispatch */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "CREATED" ? "" : "CREATED")}
          className={`text-left rounded-2xl p-4 border transition-all duration-200 ${statusFilter === "CREATED"
              ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-400"
              : "border-[var(--border-soft)] bg-surface hover:bg-surface-muted hover:border-amber-400/50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Needs Dispatch
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.needsDispatch}</span>
            <span className="text-xs text-text-muted">trips created</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary line-clamp-1">
            Hand over garments to rider & start
          </p>
        </button>

        {/* Card 2: Out on Road */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "IN_PROGRESS" ? "" : "IN_PROGRESS")}
          className={`text-left rounded-2xl p-4 border transition-all duration-200 ${statusFilter === "IN_PROGRESS"
              ? "border-sky-500 bg-sky-500/10 shadow-md ring-2 ring-sky-400"
              : "border-[var(--border-soft)] bg-surface hover:bg-surface-muted hover:border-sky-400/50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Out on Road
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Truck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.inProgress}</span>
            <span className="text-xs text-text-muted">active trips</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary line-clamp-1">
            Riders delivering to customer doors
          </p>
        </button>

        {/* Card 3: Completed Trips */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "" : "COMPLETED")}
          className={`text-left rounded-2xl p-4 border transition-all duration-200 ${statusFilter === "COMPLETED"
              ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-400"
              : "border-[var(--border-soft)] bg-surface hover:bg-surface-muted hover:border-emerald-400/50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.completed}</span>
            <span className="text-xs text-text-muted">delivered trips</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary line-clamp-1">
            All stops completed & cash reconciled
          </p>
        </button>

        {/* Card 4: Orders Awaiting Trip */}
        <button
          type="button"
          onClick={openCreateModalWithReadyOrders}
          className="text-left rounded-2xl p-4 border border-[var(--border-soft)] bg-surface hover:bg-surface-muted hover:border-primary/50 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Ready Orders
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Package className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.readyOrdersCount}</span>
            <span className="text-xs text-text-muted">ready to deliver</span>
          </div>
          <p className="mt-1 text-xs text-primary font-medium flex items-center gap-1 group-hover:underline">
            Click to dispatch now →
          </p>
        </button>
      </div>

      {/* ── Search & Filter Controls ── */}
      <Card className="space-y-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted mr-1">
              Filter:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${statusFilter === ""
                  ? "bg-foreground text-background shadow-sm"
                  : "border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted"
                }`}
            >
              All Trips ({trips.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "CREATED" ? "" : "CREATED")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${statusFilter === "CREATED"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Needs Dispatch ({stats.needsDispatch})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "IN_PROGRESS" ? "" : "IN_PROGRESS")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${statusFilter === "IN_PROGRESS"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Out on Road ({stats.inProgress})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "" : "COMPLETED")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${statusFilter === "COMPLETED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-[var(--border-soft)] bg-surface text-text-secondary hover:text-foreground hover:bg-surface-muted"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Completed ({stats.completed})
            </button>
          </div>

          {/* Branch & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {branches.length > 1 && (
              <select
                className="input-surface rounded-xl px-3 py-1.5 text-xs font-medium"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                disabled={!isDirector && branches.length <= 1}
                aria-label="Branch filter"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                className="input-surface w-full rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium"
                placeholder="Search trip, rider, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Trips Table / List ── */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <Truck className="h-8 w-8 animate-bounce text-primary" />
              <p className="text-sm font-medium text-text-secondary">Loading delivery trips…</p>
            </div>
          </Card>
        ) : filteredTrips.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted border border-[var(--border-soft)]">
                <Truck className="h-7 w-7 text-text-muted" />
              </div>
              <h3 className="text-base font-bold text-foreground">No delivery trips found</h3>
              <p className="text-xs text-text-secondary">
                {statusFilter
                  ? `There are currently no trips with status '${humanizeToken(statusFilter)}'.`
                  : "No delivery trips match the active filters or search terms."}
              </p>
              {stats.readyOrdersCount > 0 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={openCreateModalWithReadyOrders}
                  className="gap-1.5 mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Dispatch {stats.readyOrdersCount} Ready Orders
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("");
                    setSearchQuery("");
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTrips.map((trip) => {
              const rider = riderByAuthId[trip.riderAuthUserId];
              const riderName = rider?.displayName || "Unassigned";
              const tripStops = trip.stops ?? [];
              const totalStops = tripStops.length;
              const deliveredCount = tripStops.filter((s) => s.status === "DELIVERED").length;
              const failedCount = tripStops.filter((s) => s.status === "FAILED").length;
              const pendingCount = tripStops.filter((s) => s.status === "PENDING").length;

              // Check if all stops terminal
              const allStopsResolved = totalStops > 0 && pendingCount === 0;

              // COD summary
              let codPendingAmount = 0;
              let hasCod = false;
              for (const stop of tripStops) {
                const o = orderById[stop.orderId];
                if (o?.paymentStatus === "COD_PENDING_COLLECTION") {
                  hasCod = true;
                  codPendingAmount += Number(o.grandTotalAmount ?? 0);
                }
              }

              const isSelected = selectedTripId === trip.id;

              return (
                <div
                  key={trip.id}
                  className={`rounded-2xl border transition-all duration-200 ${isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-[var(--border-soft)] bg-surface hover:border-primary/40 hover:shadow-sm"
                    }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Trip ID, Branch, Rider, Time */}
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground bg-surface-muted px-2 py-0.5 rounded-md border border-[var(--border-soft)]">
                          Trip #{trip.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs font-medium text-text-secondary">
                          {branchNameById[trip.branchId] ?? "Branch"}
                        </span>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs text-text-muted">
                          {formatDateTime(trip.createdAt)}
                        </span>
                      </div>

                      {/* Rider & Next Step */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Bike className="h-4 w-4 text-primary" />
                          <span>{riderName}</span>
                          {rider?.phoneNumber && (
                            <span className="text-xs font-normal text-text-muted">
                              ({rider.phoneNumber})
                            </span>
                          )}
                        </div>

                        {/* Operational Next Action Indicator */}
                        {trip.status === "CREATED" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            Next: Handover garments & start trip
                          </span>
                        )}
                        {trip.status === "IN_PROGRESS" && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${allStopsResolved
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold"
                              : "text-sky-600 dark:text-sky-400 bg-sky-500/10"
                            }`}>
                            {allStopsResolved ? (
                              <>
                                <CheckCheck className="h-3.5 w-3.5" />
                                All stops resolved · Ready to complete trip
                              </>
                            ) : (
                              <>
                                <Truck className="h-3 w-3" />
                                Next: Rider delivering ({deliveredCount}/{totalStops} done)
                              </>
                            )}
                          </span>
                        )}
                        {trip.status === "COMPLETED" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed · All stops resolved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Stops progress & COD */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      {/* Stops Progress */}
                      <div className="space-y-1 min-w-[140px]">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-secondary font-medium">
                            {deliveredCount}/{totalStops} Delivered
                          </span>
                          {failedCount > 0 && (
                            <span className="text-danger font-semibold">{failedCount} Failed</span>
                          )}
                        </div>
                        {/* Mini visual progress bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted border border-[var(--border-soft)] flex">
                          <div
                            className="bg-emerald-500 transition-all"
                            style={{
                              width: totalStops > 0 ? `${(deliveredCount / totalStops) * 100}%` : "0%",
                            }}
                          />
                          <div
                            className="bg-danger transition-all"
                            style={{
                              width: totalStops > 0 ? `${(failedCount / totalStops) * 100}%` : "0%",
                            }}
                          />
                        </div>
                      </div>

                      {/* COD Indicator */}
                      {hasCod ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                          ₹{codPendingAmount} COD
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">Prepaid</span>
                      )}

                      {/* Status Badge */}
                      <Badge value={trip.status} />
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Quick Start Trip button */}
                      {trip.status === "CREATED" && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleStartTrip(trip.id)}
                          className="gap-1.5 shadow-sm"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Start Trip
                        </Button>
                      )}

                      {/* Quick Complete Trip button */}
                      {trip.status === "IN_PROGRESS" && allStopsResolved && (
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleCompleteTrip(trip.id)}
                          className="gap-1.5 shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Complete Trip
                        </Button>
                      )}

                      {/* Toggle Details button */}
                      <Button
                        type="button"
                        variant={isSelected ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setSelectedTripId(isSelected ? "" : trip.id)}
                        className="gap-1"
                      >
                        {isSelected ? "Hide Details" : "View Details"}
                      </Button>

                      {/* Quick Delete Trip button (for non-completed trips) */}
                      {trip.status !== "COMPLETED" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteTrip(trip.id, trip.id.slice(-6).toUpperCase())}
                          title="Delete trip"
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-surface transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Expanded Detail View (Inline Drawer) ── */}
                  {isSelected && (
                    <div className="border-t border-[var(--border-soft)] bg-surface-muted/50 p-5 sm:p-6 space-y-5 rounded-b-2xl animate-in fade-in duration-200">
                      {/* Operational Guidance Hero Banner */}
                      <div className="rounded-2xl border border-[var(--border-soft)] bg-surface p-4 sm:p-5 shadow-sm space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                              Next Step for Branch Admin
                            </span>
                            {trip.status === "CREATED" && (
                              <>
                                <h4 className="text-base font-bold text-foreground mt-0.5">
                                  Hand over garment packages to {riderName} and click Start Trip
                                </h4>
                                <p className="text-xs text-text-secondary mt-1">
                                  Verify all garments are packaged. Clicking Start Trip will mark {totalStops} orders as Out for Delivery and alert the rider to begin drop-offs.
                                </p>
                              </>
                            )}
                            {trip.status === "IN_PROGRESS" && (
                              <>
                                <h4 className="text-base font-bold text-foreground mt-0.5">
                                  {allStopsResolved
                                    ? `All stops resolved! Verify COD cash and complete this trip.`
                                    : `Rider ${riderName} is currently on the road delivering.`}
                                </h4>
                                <p className="text-xs text-text-secondary mt-1">
                                  {allStopsResolved
                                    ? `Total cash collected to verify: ${formatMoney(codPendingAmount)}. Click Complete Trip to archive.`
                                    : `Orders will automatically update as the rider marks each delivery stop complete.`}
                                </p>
                              </>
                            )}
                            {trip.status === "COMPLETED" && (
                              <>
                                <h4 className="text-base font-bold text-foreground mt-0.5">
                                  Delivery trip completed & closed
                                </h4>
                                <p className="text-xs text-text-secondary mt-1">
                                  All stops have reached final state. Completed at {formatDateTime(trip.completedAt)}.
                                </p>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {trip.status === "CREATED" && (
                              <Button
                                type="button"
                                variant="primary"
                                disabled={isPending}
                                onClick={() => handleStartTrip(trip.id)}
                                className="gap-2 shadow-md"
                              >
                                <Truck className="h-4 w-4" />
                                Start Delivery Trip
                              </Button>
                            )}
                            {trip.status === "IN_PROGRESS" && allStopsResolved && (
                              <Button
                                type="button"
                                variant="success"
                                disabled={isPending}
                                onClick={() => handleCompleteTrip(trip.id)}
                                className="gap-2 shadow-md"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Complete Delivery Trip
                              </Button>
                            )}
                            {trip.status !== "COMPLETED" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() => handleDeleteTrip(trip.id, trip.id.slice(-6).toUpperCase())}
                                className="gap-1.5 text-danger hover:bg-danger-surface hover:text-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Trip
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Reconcile Stat Boxes */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-soft)]">
                          <div className="rounded-xl bg-surface-muted p-3 border border-[var(--border-soft)]">
                            <span className="text-[10px] font-semibold uppercase text-text-muted">
                              Total Stops
                            </span>
                            <p className="text-lg font-bold text-foreground">{totalStops}</p>
                          </div>
                          <div className="rounded-xl bg-surface-muted p-3 border border-[var(--border-soft)]">
                            <span className="text-[10px] font-semibold uppercase text-text-muted">
                              Delivered
                            </span>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {deliveredCount}
                            </p>
                          </div>
                          <div className="rounded-xl bg-surface-muted p-3 border border-[var(--border-soft)]">
                            <span className="text-[10px] font-semibold uppercase text-text-muted">
                              Pending / Failed
                            </span>
                            <p className="text-lg font-bold text-foreground">
                              {pendingCount} / {failedCount}
                            </p>
                          </div>
                          <div className="rounded-xl bg-surface-muted p-3 border border-[var(--border-soft)]">
                            <span className="text-[10px] font-semibold uppercase text-text-muted">
                              COD Pending
                            </span>
                            <p className={`text-lg font-bold ${hasCod ? "text-amber-600 dark:text-amber-400" : "text-text-muted"}`}>
                              {hasCod ? formatMoney(codPendingAmount) : "None"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stop-by-Stop List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Delivery Stops in Sequence ({totalStops})
                          </h5>
                          <span className="text-xs text-text-muted">
                            Rider follows this stop sequence
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {tripStops
                            .slice()
                            .sort((a, b) => a.sequence - b.sequence)
                            .map((stop) => {
                              const linkedOrder = orderById[stop.orderId];
                              const customerName = linkedOrder?.contactSnapshot?.fullName || "Customer";
                              const customerPhone = linkedOrder?.contactSnapshot?.phoneNumber;
                              const address = linkedOrder?.serviceAddressSnapshot;
                              const fullAddress = address
                                ? `${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.city} ${address.postalCode}`
                                : "No delivery address on file";
                              const itemCount = linkedOrder?.actualItemCount ?? linkedOrder?.expectedItemCount ?? linkedOrder?.items?.length ?? 0;
                              const isCodPending = linkedOrder?.paymentStatus === "COD_PENDING_COLLECTION";

                              return (
                                <div
                                  key={stop.id}
                                  className="rounded-2xl border border-[var(--border-soft)] bg-surface p-4 transition-all hover:border-primary/40 space-y-3"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {stop.sequence}
                                      </span>
                                      <Link
                                        href={`/orders/${stop.orderId}`}
                                        className="font-mono text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                                        target="_blank"
                                      >
                                        Order #{linkedOrder?.orderNumber || linkedOrder?.orderCode || stop.orderId.slice(-6)}
                                        <ExternalLink className="h-3 w-3 text-text-muted" />
                                      </Link>
                                      <span className="text-xs text-text-muted">·</span>
                                      <span className="text-xs font-medium text-text-secondary">
                                        {linkedOrder?.serviceCategoryName || "Laundry"}
                                      </span>
                                      <span className="text-xs text-text-muted">({itemCount} garments)</span>
                                    </div>

                                    {/* Stop Status Badge */}
                                    <div className="flex items-center gap-2">
                                      {stop.status === "DELIVERED" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-bold">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Delivered {stop.deliveredAt ? formatTime(stop.deliveredAt) : ""}
                                        </span>
                                      ) : stop.status === "FAILED" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 text-danger px-2.5 py-0.5 text-xs font-bold">
                                          <AlertTriangle className="h-3 w-3" />
                                          Delivery Failed
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted text-text-secondary px-2.5 py-0.5 text-xs font-semibold">
                                          <Clock className="h-3 w-3" />
                                          Awaiting drop-off
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Failure details if failed */}
                                  {stop.status === "FAILED" && (
                                    <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-xs text-danger space-y-1">
                                      <p className="font-bold">
                                        Failure Reason: {humanizeToken(stop.failureReason || "Unknown")}
                                      </p>
                                      {stop.failureNote && (
                                        <p className="text-text-secondary">Note: {stop.failureNote}</p>
                                      )}
                                    </div>
                                  )}

                                  {/* Customer & Address Details */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-surface-muted/60 p-3 rounded-xl border border-[var(--border-soft)]">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                        <User className="h-3.5 w-3.5 text-text-muted" />
                                        <span>{customerName}</span>
                                      </div>
                                      {customerPhone && (
                                        <div className="flex items-center gap-1.5 text-text-secondary">
                                          <Phone className="h-3.5 w-3.5 text-text-muted" />
                                          <a
                                            href={`tel:${customerPhone}`}
                                            className="hover:underline hover:text-primary font-medium"
                                          >
                                            {customerPhone}
                                          </a>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-start gap-1.5 text-text-secondary">
                                        <MapPin className="h-3.5 w-3.5 text-text-muted flex-shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{fullAddress}</span>
                                      </div>
                                      {linkedOrder && (
                                        <div className="flex items-center gap-2 pt-0.5">
                                          <span className="font-medium text-foreground">
                                            {formatMoney(linkedOrder.grandTotalAmount)}
                                          </span>
                                          <span className="text-text-muted">·</span>
                                          {isCodPending ? (
                                            <span className="font-bold text-amber-600 dark:text-amber-400">
                                              Collect Cash on Delivery
                                            </span>
                                          ) : (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                              {paymentStatusLabel(linkedOrder.paymentStatus)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create a Delivery Trip Modal ── */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError(null);
        }}
        title="Create a Delivery Trip"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();

            if (!effectiveCreateBranch) {
              setFormError("Please select a branch.");
              return;
            }

            if (!createRiderAuthUserId) {
              setFormError("Please assign a rider for this trip.");
              return;
            }

            if (selectedOrderIds.length === 0) {
              setFormError("Please select at least one order to include in this delivery trip.");
              return;
            }

            const duplicateOrder = selectedOrderIds.find((id) => activeTripOrderIds.has(id));
            if (duplicateOrder) {
              setFormError("One or more selected orders are already assigned to an active delivery trip.");
              return;
            }

            startTransition(async () => {
              setFormError(null);
              try {
                await apiRequest({
                  path: "/admin/delivery-trips",
                  method: "POST",
                  body: {
                    branchId: effectiveCreateBranch,
                    riderAuthUserId: createRiderAuthUserId,
                    orderIds: selectedOrderIds,
                    note: createNote.trim() || undefined,
                  },
                });
                toast.success(`Delivery trip created with ${selectedOrderIds.length} orders!`);
                setShowCreateModal(false);
                setSelectedOrderIds([]);
                setCreateNote("");
                setCreateRiderAuthUserId("");
                await loadData();
              } catch (nextError) {
                const msg = nextError instanceof Error ? nextError.message : "Could not create delivery trip.";
                setFormError(msg);
                toast.error(msg);
              }
            });
          }}
        >
          {/* Branch & Rider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Branch"
              name="branchId"
              value={effectiveCreateBranch}
              onChange={(e) => {
                setCreateBranch(e.target.value);
                setSelectedOrderIds([]); // reset selection when branch changes
              }}
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>

            <Select
              label="Assign Rider"
              name="riderAuthUserId"
              value={createRiderAuthUserId}
              onChange={(e) => setCreateRiderAuthUserId(e.target.value)}
              required
            >
              <option value="">Select a delivery rider</option>
              {availableRidersForBranch.map((w) => (
                <option key={w.authUserId} value={w.authUserId}>
                  {w.displayName} {w.phoneNumber ? `(${w.phoneNumber})` : ""}
                </option>
              ))}
            </Select>
          </div>

          {availableRidersForBranch.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              ⚠️ No riders are currently registered for this branch. Please add staff with role &apos;Rider&apos; in Staff management.
            </p>
          )}

          <TextArea
            label="Trip Notes (Optional)"
            name="note"
            value={createNote}
            onChange={(e) => setCreateNote(e.target.value)}
            placeholder="Special instructions for the rider (e.g. deliver south route first, gate access code)..."
          />

          {/* Orders selection list */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">
                  Select Orders Ready for Delivery
                </p>
                <p className="text-xs text-text-muted">
                  {selectedOrderIds.length} of {ordersAvailableForCreation.length} orders selected
                </p>
              </div>

              {ordersAvailableForCreation.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (selectedOrderIds.length === ordersAvailableForCreation.length) {
                        setSelectedOrderIds([]);
                      } else {
                        setSelectedOrderIds(ordersAvailableForCreation.map((o) => o.id));
                      }
                    }}
                  >
                    {selectedOrderIds.length === ordersAvailableForCreation.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>
              )}
            </div>

            {/* Scrollable list of ready orders */}
            <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-hide rounded-2xl border border-[var(--border-soft)] bg-surface-muted/40 p-3">
              {ordersAvailableForCreation.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Package className="h-8 w-8 mx-auto text-text-muted" />
                  <p className="text-sm font-medium text-text-secondary">
                    No orders are currently &apos;Ready for Delivery&apos; at this branch.
                  </p>
                  <p className="text-xs text-text-muted max-w-xs mx-auto">
                    Orders will appear here once laundry processing is marked complete on the Orders page.
                  </p>
                </div>
              ) : (
                ordersAvailableForCreation.map((order) => {
                  const isChecked = selectedOrderIds.includes(order.id);
                  const customer = order.contactSnapshot?.fullName || "Customer";
                  const phone = order.contactSnapshot?.phoneNumber;
                  const address = order.serviceAddressSnapshot;
                  const addressSnippet = address ? `${address.line1}, ${address.city}` : "Address on file";
                  const itemsCount = order.actualItemCount ?? order.expectedItemCount ?? order.items?.length ?? 0;
                  const isCod = order.paymentStatus === "COD_PENDING_COLLECTION";

                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all flex items-start gap-3 ${isChecked
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-[var(--border-soft)] bg-surface hover:bg-surface-muted"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }} // handled by parent div click
                        className="mt-1 h-4 w-4 rounded accent-primary cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              #{order.orderNumber || order.orderCode || order.id.slice(-6)}
                            </span>
                            <span className="text-xs font-semibold text-text-secondary">
                              · {customer} {phone ? `(${phone})` : ""}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {formatMoney(order.grandTotalAmount)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                          <span className="line-clamp-1">
                            📍 {addressSnippet}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{itemsCount} items</span>
                            <span className="text-text-muted">·</span>
                            {isCod ? (
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                Cash on Delivery
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Prepaid ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {formError ? (
            <p className="text-xs font-semibold text-danger bg-danger-surface p-2.5 rounded-xl border border-danger/30">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-soft)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || ordersAvailableForCreation.length === 0}
              className="gap-2"
            >
              {isPending ? "Creating Trip…" : `Create Trip (${selectedOrderIds.length} Orders)`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
