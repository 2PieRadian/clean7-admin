"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/browser-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field, Select, TextArea } from "@/components/ui/field";
import {
  formatDateTime,
  formatMoney,
  formatTime,
  deliveryPromiseInfo,
  humanizeBlocker,
  humanizeToken,
  orderStatusLabel,
  paymentStatusLabel,
  scheduledSlotLabel,
  orderNextActionPhrase,
  getCurrentResponsibility,
} from "@/lib/format";
import type {
  OrderLineItemResponse,
  OrderResponse,
  OperatorProfileResponse,
  DeliveryTripResponse,
} from "@/lib/types";
import {
  orderStatuses,
  paymentMethods,
  paymentStatuses,
  slotCodes,
} from "@/lib/constants";
import {
  Users,
  Truck,
  Package,
  Clock,
  CreditCard,
  Activity,
  X,
  Camera,
  Download,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { downloadOrderInvoice } from "../api/order-api";

function getOperatorDisplay(
  authUserId: string | null | undefined,
  operators: OperatorProfileResponse[],
) {
  if (!authUserId) return "—";
  const operator = operators.find((w) => w.authUserId === authUserId);
  if (!operator) return "Unknown";
  return operator.phoneNumber
    ? `${operator.displayName} · ${operator.phoneNumber}`
    : operator.displayName;
}

function orderLabel(order: OrderResponse) {
  return order.orderNumber || order.orderCode || "Order";
}

function groupItemsByService(items: OrderLineItemResponse[]) {
  const map = new Map<string, OrderLineItemResponse[]>();
  for (const item of items) {
    const key = item.serviceName || item.serviceCode || "Items";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  for (const rows of map.values()) {
    rows.sort((a, b) =>
      String(a.itemName || a.itemCode || "").localeCompare(
        String(b.itemName || b.itemCode || ""),
        undefined,
        { sensitivity: "base" },
      ),
    );
  }
  return map;
}

function sameBranchStaff(
  operators: OperatorProfileResponse[],
  order: OrderResponse,
  role: "OPERATOR" | "RIDER",
) {
  const filtered = operators.filter(
    (w) =>
      w.role === role &&
      w.branchId != null &&
      w.branchId === order.branchId &&
      w.status === "ACTIVE",
  );
  if (role === "RIDER") {
    filtered.sort((a, b) => {
      const aHas = a.serviceCategoryCodes?.includes("LAUNDRY") ? 1 : 0;
      const bHas = b.serviceCategoryCodes?.includes("LAUNDRY") ? 1 : 0;
      return bHas - aHas;
    });
  }
  return filtered;
}

const STATUS_TIMELINE_ORDER: string[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "RECEIVED_AT_BRANCH",
  "PROCESSING",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
];

function parseMoneyAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide bg-surface border border-[var(--border-soft)] rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-soft)] bg-surface/95 backdrop-blur px-6 py-5">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full hover:bg-surface-muted transition-colors text-text-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function OrderDetailManager({
  order,
  operators,
}: {
  order: OrderResponse;
  operators: OperatorProfileResponse[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [modals, setModals] = useState({
    operator: false,
    pickupRider: false,
    delivery: false,
    intake: false,
    status: false,
    payment: false,
    reschedule: false,
  });

  const closeModal = (key: keyof typeof modals) =>
    setModals((m) => ({ ...m, [key]: false }));
  const openModal = (key: keyof typeof modals) =>
    setModals((m) => ({ ...m, [key]: true }));

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const { data: deliveryTrips } = useQuery<DeliveryTripResponse[]>({
    queryKey: ["delivery-trips"],
    queryFn: () => apiRequest({ path: "/admin/delivery-trips" }),
  });

  const deliveryTrip = deliveryTrips?.find((trip) =>
    trip.stops.some((stop) => stop.orderId === order.id),
  );
  const deliveryRiderAuthUserId = deliveryTrip?.riderAuthUserId;

  const itemsByService = useMemo(
    () => groupItemsByService(order.items),
    [order.items],
  );
  const grandTotal = order.grandTotalAmount;
  const subtotal = order.subtotalAmount;
  const addOnTotal = order.addOnTotalAmount;
  const discountAmount = order.discountAmount;
  const numSub = parseFloat(subtotal || "0");
  const numAdd = parseFloat(addOnTotal || "0");
  const numDisc = parseFloat(discountAmount || "0");
  const numGrand = parseFloat(grandTotal || "0");
  const baseTaxable = Math.max(0, numSub + numAdd - numDisc);
  const taxAmount = order.taxAmount ?? (numGrand > baseTaxable ? (numGrand - baseTaxable).toFixed(2) : "0");
  const blockers = order.fulfillment?.blockers ?? [];
  const serviceMode = order.serviceMode ?? "PICKUP_DELIVERY";

  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  async function handleDownloadInvoice() {
    setIsDownloadingInvoice(true);
    try {
      await downloadOrderInvoice(order.id, order.orderNumber || order.orderCode || "Order");
    } catch (err: any) {
      setError(err?.message || "Failed to download invoice.");
    } finally {
      setIsDownloadingInvoice(false);
    }
  }

  async function mutate(
    path: string,
    method: "POST" | "PATCH",
    payload?: unknown,
    successMsg = "Order updated successfully.",
  ) {
    setMessage(null);
    setError(null);
    try {
      await apiRequest({ path, method, body: payload });
      setMessage(successMsg);
      setConfirmAction(null);
      // Close all modals on success
      setModals({
        operator: false,
        pickupRider: false,
        delivery: false,
        intake: false,
        status: false,
        payment: false,
        reschedule: false,
      });
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not save the order.",
      );
    }
  }

  const handleActionClick = (
    title: string,
    description: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, description, onConfirm });
  };

  const statusIndex = STATUS_TIMELINE_ORDER.indexOf(order.status);
  const isTerminal =
    order.status === "COMPLETED" ||
    order.status === "DELIVERED" ||
    order.status === "CANCELLED";

  return (
    <div className="space-y-6">
      {/* ── Success/Error Toasts ── */}
      {message && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm font-medium text-primary flex items-center justify-between">
          <span>✓ {message}</span>
          <button
            onClick={() => setMessage(null)}
            type="button"
            className="text-primary hover:text-primary-strong"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm font-medium text-danger flex items-center justify-between">
          <span>⚠ {error}</span>
          <button
            onClick={() => setError(null)}
            type="button"
            className="text-danger hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Guidance & Header ── */}
      <Card className="rounded-[24px] overflow-hidden !p-0 border border-[var(--border-soft)] shadow-sm">
        {/* Next Step & Responsibility */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-primary/10 p-6 border-b border-[var(--border-soft)]">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Next Step
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {orderNextActionPhrase(order)}
            </p>
          </div>
          <div className="md:border-l border-primary/20 md:pl-6">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/70">
              Current Responsibility
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {getCurrentResponsibility(order)}
            </p>
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pt-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                {order.serviceCategoryName ?? order.serviceCategoryCode}
                {order.serviceName ? (
                  <span className="text-text-muted text-xl font-normal">
                    · {order.serviceName}
                  </span>
                ) : (
                  ""
                )}
              </h2>
              <p className="text-sm font-medium text-text-secondary mt-1">
                {order.orderNumber || order.orderCode || "Order"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{orderStatusLabel(order.status)}</Badge>
              <Badge>{paymentStatusLabel(order.paymentStatus)}</Badge>
              <Badge variant="fulfillment" value={serviceMode} />
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={handleDownloadInvoice}
                disabled={isDownloadingInvoice}
              >
                <Download className="h-3.5 w-3.5 text-primary" />
                {isDownloadingInvoice ? "Downloading..." : "PDF Invoice"}
              </Button>
            </div>
          </div>

          {/* Operational Timeline */}
          <div className="py-4 overflow-x-auto thin-scrollbar">
            <div className="flex items-center min-w-[600px] px-2">
              {STATUS_TIMELINE_ORDER.map((code, idx) => {
                const done =
                  statusIndex > idx &&
                  !isTerminal &&
                  order.status !== "CANCELLED";
                const current = order.status === code;

                if (order.status === "CANCELLED" && code === "CANCELLED") {
                  return (
                    <div
                      key={code}
                      className="flex flex-col items-center flex-1 relative"
                    >
                      <div className="h-5 w-5 rounded-full bg-danger z-10 flex items-center justify-center text-[12px] font-bold text-white shadow-md">
                        ×
                      </div>
                      <p className="text-[11px] font-bold text-danger mt-2 text-center">
                        Cancelled
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={code}
                    className="flex flex-col items-center flex-1 relative group"
                  >
                    {/* Connecting Line */}
                    {idx !== 0 && (
                      <div
                        className={`absolute top-2.5 left-[-50%] w-full h-[3px] -z-10 rounded-full transition-colors ${done || current ? "bg-primary shadow-[0_0_8px_rgba(39,193,165,0.5)]" : "bg-surface-muted border-t border-b border-[var(--border-soft)]"}`}
                      />
                    )}
                    {/* Node */}
                    <div
                      className={`h-6 w-6 rounded-full border-2 z-10 flex items-center justify-center transition-all duration-300 ${current ? "border-primary bg-primary ring-4 ring-primary/30 shadow-[0_0_12px_rgba(39,193,165,0.6)] scale-110" : done ? "border-primary bg-primary" : "bg-surface border-[var(--border-soft)]"}`}
                    >
                      {(done || current) && (
                        <span className="text-[12px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] mt-2 text-center transition-colors max-w-[80px] leading-tight ${current ? "font-bold text-primary" : done ? "font-medium text-foreground" : "text-text-muted"}`}
                    >
                      {orderStatusLabel(code)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Info row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl bg-surface-muted px-5 py-4 text-sm border border-[var(--border-soft)]">
            <div>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">
                Scheduled
              </p>
              <p className="font-medium text-foreground">
                {formatDateTime(order.scheduledDate)}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {scheduledSlotLabel(order.scheduledSlotCode)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">
                Customer
              </p>
              <p className="font-medium text-foreground">
                {order.contactSnapshot?.fullName ?? "—"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {order.contactSnapshot?.phoneNumber ?? ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">
                Payment
              </p>
              <p className="font-medium text-foreground">
                {formatMoney(grandTotal, order.currency)}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {humanizeToken(order.paymentMethod)} ·{" "}
                {paymentStatusLabel(order.paymentStatus)}
              </p>
            </div>
            {order.serviceAddressSnapshot ? (
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1">
                  Address
                </p>
                <p
                  className="font-medium text-foreground truncate"
                  title={order.serviceAddressSnapshot.line1}
                >
                  {order.serviceAddressSnapshot.line1}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {order.serviceAddressSnapshot.city},{" "}
                  {order.serviceAddressSnapshot.state}
                </p>
              </div>
            ) : null}
          </div>

          {/* Primary Action Flow */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {order.status === "PENDING" && (
              <Button
                onClick={() =>
                  handleActionClick(
                    "Confirm Order",
                    "This will notify the customer that their order is confirmed.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "CONFIRMED" },
                          "Order confirmed successfully.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Confirm Order
              </Button>
            )}

            {order.status === "IN_PROGRESS" && order.pickupRiderAuthUserId && (
              <Button
                onClick={() =>
                  handleActionClick(
                    "Mark Received at Branch",
                    "The pickup leg is complete and items are at the branch.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "RECEIVED_AT_BRANCH" },
                          "Marked received at branch.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Mark Received at Branch
              </Button>
            )}

            {order.status === "RECEIVED_AT_BRANCH" &&
              order.actualItemCount != null && (
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Start Processing",
                      "Move this order into active processing.",
                      () =>
                        startTransition(() =>
                          mutate(
                            `/admin/orders/${order.id}/status`,
                            "PATCH",
                            { status: "PROCESSING" },
                            "Order processing started.",
                          ),
                        ),
                    )
                  }
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  Start Processing
                </Button>
              )}

            {order.status === "PROCESSING" && (
              <Button
                onClick={() =>
                  handleActionClick(
                    "Mark Ready for Delivery",
                    "This will make the order available for delivery assignment. Ensure all processing is complete.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "READY_FOR_DELIVERY" },
                          "Marked ready for delivery.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Mark Ready for Delivery
              </Button>
            )}

            {order.status === "OUT_FOR_DELIVERY" && (
              <Button
                onClick={() =>
                  handleActionClick(
                    "Complete Delivery",
                    "Confirm that the order has been successfully delivered.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "DELIVERED" },
                          "Delivery completed.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Complete Delivery
              </Button>
            )}
          </div>

          {/* Quick Management Buttons replacing 'More Options' */}
          <div className="pt-4 border-t border-[var(--border-soft)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
              Order Management Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Assign Operator */}
              {serviceMode === "AT_HOME" && (
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                  onClick={() => openModal("operator")}
                >
                  <Users
                    size={16}
                    className={
                      order.assignedOperatorAuthUserId
                        ? "text-primary"
                        : "text-amber-500"
                    }
                  />
                  <span className="truncate">
                    {order.assignedOperatorAuthUserId
                      ? "Reassign Operator"
                      : "Assign Operator"}
                  </span>
                </Button>
              )}

              {/* Assign Pickup Rider */}
              {serviceMode === "PICKUP_DELIVERY" && !isTerminal && (
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                  onClick={() => openModal("pickupRider")}
                >
                  <Truck
                    size={16}
                    className={
                      order.pickupRiderAuthUserId
                        ? "text-primary"
                        : "text-amber-500"
                    }
                  />
                  <span className="truncate">
                    {order.pickupRiderAuthUserId
                      ? "Reassign Pickup Rider"
                      : "Assign Pickup Rider"}
                  </span>
                </Button>
              )}

              {/* Assign Delivery Rider */}
              {order.status === "READY_FOR_DELIVERY" &&
                serviceMode === "PICKUP_DELIVERY" && (
                  <Button
                    variant="secondary"
                    className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                    onClick={() => openModal("delivery")}
                  >
                    <Truck
                      size={16}
                      className={
                        deliveryRiderAuthUserId
                          ? "text-primary"
                          : "text-amber-500"
                      }
                    />
                    <span className="truncate">
                      {deliveryRiderAuthUserId
                        ? "Delivery Assigned"
                        : "Assign Delivery"}
                    </span>
                  </Button>
                )}

              {/* Laundry Intake */}
              {serviceMode === "PICKUP_DELIVERY" && !isTerminal && (
                <Button
                  variant="secondary"
                  className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                  onClick={() => openModal("intake")}
                >
                  <Package
                    size={16}
                    className={
                      order.actualItemCount != null
                        ? "text-primary"
                        : "text-text-secondary"
                    }
                  />
                  <span className="truncate">Laundry Intake</span>
                </Button>
              )}

              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2 w-full shadow-sm"
                onClick={() => openModal("status")}
              >
                <Activity size={16} className="text-text-secondary" />{" "}
                <span className="truncate">Update Order Status</span>
              </Button>

              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2 w-full shadow-sm"
                onClick={() => openModal("payment")}
              >
                <CreditCard size={16} className="text-text-secondary" />{" "}
                <span className="truncate">Update Payment</span>
              </Button>

              <Button
                variant="secondary"
                className="flex items-center justify-center gap-2 w-full shadow-sm"
                onClick={() => openModal("reschedule")}
              >
                <Clock size={16} className="text-text-secondary" />{" "}
                <span className="truncate">Reschedule</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Assignments & Items ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {order.bookingType === "ASAP" && (
            <Card className="space-y-3 bg-amber-500/5 border-amber-400/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <Zap size={18} className="text-amber-600" /> Express Delivery Target
                </h3>
                {(() => {
                  const promise = deliveryPromiseInfo(order);
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${promise.badgeClass}`}>
                      {promise.isOverdue && <AlertTriangle className="h-3 w-3" />}
                      {!promise.isOverdue && <CheckCircle2 className="h-3 w-3" />}
                      {promise.statusLabel}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-text-secondary">
                Customer ordered with ASAP express delivery. Target fulfillment window is shown below.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-amber-300/30">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/70 dark:text-amber-300/70">
                    Dispatched / Started
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {order.slaStartedAt ? formatTime(order.slaStartedAt) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/70 dark:text-amber-300/70">
                    Target Arrival Window
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {order.promisedArrivalTo ? formatTime(order.promisedArrivalTo) : "—"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users size={18} className="text-text-secondary" /> Assignments
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ...(serviceMode === "AT_HOME"
                  ? [
                    {
                      label: "Operator",
                      value: getOperatorDisplay(
                        order.assignedOperatorAuthUserId,
                        operators,
                      ),
                      warn:
                        !order.assignedOperatorAuthUserId &&
                        serviceMode === "AT_HOME",
                    },
                  ]
                  : []),
                ...(serviceMode === "PICKUP_DELIVERY"
                  ? [
                    {
                      label: "Pickup Rider",
                      value: getOperatorDisplay(
                        order.pickupRiderAuthUserId,
                        operators,
                      ),
                      warn:
                        !order.pickupRiderAuthUserId &&
                        (order.status === "CONFIRMED" ||
                          order.status === "IN_PROGRESS"),
                    },
                    {
                      label: "Delivery Rider",
                      value: getOperatorDisplay(
                        deliveryRiderAuthUserId,
                        operators,
                      ),
                      warn:
                        !deliveryRiderAuthUserId &&
                        order.status === "READY_FOR_DELIVERY",
                    },
                  ]
                  : []),
              ].map(({ label, value, warn }) => (
                <div
                  key={label}
                  className={`rounded-xl p-3 border ${warn ? "bg-amber-500/10 border-amber-400/30" : "bg-surface-muted border-[var(--border-soft)]"}`}
                >
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {label}
                  </p>
                  <p
                    className={`mt-1.5 text-sm font-medium ${warn ? "text-amber-700" : "text-foreground"}`}
                  >
                    {value}
                    {warn ? " ⚠" : ""}
                  </p>
                </div>
              ))}
            </div>
            {blockers.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {blockers.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 border border-rose-400/30 shadow-sm"
                  >
                    ⚠ {humanizeBlocker(b)}
                  </span>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity size={18} className="text-text-secondary" /> Recent
              Activity
            </h3>
            {order.statusEvents?.length ||
              order.paymentStatusHistory?.length ||
              order.auditEvents?.length ? (
              <div className="relative border-l-2 border-[var(--border-soft)] ml-2 pl-5 py-2 space-y-6">
                {[
                  ...(order.statusEvents ?? []),
                  ...(order.paymentStatusHistory ?? []),
                  ...(order.auditEvents ?? []),
                ]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .slice(0, 10)
                  .map((event, index) => (
                    <div key={event.id} className="relative">
                      <div
                        className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-surface ${index === 0 ? "bg-primary shadow-[0_0_8px_rgba(39,193,165,0.5)]" : "bg-[var(--border-strong)]"}`}
                      />
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <p className="text-sm font-semibold text-foreground">
                          {"toStatus" in event
                            ? orderStatusLabel(event.toStatus)
                            : humanizeToken(event.action)}
                        </p>
                        <p className="text-[11px] font-medium text-text-muted bg-surface-muted px-2 py-0.5 rounded-full">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                      {"note" in event && event.note ? (
                        <p className="mt-2 text-xs text-text-secondary bg-surface-muted px-3 py-2 rounded-lg border border-[var(--border-soft)] inline-block">
                          {event.note}
                        </p>
                      ) : null}
                      {"reason" in event && event.reason ? (
                        <p className="mt-2 text-xs text-text-secondary bg-surface-muted px-3 py-2 rounded-lg border border-[var(--border-soft)] inline-block">
                          {event.reason}
                        </p>
                      ) : null}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary p-4 bg-surface-muted rounded-xl border border-[var(--border-soft)] text-center">
                No activity recorded yet.
              </p>
            )}
          </Card>
        </div>

        <div>
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package size={18} className="text-text-secondary" /> Line Items
              </h3>
              <div className="text-right text-sm">
                <span className="font-bold text-lg text-foreground">
                  {formatMoney(grandTotal, order.currency)}
                </span>
                {subtotal !== grandTotal && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Subtotal {formatMoney(subtotal, order.currency)} + add-ons{" "}
                    {formatMoney(addOnTotal, order.currency)}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {[...itemsByService.entries()].map(([serviceName, rows]) => (
                <div
                  key={serviceName}
                  className="rounded-xl bg-surface-muted p-4 border border-[var(--border-soft)]"
                >
                  <p className="text-sm font-bold text-foreground mb-3">
                    {serviceName}
                  </p>
                  <ul className="space-y-2.5 text-sm text-text-secondary">
                    {rows.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between gap-3 items-center"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-surface border border-[var(--border-soft)] text-foreground font-medium text-xs px-2 py-0.5 rounded-md">
                            x{item.quantity}
                          </span>
                          <span className="font-medium text-foreground">
                            {item.itemName || item.itemCode || "Item"}
                          </span>
                        </div>
                        <span className="font-bold text-foreground">
                          {formatMoney(item.lineTotal, order.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {itemsByService.size === 0 && (
                <p className="text-sm text-text-secondary p-4 text-center">
                  No items found.
                </p>
              )}
            </div>

            {/* Financial & GST Breakdown */}
            <div className="pt-3 border-t border-[var(--border-soft)] space-y-2 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal (Base Items)</span>
                <span>{formatMoney(subtotal, order.currency)}</span>
              </div>
              {parseFloat(addOnTotal || "0") > 0 && (
                <div className="flex justify-between text-text-secondary">
                  <span>Add-ons</span>
                  <span>+{formatMoney(addOnTotal, order.currency)}</span>
                </div>
              )}
              {parseFloat(discountAmount || "0") > 0 && (
                <div className="flex justify-between text-primary font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatMoney(discountAmount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <span>GST (18%)</span>
                <span>+{formatMoney(taxAmount, order.currency)}</span>
              </div>
              <div className="flex justify-between text-foreground font-bold pt-2 border-t border-[var(--border-soft)] text-base">
                <span>Total Amount</span>
                <span>{formatMoney(grandTotal, order.currency)}</span>
              </div>
            </div>
          </Card>

          {/* ── Photo Proofs / Pickup Photos Card ── */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Camera size={18} className="text-text-secondary" /> Photo Proofs
              </h3>
              {order.proofArtifacts && order.proofArtifacts.length > 0 ? (
                <Badge tone="muted" className="text-xs">
                  {order.proofArtifacts.length} photo{order.proofArtifacts.length > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>

            {order.proofArtifacts && order.proofArtifacts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {order.proofArtifacts.map((proof) => {
                  const imgUrl = proof.assetUrl || `/api/assets/${proof.storageKey}`;
                  return (
                    <div
                      key={proof.id}
                      className="group relative rounded-xl border border-[var(--border-soft)] bg-surface-muted overflow-hidden cursor-pointer aspect-square hover:border-primary/50 transition-all shadow-sm"
                      onClick={() => setSelectedProofUrl(imgUrl)}
                    >
                      <img
                        src={imgUrl}
                        alt={proof.type}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                        <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                          {proof.type === "BEFORE"
                            ? "Pickup Proof"
                            : proof.type === "AFTER"
                              ? "Completion Proof"
                              : proof.type}
                        </span>
                        <span className="text-[10px] text-white/80">
                          {formatDateTime(proof.createdAt || proof.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-secondary p-4 bg-surface-muted rounded-xl border border-[var(--border-soft)] text-center">
                No photo proofs uploaded for this order yet.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* ── Photo Proof Fullscreen Zoom Lightbox ── */}
      {selectedProofUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedProofUrl(null)}
        >
          <div
            role="dialog"
            className="relative max-w-4xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden scrollbar-hide shadow-2xl p-2 border border-[var(--border-soft)] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProofUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-md"
              title="Close image preview"
            >
              <X size={20} />
            </button>
            <img
              src={selectedProofUrl}
              alt="Photo proof enlarged"
              className="max-h-[82vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* ── Safe Confirmation Modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            role="alertdialog"
            className="w-full max-w-sm bg-surface border border-[var(--border-soft)] rounded-[24px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 scrollbar-hide"
          >
            <h2 className="text-lg font-bold text-foreground">
              {confirmAction.title}?
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {confirmAction.description}
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-soft)] mt-4">
              <Button
                variant="ghost"
                onClick={() => setConfirmAction(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={confirmAction.onConfirm} disabled={isPending}>
                Yes, proceed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Individual Modals ── */}

      <Modal
        isOpen={modals.operator}
        onClose={() => closeModal("operator")}
        title="Assign Operator"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() =>
              mutate(
                `/admin/orders/${order.id}/assignment`,
                "PATCH",
                {
                  assignedOperatorAuthUserId: formData.get(
                    "assignedOperatorAuthUserId",
                  ),
                  note: formData.get("note"),
                  forceOverride: formData.get("forceOverride") === "on",
                  overrideReason: formData.get("overrideReason"),
                },
                "Operator assigned successfully.",
              ),
            );
          }}
        >
          <div className="space-y-4">
            <Select
              label="Assign operator (at home)"
              name="assignedOperatorAuthUserId"
              defaultValue={order.assignedOperatorAuthUserId ?? ""}
            >
              <option value="">Select operator</option>
              {sameBranchStaff(operators, order, "OPERATOR").map((operator) => (
                <option key={operator.authUserId} value={operator.authUserId}>
                  {operator.displayName}
                </option>
              ))}
            </Select>
            <TextArea label="Note for your team" name="note" />
            <label className="flex items-center gap-2 text-sm text-text-secondary bg-surface-muted p-3 rounded-xl border border-[var(--border-soft)] cursor-pointer">
              <input
                type="checkbox"
                name="forceOverride"
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              Save anyway even if there is a warning
            </label>
            <Field label="Override Reason" name="overrideReason" />
          </div>
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => closeModal("operator")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modals.pickupRider}
        onClose={() => closeModal("pickupRider")}
        title="Assign Pickup Rider"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() =>
              mutate(
                `/admin/orders/${order.id}/pickup-rider`,
                "POST",
                {
                  riderAuthUserId: String(formData.get("riderAuthUserId")),
                },
                "Pickup rider assigned successfully.",
              ),
            );
          }}
        >
          <Select
            label="Select Pickup Rider"
            name="riderAuthUserId"
            defaultValue={order.pickupRiderAuthUserId ?? ""}
            required
          >
            <option value="">Select rider...</option>
            {sameBranchStaff(operators, order, "RIDER").map((operator) => (
              <option key={operator.authUserId} value={operator.authUserId}>
                {operator.displayName}
              </option>
            ))}
          </Select>
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => closeModal("pickupRider")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Assign Rider
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modals.delivery}
        onClose={() => closeModal("delivery")}
        title="Assign Delivery Rider"
      >
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck size={32} className="text-primary" />
          </div>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            Delivery assignment is managed centrally via the{" "}
            <strong>Delivery Trips</strong> dashboard to optimize routes and
            scheduling.
          </p>
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-center gap-3">
            <Button variant="ghost" onClick={() => closeModal("delivery")}>
              Cancel
            </Button>
            <Button
              onClick={() => (window.location.href = "/admin/delivery-trips")}
            >
              Go to Delivery Trips
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modals.intake}
        onClose={() => closeModal("intake")}
        title="Laundry Intake"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() =>
              mutate(
                `/admin/orders/${order.id}/laundry-intake`,
                "POST",
                {
                  orderCode: orderLabel(order),
                  actualItemCount: Number(formData.get("actualItemCount")),
                  continueWithMismatch:
                    formData.get("continueWithMismatch") === "on",
                  note: formData.get("note"),
                },
                "Laundry intake recorded successfully.",
              ),
            );
          }}
        >
          <div className="bg-surface-muted p-4 rounded-xl border border-[var(--border-soft)] mb-4 flex justify-between items-center">
            <span className="text-sm font-medium text-text-secondary">
              Expected Items
            </span>
            <span className="text-lg font-bold text-foreground">
              {order.expectedItemCount ?? "—"}
            </span>
          </div>

          <Field
            label="Actual item count"
            name="actualItemCount"
            type="number"
            defaultValue={order.expectedItemCount ?? ""}
            required
          />
          <TextArea label="Intake note (optional)" name="note" />
          <label className="flex items-center gap-2 text-sm text-text-secondary bg-surface-muted p-3 rounded-xl border border-[var(--border-soft)] cursor-pointer">
            <input
              type="checkbox"
              name="continueWithMismatch"
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            Continue even if count mismatches expected
          </label>
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => closeModal("intake")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Record Intake
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modals.status}
        onClose={() => closeModal("status")}
        title="Update Order Status"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() =>
              mutate(
                `/admin/orders/${order.id}/status`,
                "PATCH",
                {
                  status: formData.get("status"),
                  note: formData.get("note"),
                },
                "Status updated successfully.",
              ),
            );
          }}
        >
          <div className="bg-amber-500/10 border border-amber-400/30 p-4 rounded-xl mb-4">
            <p className="text-xs text-amber-700 font-medium">
              Warning: Manually overriding status may bypass normal workflow
              validations. Use with caution.
            </p>
          </div>
          <Select
            label="Order status"
            name="status"
            defaultValue={order.status}
          >
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabel(status)}
              </option>
            ))}
          </Select>
          <TextArea label="Reason for override" name="note" required />
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => closeModal("status")}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={isPending}>
              Force Update Status
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modals.payment}
        onClose={() => closeModal("payment")}
        title="Update Payment"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() =>
              mutate(
                `/admin/orders/${order.id}/payment`,
                "PATCH",
                {
                  paymentStatus: formData.get("paymentStatus"),
                  paymentMethod: formData.get("paymentMethod"),
                },
                "Payment details updated successfully.",
              ),
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Payment status"
              name="paymentStatus"
              defaultValue={order.paymentStatus}
            >
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {paymentStatusLabel(status)}
                </option>
              ))}
            </Select>
            <Select
              label="Payment method"
              name="paymentMethod"
              defaultValue={order.paymentMethod}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {humanizeToken(method)}
                </option>
              ))}
            </Select>
          </div>

          <div className="pt-4 border-t border-[var(--border-soft)] flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => closeModal("payment")}
            >
              Cancel
            </Button>
            {order.paymentMethod === "COD" ? (
              <Button
                variant="secondary"
                disabled={isPending}
                type="button"
                onClick={() =>
                  startTransition(() => {
                    mutate(
                      `/admin/orders/${order.id}/payment/cod-collect`,
                      "POST",
                      {
                        collectedAmount: parseMoneyAmount(grandTotal),
                        note: "COD collected",
                      },
                      "Cash collection recorded.",
                    );
                  })
                }
              >
                Mark Cash Collected
              </Button>
            ) : null}
            <Button type="submit" disabled={isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modals.reschedule}
        onClose={() => closeModal("reschedule")}
        title="Reschedule Order"
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() =>
              mutate(
                `/admin/orders/${order.id}/schedule`,
                "PATCH",
                {
                  scheduledDate: formData.get("scheduledDate"),
                  scheduledSlotCode: formData.get("scheduledSlotCode"),
                  forceOverride: formData.get("forceOverride") === "on",
                  overrideReason: formData.get("overrideReason"),
                },
                "Order rescheduled successfully.",
              ),
            );
          }}
        >
          <div className="bg-surface-muted p-4 rounded-xl border border-[var(--border-soft)] mb-4">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">
              Current Schedule
            </p>
            <p className="font-medium text-foreground">
              {formatDateTime(order.scheduledDate)} ·{" "}
              {scheduledSlotLabel(order.scheduledSlotCode)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New date" name="scheduledDate" type="date" required />
            <Select
              label="New time slot"
              name="scheduledSlotCode"
              defaultValue={order.scheduledSlotCode}
            >
              {slotCodes.map((slot) => (
                <option key={slot} value={slot}>
                  {humanizeToken(slot)}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary bg-surface-muted p-3 rounded-xl border border-[var(--border-soft)] cursor-pointer mt-4">
            <input
              type="checkbox"
              name="forceOverride"
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            Force reschedule (ignore existing assignments)
          </label>
          <Field label="Reason for override" name="overrideReason" />

          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => closeModal("reschedule")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Confirm Reschedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
