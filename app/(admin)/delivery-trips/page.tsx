"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Field, Select, TextArea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import type {
  BranchAdminResponse,
  DeliveryTripResponse,
  OrderResponse,
  WorkerProfileResponse,
} from "@/lib/types";
import {
  formatDateTime,
  humanizeToken,
  paymentStatusLabel,
} from "@/lib/format";

export default function DeliveryTripsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";
  const [trips, setTrips] = useState<DeliveryTripResponse[]>([]);
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [workers, setWorkers] = useState<WorkerProfileResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [createBranch, setCreateBranch] = useState("");

  async function loadTrips() {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (branchFilter) query.branchId = branchFilter;
      if (statusFilter) query.status = statusFilter;

      const [t, b, w, o] = await Promise.all([
        apiRequest<DeliveryTripResponse[]>({
          path: "/admin/delivery-trips",
          query,
        }),
        apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" }),
        apiRequest<WorkerProfileResponse[]>({ path: "/admin/workers" }),
        apiRequest<OrderResponse[]>({ path: "/admin/orders" }),
      ]);
      setTrips(t);
      setBranches(b);
      setWorkers(w);
      setOrders(o);
      if (!branchFilter && !isDirector && b[0]?.id) {
        setBranchFilter(b[0].id);
      }
      setCreateBranch((prev) => prev || b[0]?.id || "");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load trips.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when filters change
  }, [branchFilter, statusFilter]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  const branchNameById = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b.name])),
    [branches],
  );

  const riderDisplayByAuthId = useMemo(
    () => Object.fromEntries(workers.map((w) => [w.authUserId, w.displayName])),
    [workers],
  );

  const orderById = useMemo(
    () => Object.fromEntries(orders.map((o) => [o.id, o])),
    [orders],
  );

  const readyOrdersByBranch = useMemo(() => {
    const map: Record<string, OrderResponse[]> = {};
    for (const o of orders) {
      if (o.status !== "READY_FOR_DELIVERY") continue;
      const list = map[o.branchId] ?? [];
      list.push(o);
      map[o.branchId] = list;
    }
    return map;
  }, [orders]);

  const createBranchId = createBranch || branches[0]?.id || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Delivery trips"
          description="List trips, filter by branch and status, and batch orders that are ready for delivery."
        />
        <Button
          type="button"
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create a Trip
        </Button>
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <select
            className="input-surface rounded-full px-4 py-2 text-sm"
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
          <input
            className="input-surface rounded-full px-4 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Trip status (e.g. CREATED)"
          />
        </div>

        <DataTable
          rows={trips}
          loading={loading}
          emptyMessage="No trips match filters."
          columns={[
            {
              key: "id",
              header: "Trip",
              render: (row) => (
                <button
                  type="button"
                  className="text-left font-mono text-xs text-primary underline"
                  onClick={() => setSelectedTripId(row.id)}
                >
                  {row.id}
                </button>
              ),
            },
            {
              key: "branch",
              header: "Branch",
              render: (row) => (
                <span className="text-sm text-foreground">
                  {branchNameById[row.branchId] ?? row.branchId}
                </span>
              ),
            },
            {
              key: "rider",
              header: "Rider",
              render: (row) => (
                <span
                  className="text-sm text-foreground"
                  title={row.riderAuthUserId}
                >
                  {riderDisplayByAuthId[row.riderAuthUserId] ??
                    row.riderAuthUserId}
                </span>
              ),
            },
            {
              key: "stops",
              header: "Stops",
              render: (row) => row.stops?.length ?? 0,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <Badge value={row.status} />,
            },
            {
              key: "created",
              header: "Created",
              render: (row) => formatDateTime(row.createdAt),
            },
          ]}
        />
      </Card>

      {selectedTrip ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Trip detail
            </h2>
            <div className="flex gap-2">
              {selectedTrip.status === "CREATED" && (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (
                      !confirm(
                        "Start this delivery trip? Riders will be able to complete stops.",
                      )
                    )
                      return;
                    startTransition(async () => {
                      try {
                        await apiRequest({
                          path: `/admin/delivery-trips/${selectedTrip.id}/start`,
                          method: "POST",
                        });
                        await loadTrips();
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Failed to start trip.",
                        );
                      }
                    });
                  }}
                >
                  Start Trip
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedTripId("")}
              >
                Close
              </Button>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Branch{" "}
            {branchNameById[selectedTrip.branchId] ?? selectedTrip.branchId} ·
            Rider{" "}
            {riderDisplayByAuthId[selectedTrip.riderAuthUserId] ??
              selectedTrip.riderAuthUserId}{" "}
            · {humanizeToken(selectedTrip.status)}
          </p>
          <p className="text-xs text-text-muted">
            {selectedTrip.stops?.filter(
              (s) =>
                orderById[s.orderId]?.paymentStatus ===
                "COD_PENDING_COLLECTION",
            ).length ?? 0}{" "}
            stop(s) with COD pending collection (from cached orders list).
          </p>
          <div className="space-y-3">
            {(selectedTrip.stops ?? [])
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((stop) => {
                const linkedOrder = orderById[stop.orderId];
                return (
                  <div
                    key={stop.id}
                    className="rounded-[24px] border border-[var(--border-soft)] bg-surface-muted p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      Stop {stop.sequence}{" "}
                      <Link
                        href={`/orders/${stop.orderId}`}
                        className="text-primary underline"
                      >
                        Order{" "}
                        {linkedOrder?.orderNumber ??
                          linkedOrder?.orderCode ??
                          stop.orderId}
                      </Link>
                    </p>
                    <p className="text-xs text-text-secondary">
                      Delivery stop status: {stop.status}
                    </p>
                    {linkedOrder ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        Payment: {paymentStatusLabel(linkedOrder.paymentStatus)}
                      </p>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </Card>
      ) : null}

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError(null);
        }}
        title="Create a Trip"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const branchId = String(formData.get("branchId") ?? "");
            const riderAuthUserId = String(
              formData.get("riderAuthUserId") ?? "",
            );
            const note = String(formData.get("note") ?? "");
            const orderIds = formData.getAll("orderIds").map(String);

            if (!orderIds.length) {
              setFormError("Select at least one order.");
              return;
            }

            startTransition(async () => {
              setFormError(null);
              try {
                await apiRequest({
                  path: "/admin/delivery-trips",
                  method: "POST",
                  body: {
                    branchId,
                    riderAuthUserId,
                    orderIds,
                    note,
                  },
                });
                form.reset();
                setShowCreateModal(false);
                await loadTrips();
              } catch (nextError) {
                setFormError(
                  nextError instanceof Error
                    ? nextError.message
                    : "Could not create trip.",
                );
              }
            });
          }}
        >
          <Select
            label="Branch"
            name="branchId"
            value={createBranchId}
            onChange={(e) => setCreateBranch(e.target.value)}
            required
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select label="Rider" name="riderAuthUserId" required>
            <option value="">Select rider</option>
            {workers
              .filter(
                (w) =>
                  w.role === "RIDER" &&
                  (!createBranchId || w.branchId === createBranchId),
              )
              .map((w) => (
                <option key={w.authUserId} value={w.authUserId}>
                  {w.displayName}
                </option>
              ))}
          </Select>
          <TextArea label="Note" name="note" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Orders ready for delivery
            </p>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-[16px] border border-[var(--border-soft)] bg-surface-muted p-4">
              {(readyOrdersByBranch[createBranchId] ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No READY_FOR_DELIVERY orders.
                </p>
              ) : (
                (readyOrdersByBranch[createBranchId] ?? []).map((o) => (
                  <label key={o.id} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="orderIds" value={o.id} />
                    <span>
                      {o.orderNumber || o.orderCode} · {o.customerAuthUserId}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          {formError ? (
            <p className="text-sm text-danger">{formError}</p>
          ) : null}
          <div className="flex justify-end gap-3">
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create trip"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
