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
  PhoneCall,
  Bike,
  UserCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
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

  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

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

  const pickupRider = useMemo(
    () => operators.find((o) => o.authUserId === order.pickupRiderAuthUserId),
    [operators, order.pickupRiderAuthUserId],
  );
  const deliveryRider = useMemo(
    () => operators.find((o) => o.authUserId === deliveryRiderAuthUserId),
    [operators, deliveryRiderAuthUserId],
  );
  const assignedOperator = useMemo(
    () => operators.find((o) => o.authUserId === order.assignedOperatorAuthUserId),
    [operators, order.assignedOperatorAuthUserId],
  );

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
              {order.paymentStatus === "PAID" || order.paymentStatus === "COD_COLLECTED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border-2 border-emerald-500/50 px-3.5 py-1 text-xs font-black tracking-wider text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)] animate-pulse">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {order.paymentStatus === "COD_COLLECTED" ? "COD COLLECTED ✓" : "PAID IN FULL ✓"}
                </span>
              ) : order.paymentStatus === "PENDING" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border-2 border-amber-500/50 px-3.5 py-1 text-xs font-black tracking-wider text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse">
                  <Clock className="h-4 w-4 text-amber-500" />
                  PAYMENT PENDING ⏳
                </span>
              ) : order.paymentStatus === "COD_PENDING_COLLECTION" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border-2 border-blue-500/50 px-3.5 py-1 text-xs font-black tracking-wider text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.35)] animate-pulse">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  COD TO COLLECT 💵
                </span>
              ) : order.paymentStatus === "FAILED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border-2 border-rose-500/50 px-3.5 py-1 text-xs font-black tracking-wider text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  PAYMENT FAILED ✗
                </span>
              ) : order.paymentStatus === "REFUNDED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border-2 border-purple-500/50 px-3.5 py-1 text-xs font-black tracking-wider text-purple-600 dark:text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)]">
                  <Activity className="h-4 w-4 text-purple-500" />
                  REFUNDED ↺
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 border-2 border-slate-500/40 px-3.5 py-1 text-xs font-black tracking-wider text-slate-600 dark:text-slate-400">
                  {paymentStatusLabel(order.paymentStatus)}
                </span>
              )}
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
              <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-text-muted" /> Payment
              </p>
              <p className="font-bold text-foreground text-base">
                {formatMoney(grandTotal, order.currency)}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {order.paymentStatus === "PAID" || order.paymentStatus === "COD_COLLECTED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" />
                    {order.paymentStatus === "COD_COLLECTED" ? "COD Collected" : "Paid"}
                  </span>
                ) : order.paymentStatus === "PENDING" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 shadow-sm">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                ) : order.paymentStatus === "COD_PENDING_COLLECTION" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/40 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-sm">
                    <CreditCard className="h-3 w-3" />
                    COD to Collect
                  </span>
                ) : order.paymentStatus === "FAILED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 shadow-sm">
                    <AlertTriangle className="h-3 w-3" />
                    Failed
                  </span>
                ) : order.paymentStatus === "REFUNDED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/40 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400 shadow-sm">
                    <Activity className="h-3 w-3" />
                    Refunded
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-500/15 border border-slate-500/30 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                    {paymentStatusLabel(order.paymentStatus)}
                  </span>
                )}
                <span className="text-xs text-text-secondary">
                  · {humanizeToken(order.paymentMethod)}
                </span>
              </div>
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

          {/* ── TIER 1: What To Do Next ── */}
          {(() => {
            const s = order.status;
            const isPickupDelivery = serviceMode === "PICKUP_DELIVERY";
            const isAtHome = serviceMode === "AT_HOME";
            const hasPickupRider = !!order.pickupRiderAuthUserId;
            const hasIntake = order.actualItemCount != null;
            const hasDeliveryRider = !!deliveryRiderAuthUserId;
            const hasOperator = !!order.assignedOperatorAuthUserId;

            // Terminal states — no action needed
            if (s === "COMPLETED" || s === "DELIVERED") {
              return (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Order Complete</p>
                    <p className="text-sm text-emerald-600/80 dark:text-emerald-400/70 mt-1">
                      This order has been {s === "DELIVERED" ? "delivered to the customer" : "completed"}. No further action needed.
                    </p>
                  </div>
                </div>
              );
            }

            if (s === "CANCELLED") {
              return (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                    <X size={22} className="text-rose-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Order Cancelled</p>
                    <p className="text-sm text-rose-600/80 dark:text-rose-400/70 mt-1">
                      This order was cancelled. No further action required.
                    </p>
                  </div>
                </div>
              );
            }

            // Active states — show the next step
            let nextStepTitle = "";
            let nextStepDescription = "";
            let nextStepAction: React.ReactNode = null;
            let nextStepIcon: React.ReactNode = null;
            let nextStepBg = "bg-primary/10 border-primary/30";
            let nextStepTitleColor = "text-primary";

            if (s === "PENDING") {
              nextStepTitle = "Review & Confirm Order";
              nextStepDescription = "A new order is waiting. Review items and confirm to begin fulfillment.";
              nextStepIcon = <CheckCircle2 size={22} className="text-primary" />;
              nextStepAction = (
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Confirm Order",
                      "This will notify the customer that their order is confirmed.",
                      () => startTransition(() => mutate(`/admin/orders/${order.id}/status`, "PATCH", { status: "CONFIRMED" }, "Order confirmed successfully.")),
                    )
                  }
                  disabled={isPending}
                  className="gap-2"
                >
                  <CheckCircle2 size={16} /> Confirm Order
                </Button>
              );
            } else if (s === "CONFIRMED" && isPickupDelivery && !hasPickupRider) {
              nextStepTitle = "Assign Pickup Rider";
              nextStepDescription = "Order is confirmed. Assign a rider to pick up garments from the customer.";
              nextStepIcon = <Truck size={22} className="text-amber-500" />;
              nextStepBg = "bg-amber-500/10 border-amber-500/30";
              nextStepTitleColor = "text-amber-700 dark:text-amber-400";
              nextStepAction = (
                <Button onClick={() => openModal("pickupRider")} disabled={isPending} className="gap-2">
                  <Truck size={16} /> Assign Pickup Rider
                </Button>
              );
            } else if (s === "CONFIRMED" && isAtHome && !hasOperator) {
              nextStepTitle = "Assign Operator";
              nextStepDescription = "Order is confirmed. Assign an operator to perform the at-home service.";
              nextStepIcon = <Users size={22} className="text-amber-500" />;
              nextStepBg = "bg-amber-500/10 border-amber-500/30";
              nextStepTitleColor = "text-amber-700 dark:text-amber-400";
              nextStepAction = (
                <Button onClick={() => openModal("operator")} disabled={isPending} className="gap-2">
                  <Users size={16} /> Assign Operator
                </Button>
              );
            } else if (s === "CONFIRMED") {
              nextStepTitle = "Waiting for Dispatch";
              nextStepDescription = isPickupDelivery
                ? `Pickup rider ${pickupRider?.displayName || ""} has been assigned. Waiting for rider to start pickup.`
                : `Operator ${assignedOperator?.displayName || ""} has been assigned. Waiting for service to begin.`;
              nextStepIcon = <Clock size={22} className="text-blue-500" />;
              nextStepBg = "bg-blue-500/10 border-blue-500/30";
              nextStepTitleColor = "text-blue-700 dark:text-blue-400";
            } else if (s === "IN_PROGRESS" && isPickupDelivery) {
              nextStepTitle = "Pickup In Progress";
              nextStepDescription = `Rider ${pickupRider?.displayName || ""} is picking up items from the customer. Once received, mark as arrived at branch.`;
              nextStepIcon = <Truck size={22} className="text-blue-500" />;
              nextStepBg = "bg-blue-500/10 border-blue-500/30";
              nextStepTitleColor = "text-blue-700 dark:text-blue-400";
              nextStepAction = hasPickupRider ? (
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Mark Received at Branch",
                      "The pickup leg is complete and items are at the branch.",
                      () => startTransition(() => mutate(`/admin/orders/${order.id}/status`, "PATCH", { status: "RECEIVED_AT_BRANCH" }, "Marked received at branch.")),
                    )
                  }
                  disabled={isPending}
                  className="gap-2"
                >
                  <Package size={16} /> Mark Received at Branch
                </Button>
              ) : null;
            } else if (s === "IN_PROGRESS" && isAtHome) {
              nextStepTitle = "Service In Progress";
              nextStepDescription = "Operator is performing the at-home service at the customer location.";
              nextStepIcon = <Users size={22} className="text-blue-500" />;
              nextStepBg = "bg-blue-500/10 border-blue-500/30";
              nextStepTitleColor = "text-blue-700 dark:text-blue-400";
            } else if (s === "RECEIVED_AT_BRANCH" && !hasIntake) {
              nextStepTitle = "Record Laundry Intake";
              nextStepDescription = "Items have arrived at the branch. Count and verify the received garments before processing.";
              nextStepIcon = <Package size={22} className="text-amber-500" />;
              nextStepBg = "bg-amber-500/10 border-amber-500/30";
              nextStepTitleColor = "text-amber-700 dark:text-amber-400";
              nextStepAction = (
                <Button onClick={() => openModal("intake")} disabled={isPending} className="gap-2">
                  <Package size={16} /> Record Laundry Intake
                </Button>
              );
            } else if (s === "RECEIVED_AT_BRANCH" && hasIntake) {
              nextStepTitle = "Start Processing";
              nextStepDescription = `Intake recorded (${order.actualItemCount} items). Move the order to processing to begin cleaning.`;
              nextStepIcon = <ArrowRight size={22} className="text-primary" />;
              nextStepAction = (
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Start Processing",
                      "Move this order into active processing.",
                      () => startTransition(() => mutate(`/admin/orders/${order.id}/status`, "PATCH", { status: "PROCESSING" }, "Order processing started.")),
                    )
                  }
                  disabled={isPending}
                  className="gap-2"
                >
                  <ArrowRight size={16} /> Start Processing
                </Button>
              );
            } else if (s === "PROCESSING") {
              nextStepTitle = "Processing — Mark Ready When Done";
              nextStepDescription = "Garments are being cleaned. Once everything is processed, mark the order as ready for delivery.";
              nextStepIcon = <Activity size={22} className="text-blue-500" />;
              nextStepBg = "bg-blue-500/10 border-blue-500/30";
              nextStepTitleColor = "text-blue-700 dark:text-blue-400";
              nextStepAction = (
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Mark Ready for Delivery",
                      "This will make the order available for delivery assignment. Ensure all processing is complete.",
                      () => startTransition(() => mutate(`/admin/orders/${order.id}/status`, "PATCH", { status: "READY_FOR_DELIVERY" }, "Marked ready for delivery.")),
                    )
                  }
                  disabled={isPending}
                  className="gap-2"
                >
                  <CheckCircle2 size={16} /> Mark Ready for Delivery
                </Button>
              );
            } else if (s === "READY_FOR_DELIVERY") {
              nextStepTitle = hasDeliveryRider ? "Waiting for Delivery to Start" : "Assign Delivery Rider";
              nextStepDescription = hasDeliveryRider
                ? `Delivery rider ${deliveryRider?.displayName || ""} has been assigned. Waiting for rider to pick up from branch.`
                : "Order is ready. Assign a delivery rider to return the clean garments to the customer.";
              nextStepIcon = <Truck size={22} className={hasDeliveryRider ? "text-blue-500" : "text-amber-500"} />;
              nextStepBg = hasDeliveryRider ? "bg-blue-500/10 border-blue-500/30" : "bg-amber-500/10 border-amber-500/30";
              nextStepTitleColor = hasDeliveryRider ? "text-blue-700 dark:text-blue-400" : "text-amber-700 dark:text-amber-400";
              nextStepAction = (
                <Button onClick={() => openModal("delivery")} disabled={isPending} className="gap-2">
                  <Truck size={16} /> {hasDeliveryRider ? "Manage Delivery Trip" : "Assign Delivery"}
                </Button>
              );
            } else if (s === "OUT_FOR_DELIVERY") {
              nextStepTitle = "Out for Delivery";
              nextStepDescription = `Delivery rider ${deliveryRider?.displayName || ""} is delivering to the customer. Mark complete once delivered.`;
              nextStepIcon = <Truck size={22} className="text-blue-500" />;
              nextStepBg = "bg-blue-500/10 border-blue-500/30";
              nextStepTitleColor = "text-blue-700 dark:text-blue-400";
              nextStepAction = (
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Complete Delivery",
                      "Confirm that the order has been successfully delivered.",
                      () => startTransition(() => mutate(`/admin/orders/${order.id}/status`, "PATCH", { status: "DELIVERED" }, "Delivery completed.")),
                    )
                  }
                  disabled={isPending}
                  className="gap-2"
                >
                  <CheckCircle2 size={16} /> Complete Delivery
                </Button>
              );
            } else if (s === "PICKUP_FAILED") {
              nextStepTitle = "Pickup Failed — Action Required";
              nextStepDescription = "The pickup attempt failed. Reassign a new rider or reschedule the pickup.";
              nextStepIcon = <AlertTriangle size={22} className="text-rose-500" />;
              nextStepBg = "bg-rose-500/10 border-rose-500/30";
              nextStepTitleColor = "text-rose-700 dark:text-rose-400";
              nextStepAction = (
                <Button onClick={() => openModal("pickupRider")} disabled={isPending} className="gap-2">
                  <Truck size={16} /> Reassign Pickup Rider
                </Button>
              );
            } else if (s === "DELIVERY_FAILED") {
              nextStepTitle = "Delivery Failed — Action Required";
              nextStepDescription = "The delivery attempt failed. Schedule a re-delivery via the Delivery Trips dashboard.";
              nextStepIcon = <AlertTriangle size={22} className="text-rose-500" />;
              nextStepBg = "bg-rose-500/10 border-rose-500/30";
              nextStepTitleColor = "text-rose-700 dark:text-rose-400";
              nextStepAction = (
                <Button onClick={() => openModal("delivery")} disabled={isPending} className="gap-2">
                  <Truck size={16} /> Schedule Re-Delivery
                </Button>
              );
            } else {
              nextStepTitle = "Review Order";
              nextStepDescription = "Review the current order status and take appropriate action.";
              nextStepIcon = <Info size={22} className="text-primary" />;
            }

            return (
              <div className={`rounded-2xl border p-5 ${nextStepBg}`}>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
                    {nextStepIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">What To Do Next</p>
                    <p className={`text-base font-bold ${nextStepTitleColor}`}>{nextStepTitle}</p>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed">{nextStepDescription}</p>
                    {nextStepAction && <div className="mt-4">{nextStepAction}</div>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── TIER 2: More Actions (Collapsible) ── */}
          {!isTerminal && (
            <div className="border-t border-[var(--border-soft)] pt-3">
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-foreground transition-colors w-full py-1"
                onClick={() => setMoreActionsOpen((v) => !v)}
              >
                {moreActionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {moreActionsOpen ? "Hide" : "Show"} More Actions
              </button>
              {moreActionsOpen && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Assign Operator — AT_HOME only, not terminal */}
                  {serviceMode === "AT_HOME" && (
                    <Button
                      variant="secondary"
                      className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                      onClick={() => openModal("operator")}
                    >
                      <Users size={16} className={order.assignedOperatorAuthUserId ? "text-primary" : "text-amber-500"} />
                      <span className="truncate">{order.assignedOperatorAuthUserId ? "Reassign Operator" : "Assign Operator"}</span>
                    </Button>
                  )}

                  {/* Assign/Reassign Pickup Rider — only before RECEIVED_AT_BRANCH */}
                  {serviceMode === "PICKUP_DELIVERY" &&
                    ["PENDING", "CONFIRMED", "IN_PROGRESS", "PICKUP_FAILED"].includes(order.status) && (
                      <Button
                        variant="secondary"
                        className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                        onClick={() => openModal("pickupRider")}
                      >
                        <Truck size={16} className={order.pickupRiderAuthUserId ? "text-primary" : "text-amber-500"} />
                        <span className="truncate">{order.pickupRiderAuthUserId ? "Reassign Pickup Rider" : "Assign Pickup Rider"}</span>
                      </Button>
                    )}

                  {/* Laundry Intake — only at RECEIVED_AT_BRANCH (or IN_PROGRESS for early intake) */}
                  {serviceMode === "PICKUP_DELIVERY" &&
                    ["IN_PROGRESS", "RECEIVED_AT_BRANCH"].includes(order.status) && (
                      <Button
                        variant="secondary"
                        className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                        onClick={() => openModal("intake")}
                      >
                        <Package size={16} className={order.actualItemCount != null ? "text-primary" : "text-text-secondary"} />
                        <span className="truncate">{order.actualItemCount != null ? "Update Intake" : "Laundry Intake"}</span>
                      </Button>
                    )}

                  {/* Delivery — from READY_FOR_DELIVERY onward */}
                  {serviceMode === "PICKUP_DELIVERY" &&
                    ["READY_FOR_DELIVERY", "OUT_FOR_DELIVERY", "DELIVERY_FAILED"].includes(order.status) && (
                      <Button
                        variant="secondary"
                        className="flex items-center justify-center gap-2 w-full shadow-sm hover:border-primary/50"
                        onClick={() => openModal("delivery")}
                      >
                        <Truck size={16} className={deliveryRiderAuthUserId ? "text-primary" : "text-amber-500"} />
                        <span className="truncate">{deliveryRiderAuthUserId ? "Manage Delivery" : "Assign Delivery"}</span>
                      </Button>
                    )}

                  {/* Manual status override */}
                  <Button
                    variant="secondary"
                    className="flex items-center justify-center gap-2 w-full shadow-sm"
                    onClick={() => openModal("status")}
                  >
                    <Activity size={16} className="text-text-secondary" />
                    <span className="truncate">Override Status</span>
                  </Button>

                  {/* Payment update */}
                  <Button
                    variant="secondary"
                    className="flex items-center justify-center gap-2 w-full shadow-sm"
                    onClick={() => openModal("payment")}
                  >
                    <CreditCard size={16} className="text-text-secondary" />
                    <span className="truncate">Update Payment</span>
                  </Button>

                  {/* Reschedule — only for statuses before delivery */}
                  {["PENDING", "CONFIRMED", "IN_PROGRESS", "RECEIVED_AT_BRANCH", "PROCESSING", "READY_FOR_DELIVERY", "PICKUP_FAILED"].includes(order.status) && (
                    <Button
                      variant="secondary"
                      className="flex items-center justify-center gap-2 w-full shadow-sm"
                      onClick={() => openModal("reschedule")}
                    >
                      <Clock size={16} className="text-text-secondary" />
                      <span className="truncate">Reschedule</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
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

          {/* ── Assigned Rider & Staff Details ── */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={18} className="text-text-secondary" /> Assigned Staff & Riders
              </h3>
              <span className="text-xs text-text-muted">
                {serviceMode === "PICKUP_DELIVERY" ? "Pickup & Delivery Personnel" : "At-Home Service Personnel"}
              </span>
            </div>

            {serviceMode === "PICKUP_DELIVERY" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Pickup Rider Card */}
                <div className={`rounded-2xl p-4 border transition-all ${pickupRider
                  ? "bg-amber-500/5 border-amber-500/30"
                  : (order.status === "CONFIRMED" || order.status === "IN_PROGRESS")
                    ? "bg-rose-500/5 border-rose-500/30"
                    : "bg-surface-muted border-[var(--border-soft)]"
                  }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      <Bike className="h-3.5 w-3.5" /> Pickup Rider
                    </span>
                    {pickupRider ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Assigned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3 w-3" /> Not Assigned
                      </span>
                    )}
                  </div>

                  {pickupRider ? (
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-base font-bold text-foreground">
                          {pickupRider.displayName}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {order.pickupCompletedAt
                            ? `✓ Laundry pickup completed (${formatDateTime(order.pickupCompletedAt)})`
                            : "Assigned to collect laundry from customer's address"}
                        </p>
                      </div>

                      {pickupRider.phoneNumber ? (
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`tel:${pickupRider.phoneNumber}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            Call: {pickupRider.phoneNumber}
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted italic">No phone number recorded</p>
                      )}

                      {(pickupRider.vehicleType || pickupRider.vehicleNumber) && (
                        <div className="pt-2 border-t border-amber-500/20 text-xs text-text-secondary flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-amber-600" />
                          <span>
                            Vehicle: <strong className="text-foreground font-semibold">{pickupRider.vehicleType || "Two Wheeler"}</strong>
                            {pickupRider.vehicleNumber && ` (${pickupRider.vehicleNumber})`}
                          </span>
                        </div>
                      )}

                      {!isTerminal && (
                        <div className="pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-text-secondary hover:text-foreground h-7 px-2"
                            onClick={() => openModal("pickupRider")}
                          >
                            Change / Reassign Rider →
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-text-secondary">
                        No rider has been assigned yet to collect laundry from this customer.
                      </p>
                      {!isTerminal && (
                        <Button
                          size="sm"
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 mt-2"
                          onClick={() => openModal("pickupRider")}
                        >
                          <Bike className="h-4 w-4" /> Assign Pickup Rider
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Rider Card */}
                <div className={`rounded-2xl p-4 border transition-all ${deliveryRider
                  ? "bg-blue-500/5 border-blue-500/30"
                  : order.status === "READY_FOR_DELIVERY"
                    ? "bg-rose-500/5 border-rose-500/30"
                    : "bg-surface-muted border-[var(--border-soft)]"
                  }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      <Truck className="h-3.5 w-3.5" /> Delivery Rider
                    </span>
                    {deliveryRider ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Assigned
                      </span>
                    ) : order.status === "READY_FOR_DELIVERY" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3 w-3" /> Ready for Dispatch
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
                        Pending Processing
                      </span>
                    )}
                  </div>

                  {deliveryRider ? (
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-base font-bold text-foreground">
                          {deliveryRider.displayName}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {order.status === "OUT_FOR_DELIVERY"
                            ? "Rider is actively out for delivery to customer"
                            : order.status === "DELIVERED" || order.status === "COMPLETED"
                              ? "✓ Laundry delivered to customer"
                              : "Assigned to return cleaned laundry to customer"}
                        </p>
                      </div>

                      {deliveryRider.phoneNumber ? (
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`tel:${deliveryRider.phoneNumber}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            Call: {deliveryRider.phoneNumber}
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted italic">No phone number recorded</p>
                      )}

                      {(deliveryRider.vehicleType || deliveryRider.vehicleNumber) && (
                        <div className="pt-2 border-t border-blue-500/20 text-xs text-text-secondary flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-blue-600" />
                          <span>
                            Vehicle: <strong className="text-foreground font-semibold">{deliveryRider.vehicleType || "Vehicle"}</strong>
                            {deliveryRider.vehicleNumber && ` (${deliveryRider.vehicleNumber})`}
                          </span>
                        </div>
                      )}

                      {order.status === "READY_FOR_DELIVERY" && (
                        <div className="pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-text-secondary hover:text-foreground h-7 px-2"
                            onClick={() => openModal("delivery")}
                          >
                            Manage Delivery Assignment →
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-text-secondary">
                        {order.status === "READY_FOR_DELIVERY"
                          ? "Laundry is processed and ready. Assign to a delivery trip to dispatch to customer."
                          : "Delivery rider will be assigned once laundry processing completes at the facility."}
                      </p>
                      {order.status === "READY_FOR_DELIVERY" && (
                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 mt-2"
                          onClick={() => openModal("delivery")}
                        >
                          <Truck className="h-4 w-4" /> Assign Delivery Rider
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* At-Home Service Professional Card */
              <div className={`rounded-2xl p-4 border transition-all ${assignedOperator
                ? "bg-emerald-500/5 border-emerald-500/30"
                : "bg-amber-500/5 border-amber-500/30"
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    <UserCheck className="h-3.5 w-3.5" /> Service Professional
                  </span>
                  {assignedOperator ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Assigned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> Unassigned
                    </span>
                  )}
                </div>

                {assignedOperator ? (
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-base font-bold text-foreground">
                        {assignedOperator.displayName}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Assigned to perform on-site service at customer address
                      </p>
                    </div>

                    {assignedOperator.phoneNumber ? (
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`tel:${assignedOperator.phoneNumber}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          Call: {assignedOperator.phoneNumber}
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">No phone number recorded</p>
                    )}

                    {!isTerminal && (
                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-text-secondary hover:text-foreground h-7 px-2"
                          onClick={() => openModal("operator")}
                        >
                          Reassign Professional →
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-text-secondary">
                      No service professional is assigned yet to execute this at-home booking.
                    </p>
                    {!isTerminal && (
                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 mt-2"
                        onClick={() => openModal("operator")}
                      >
                        <UserCheck className="h-4 w-4" /> Assign Service Professional
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {blockers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-soft)]">
                {blockers.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400"
                  >
                    ⚠ {humanizeBlocker(b)}
                  </span>
                ))}
              </div>
            )}
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
              <div className="flex justify-between items-baseline text-foreground font-bold pt-2 border-t border-[var(--border-soft)] text-base">
                <span>Total Amount</span>
                <span>{formatMoney(grandTotal, order.currency)}</span>
              </div>

              {/* Prominent Payment Status Banner */}
              {order.paymentStatus === "PAID" || order.paymentStatus === "COD_COLLECTED" ? (
                <div className="mt-3 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 p-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                        {order.paymentStatus === "COD_COLLECTED" ? "Cash Collected & Verified" : "Payment Verified & Received"}
                      </p>
                      <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400 font-medium">
                        {formatMoney(grandTotal, order.currency)} paid via {humanizeToken(order.paymentMethod)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-black tracking-wider text-white shadow-sm">
                    {order.paymentStatus === "COD_COLLECTED" ? "COLLECTED ✓" : "PAID ✓"}
                  </span>
                </div>
              ) : order.paymentStatus === "PENDING" ? (
                <div className="mt-3 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-md shadow-amber-500/30">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                        Payment Pending
                      </p>
                      <p className="text-[11px] text-amber-700/90 dark:text-amber-400 font-medium">
                        Awaiting payment of {formatMoney(grandTotal, order.currency)} via {humanizeToken(order.paymentMethod)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-amber-600 px-3 py-1 text-xs font-black tracking-wider text-white shadow-sm">
                    UNPAID ⏳
                  </span>
                </div>
              ) : order.paymentStatus === "COD_PENDING_COLLECTION" ? (
                <div className="mt-3 rounded-2xl bg-blue-500/10 border-2 border-blue-500/40 p-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-md shadow-blue-500/30">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                        Cash on Delivery Required
                      </p>
                      <p className="text-[11px] text-blue-700/90 dark:text-blue-400 font-medium">
                        Rider must collect {formatMoney(grandTotal, order.currency)} upon delivery
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-black tracking-wider text-white shadow-sm">
                    COD TO COLLECT 💵
                  </span>
                </div>
              ) : order.paymentStatus === "FAILED" ? (
                <div className="mt-3 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 p-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-md shadow-rose-500/30">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                        Payment Failed
                      </p>
                      <p className="text-[11px] text-rose-700/90 dark:text-rose-400 font-medium">
                        Transaction of {formatMoney(grandTotal, order.currency)} failed via {humanizeToken(order.paymentMethod)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-rose-600 px-3 py-1 text-xs font-black tracking-wider text-white shadow-sm">
                    FAILED ✗
                  </span>
                </div>
              ) : order.paymentStatus === "REFUNDED" ? (
                <div className="mt-3 rounded-2xl bg-purple-500/10 border-2 border-purple-500/40 p-3.5 flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white shadow-md shadow-purple-500/30">
                      <Activity className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide">
                        Payment Refunded
                      </p>
                      <p className="text-[11px] text-purple-700/90 dark:text-purple-400 font-medium">
                        Amount of {formatMoney(grandTotal, order.currency)} was refunded to customer
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-purple-600 px-3 py-1 text-xs font-black tracking-wider text-white shadow-sm">
                    REFUNDED ↺
                  </span>
                </div>
              ) : null}
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
              onClick={() => (window.location.href = "/delivery-trips")}
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
                  orderCode: order.orderCode || "",
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
