"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  getCurrentResponsibility,
} from "@/lib/format";
import type {
  OrderLineItemResponse,
  OrderResponse,
  OperatorProfileResponse,
  DeliveryTripResponse,
  BranchAdminResponse,
} from "@/lib/types";
import {
  orderStatuses,
  paymentMethods,
  paymentStatuses,
  slotCodes,
  pickupDeliveryStatusTimeline,
  atHomeStatusTimeline,
} from "@/lib/constants";
import {
  Users,
  Truck,
  Package,
  Clock,
  CreditCard,
  Activity,
  Download,
  ChevronUp,
  ChevronDown,
  Trash2,
  CheckCircle2,
  Copy,
  MapPin,
  Receipt,
  Info,
  AlertTriangle,
  Zap,
  Camera,
  Bike,
  X,
  PhoneCall,
  Map as MapIcon,
  ArrowLeft,
  UserCheck,
} from "lucide-react";
import { downloadOrderInvoice } from "../api/order-api";
import { toast } from "sonner";

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
  let list = operators.filter(
    (w) =>
      w.role === role &&
      w.status === "ACTIVE" &&
      order.branchId &&
      w.branchId === order.branchId,
  );

  if (list.length === 0) {
    list = operators.filter((w) => w.role === role && w.status === "ACTIVE");
  }

  if (list.length === 0) {
    list = operators.filter((w) => w.role === role);
  }

  if (role === "RIDER") {
    list.sort((a, b) => {
      const aHas = a.serviceCategoryCodes?.includes("LAUNDRY") ? 1 : 0;
      const bHas = b.serviceCategoryCodes?.includes("LAUNDRY") ? 1 : 0;
      return bHas - aHas;
    });
  }
  return list;
}

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
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-[var(--border-soft)] rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200">
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
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "assignment" | "activity" | "photos" | "invoices">("details");
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals state
  const [modals, setModals] = useState({
    operator: false,
    pickupRider: false,
    delivery: false,
    intake: false,
    status: false,
    payment: false,
    reschedule: false,
    delete: false,
    address: false,
  });

  const closeModal = (key: keyof typeof modals) =>
    setModals((m) => ({ ...m, [key]: false }));
  const openModal = (key: keyof typeof modals) =>
    setModals((m) => ({ ...m, [key]: true }));

  // Safe confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const { data: fetchedOperators } = useQuery<OperatorProfileResponse[]>({
    queryKey: ["admin-operators"],
    queryFn: () => apiRequest({ path: "/admin/operators" }),
  });
  const effectiveOperators =
    fetchedOperators && fetchedOperators.length > 0 ? fetchedOperators : operators;

  const { data: deliveryTrips } = useQuery<DeliveryTripResponse[]>({
    queryKey: ["delivery-trips"],
    queryFn: () => apiRequest({ path: "/admin/delivery-trips" }),
  });

  const { data: branches } = useQuery<BranchAdminResponse[]>({
    queryKey: ["branches"],
    queryFn: () => apiRequest({ path: "/admin/branches" }),
  });

  const branchName =
    branches?.find((b) => b.id === order.branchId)?.name ||
    (order.branchId ? order.branchId.slice(0, 8).toUpperCase() : "—");

  const deliveryTrip = deliveryTrips?.find((trip) =>
    trip.stops.some((stop) => stop.orderId === order.id),
  );
  const deliveryRiderAuthUserId =
    deliveryTrip?.riderAuthUserId ?? (order as any).deliveryRiderAuthUserId;

  const pickupRider = useMemo(
    () =>
      order.pickupRider ??
      effectiveOperators.find((o) => o.authUserId === order.pickupRiderAuthUserId),
    [effectiveOperators, order.pickupRiderAuthUserId, order.pickupRider],
  );
  const deliveryRider = useMemo(
    () =>
      order.deliveryRider ??
      effectiveOperators.find((o) => o.authUserId === deliveryRiderAuthUserId),
    [effectiveOperators, deliveryRiderAuthUserId, order.deliveryRider],
  );
  const assignedOperator = useMemo(
    () =>
      order.assignedOperator ??
      effectiveOperators.find((o) => o.authUserId === order.assignedOperatorAuthUserId),
    [effectiveOperators, order.assignedOperatorAuthUserId, order.assignedOperator],
  );

  const isOrderCompleted =
    order.status === "COMPLETED" ||
    order.status === "DELIVERED" ||
    order.fulfillment?.assignmentState === "COMPLETED";

  const isPaid =
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "COD_COLLECTED" ||
    isOrderCompleted;

  const serviceMode = order.serviceMode ?? "PICKUP_DELIVERY";
  const isLaundry =
    serviceMode === "PICKUP_DELIVERY" ||
    order.serviceCategoryCode?.toUpperCase() === "LAUNDRY";

  const itemsByService = useMemo(
    () => groupItemsByService(order.items),
    [order.items],
  );

  const grandTotal = order.grandTotalAmount;
  const subtotal = order.subtotalAmount;
  const addOnTotal = order.addOnTotalAmount;
  const discountAmount = order.discountAmount;
  const expressFeeAmount = order.expressFeeAmount;
  const numSub = parseFloat(subtotal || "0");
  const numAdd = parseFloat(addOnTotal || "0");
  const numDisc = parseFloat(discountAmount || "0");
  const numExpress = parseFloat(
    expressFeeAmount ||
    (order.bookingType === "ASAP" && parseFloat(grandTotal || "0") > 0 ? "70" : "0"),
  );
  const numGrand = parseFloat(grandTotal || "0");
  const baseTaxable = Math.max(0, numSub + numAdd - numDisc);
  const taxAmount =
    order.taxAmount ??
    (numGrand > baseTaxable + numExpress
      ? (numGrand - baseTaxable - numExpress).toFixed(2)
      : (baseTaxable * 0.18).toFixed(2));
  const blockers = order.fulfillment?.blockers ?? [];

  // Operator / staff arrival time at customer location
  const operatorReachedAt = useMemo(() => {
    if (order.actualArrivalTime) return order.actualArrivalTime;
    const onSiteAudit = (order.auditEvents || []).find((e: any) => {
      const meta = e.metadata;
      return (
        (e.action === "assignment_projection_updated" || e.action === "assignment_status_updated") &&
        meta &&
        (meta.status === "ON_SITE" || meta.toStatus === "ON_SITE")
      );
    });
    if (onSiteAudit?.createdAt) return onSiteAudit.createdAt;

    const onSiteStatus = (order.statusEvents || []).find((e: any) => e.toStatus === "ON_SITE");
    if (onSiteStatus?.createdAt) return onSiteStatus.createdAt;

    if (isLaundry && order.pickupCompletedAt) {
      return order.pickupCompletedAt;
    }
    return null;
  }, [order, isLaundry]);

  // Actual work / delivery completion time
  const workCompletedAt = useMemo(() => {
    if ((order as any).completedAt) return (order as any).completedAt;
    if ((order as any).deliveredAt) return (order as any).deliveredAt;

    const completedStatus = (order.statusEvents || [])
      .slice()
      .reverse()
      .find((e: any) => e.toStatus === "COMPLETED" || e.toStatus === "DELIVERED");
    if (completedStatus?.createdAt) return completedStatus.createdAt;

    if (isOrderCompleted) {
      return order.updatedAt;
    }
    return null;
  }, [order, isOrderCompleted]);

  const timelineStatuses =
    serviceMode === "AT_HOME" ? atHomeStatusTimeline : pickupDeliveryStatusTimeline;
  const statusIndex = timelineStatuses.indexOf(order.status);
  const isTerminal =
    order.status === "COMPLETED" ||
    order.status === "DELIVERED" ||
    order.status === "CANCELLED";

  async function handleDownloadInvoice() {
    if (!isPaid) {
      toast.error(
        order.paymentMethod === "COD"
          ? "Tax invoice is available only after cash payment is collected on delivery."
          : "Tax invoice is available only after payment has been completed.",
      );
      return;
    }
    setIsDownloadingInvoice(true);
    try {
      await downloadOrderInvoice(
        order.id,
        order.orderNumber || order.orderCode || order.id.slice(-6),
      );
      toast.success("Tax invoice downloaded successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download invoice.");
    } finally {
      setIsDownloadingInvoice(false);
    }
  }

  async function handleDeleteOrder() {
    setIsDeleting(true);
    setError(null);
    try {
      await apiRequest({
        path: `/admin/orders/${order.id}`,
        method: "DELETE",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      closeModal("delete");
      toast.success("Order deleted successfully.");
      router.push("/orders");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete order.");
      setIsDeleting(false);
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
      toast.success(successMsg);
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
        delete: false,
        address: false,
      });
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (nextError) {
      const msg =
        nextError instanceof Error ? nextError.message : "Could not save the order.";
      toast.error(msg);
      setError(msg);
    }
  }

  const handleActionClick = (
    title: string,
    description: string,
    onConfirm: () => void,
  ) => {
    setConfirmAction({ title, description, onConfirm });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/orders")}
              type="button"
              className="p-2 -ml-2 rounded-xl text-text-muted hover:text-foreground hover:bg-surface-muted transition-colors border border-[var(--border-soft)]"
              title="Back to Orders"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              {orderLabel(order)}
              <button
                className="p-1 rounded-md text-text-muted hover:text-primary transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(orderLabel(order));
                  toast.success("Order ID copied to clipboard");
                }}
                title="Copy Order ID"
                type="button"
              >
                <Copy size={16} />
              </button>
            </h1>
          </div>

          <p className="text-text-secondary mt-1 text-sm md:text-base">
            {order.serviceCategoryName ?? order.serviceCategoryCode}
            {order.serviceName ? ` · ${order.serviceName}` : ""}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge tone={order.status === "COMPLETED" || order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "warning"}>
              {orderStatusLabel(order.status, order.serviceMode)}
            </Badge>

            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-surface-muted text-text-secondary border border-[var(--border-soft)]">
              {humanizeToken(serviceMode)}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold bg-surface-muted text-text-secondary border border-[var(--border-soft)]">
              <CreditCard size={13} className="text-primary" />
              {formatMoney(grandTotal, order.currency)} · {humanizeToken(order.paymentMethod)}
            </span>

            {isPaid ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                {order.paymentStatus === "COD_COLLECTED" ? "COD Collected" : "Paid in Full"}
              </span>
            ) : order.paymentStatus === "COD_PENDING_COLLECTION" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/40 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                <CreditCard size={12} />
                COD to Collect
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <Clock size={12} />
                Payment Pending
              </span>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            className={`gap-2 font-semibold ${!isPaid ? "opacity-60" : ""}`}
            onClick={handleDownloadInvoice}
            disabled={isDownloadingInvoice}
            title={!isPaid ? "Tax invoice is available once payment is completed" : "Download official tax invoice"}
          >
            <Download className={`h-4 w-4 ${isPaid ? "text-primary" : "text-text-muted"}`} />
            {isDownloadingInvoice ? "Downloading..." : "Tax Invoice"}
          </Button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 font-semibold"
              onClick={() => setMoreActionsOpen((v) => !v)}
            >
              More Actions {moreActionsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </Button>

            {moreActionsOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-[var(--border-soft)] shadow-xl rounded-2xl z-50 overflow-hidden flex flex-col p-1.5 animate-in slide-in-from-top-2">
                <button
                  type="button"
                  onClick={() => {
                    openModal("status");
                    setMoreActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted rounded-xl flex items-center gap-2.5 text-foreground transition-colors"
                >
                  <Activity size={15} className="text-text-muted" /> Override Status
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openModal("payment");
                    setMoreActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted rounded-xl flex items-center gap-2.5 text-foreground transition-colors"
                >
                  <CreditCard size={15} className="text-text-muted" /> Update Payment
                </button>

                {!isTerminal && (
                  <button
                    type="button"
                    onClick={() => {
                      openModal("reschedule");
                      setMoreActionsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted rounded-xl flex items-center gap-2.5 text-foreground transition-colors"
                  >
                    <Clock size={15} className="text-text-muted" /> Reschedule
                  </button>
                )}

                <div className="h-px bg-[var(--border-soft)] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    openModal("delete");
                    setMoreActionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-rose-500/10 text-rose-600 rounded-xl flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 size={15} /> Delete Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Next Action Banner (Clean7 Theme) ── */}
      {(() => {
        let nextStepTitle = "";
        let nextStepDescription = "";
        let nextStepAction: React.ReactNode = null;
        let nextStepIcon: React.ReactNode = null;
        let nextStepBg = "bg-primary/10 border-primary/30";
        let nextStepTitleColor = "text-primary";
        let nextStepIconColor = "text-primary";
        let nextStepIconBg = "bg-primary/20";
        let nextStepBtnClass = "bg-primary text-white hover:bg-primary-strong border-transparent";

        const s = order.status;
        const isPickupDelivery = serviceMode === "PICKUP_DELIVERY";
        const isAtHome = serviceMode === "AT_HOME";
        const hasPickupRider = !!order.pickupRiderAuthUserId;
        const hasOperator = !!order.assignedOperatorAuthUserId;
        const hasIntake = order.actualItemCount != null;
        const hasDeliveryRider = !!deliveryRiderAuthUserId;

        if (s === "PENDING") {
          nextStepTitle = "Review & Confirm Order";
          nextStepDescription = "A new booking is waiting. Review items and confirm to begin fulfillment.";
          nextStepIcon = <CheckCircle2 size={24} className="text-primary" />;
        } else if (s === "CONFIRMED" && isPickupDelivery && !hasPickupRider) {
          nextStepTitle = "Assign Pickup Rider";
          nextStepDescription = "Order is confirmed. Assign a rider to pick up garments from the customer.";
          nextStepIcon = <Truck size={24} className="text-primary" />;
          nextStepBg = "bg-primary/10 border-primary/30";
          nextStepTitleColor = "text-primary";
          nextStepIconColor = "text-primary";
          nextStepIconBg = "bg-primary/20";
          nextStepBtnClass = "bg-primary text-white hover:bg-primary-strong border-transparent";
        } else if (s === "CONFIRMED" && isPickupDelivery && hasPickupRider) {
          nextStepTitle = "Awaiting Pickup";
          nextStepDescription = `Rider ${pickupRider?.displayName ?? "assigned"} is scheduled to collect garments from the customer.`;
          nextStepIcon = <Truck size={24} className="text-primary" />;
        } else if (s === "CONFIRMED" && isAtHome && !hasOperator) {
          nextStepTitle = "Assign Service Professional";
          nextStepDescription = "Order is confirmed. Assign an operator to perform the at-home service.";
          nextStepIcon = <Users size={24} className="text-primary" />;
          nextStepBg = "bg-primary/10 border-primary/30";
          nextStepTitleColor = "text-primary";
          nextStepIconColor = "text-primary";
          nextStepIconBg = "bg-primary/20";
          nextStepBtnClass = "bg-primary text-white hover:bg-primary-strong border-transparent";
        } else if (s === "CONFIRMED" && isAtHome && hasOperator) {
          nextStepTitle = "Professional Assigned";
          nextStepDescription = `Operator ${assignedOperator?.displayName ?? "assigned"} is scheduled. Waiting for operator to start journey.`;
          nextStepIcon = <Users size={24} className="text-primary" />;
        } else if (s === "IN_PROGRESS" && isAtHome) {
          const opState = order.fulfillment?.assignmentState;
          if (opState === "EN_ROUTE") {
            nextStepTitle = "Operator En Route";
            nextStepDescription = `Operator ${assignedOperator?.displayName ?? "assigned"} is travelling to the service location.`;
            nextStepIcon = <Truck size={24} className="text-primary" />;
          } else if (opState === "ON_SITE") {
            nextStepTitle = "Operator On Site";
            nextStepDescription = `Operator ${assignedOperator?.displayName ?? "assigned"} has arrived at customer location and is conducting inspection.`;
            nextStepIcon = <MapPin size={24} className="text-primary" />;
          } else if (opState === "WORK_STARTED") {
            nextStepTitle = "Service Underway";
            nextStepDescription = `Operator ${assignedOperator?.displayName ?? "assigned"} is actively performing the service.`;
            nextStepIcon = <Activity size={24} className="text-primary" />;
          } else if (opState === "PROOF_SUBMITTED" || opState === "COMPLETED") {
            nextStepTitle =
              opState === "COMPLETED"
                ? "Operator Marked Job Complete"
                : "Proof Uploaded — Ready for Completion";
            nextStepDescription =
              isPaid || order.paymentStatus === "COD_COLLECTED"
                ? `Operator ${assignedOperator?.displayName ?? "assigned"} has finished service. Click Complete Order to finalize.`
                : `Operator ${assignedOperator?.displayName ?? "assigned"} has finished service. Settle/confirm payment to finalize.`;
            nextStepIcon = <CheckCircle2 size={24} className="text-emerald-600" />;
            nextStepBg = "bg-emerald-500/10 border-emerald-500/30";
            nextStepTitleColor = "text-emerald-700 dark:text-emerald-400";
            nextStepIconColor = "text-emerald-600";
            nextStepIconBg = "bg-emerald-500/20";
            nextStepBtnClass = "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent";
          } else {
            nextStepTitle = "Service In Progress";
            nextStepDescription = `Operator ${assignedOperator?.displayName ?? "assigned"} is performing the at-home service.`;
            nextStepIcon = <Activity size={24} className="text-primary" />;
          }
        } else if (s === "IN_PROGRESS" && isPickupDelivery && !hasIntake) {
          nextStepTitle = "Laundry Intake";
          nextStepDescription = "Rider picked up garments. Verify and count items upon arrival at the branch.";
          nextStepIcon = <Package size={24} className="text-primary" />;
          nextStepBg = "bg-primary/10 border-primary/30";
          nextStepTitleColor = "text-primary";
          nextStepIconColor = "text-primary";
          nextStepIconBg = "bg-primary/20";
          nextStepBtnClass = "bg-primary text-white hover:bg-primary-strong border-transparent";
        } else if (s === "IN_PROGRESS" && isPickupDelivery && hasIntake) {
          nextStepTitle = "Receive at Branch / Start Processing";
          nextStepDescription = `Rider collected ${order.actualItemCount} items. Confirm arrival at facility or start processing immediately.`;
          nextStepIcon = <Package size={24} className="text-primary" />;
          nextStepBg = "bg-primary/10 border-primary/30";
          nextStepTitleColor = "text-primary";
          nextStepIconColor = "text-primary";
          nextStepIconBg = "bg-primary/20";
          nextStepBtnClass = "bg-primary text-white hover:bg-primary-strong border-transparent";
        } else if (s === "RECEIVED_AT_BRANCH" && !hasIntake) {
          nextStepTitle = "Laundry Intake";
          nextStepDescription = "Order arrived at branch. Verify and count items to proceed.";
          nextStepIcon = <Package size={24} className="text-primary" />;
          nextStepBg = "bg-primary/10 border-primary/30";
          nextStepTitleColor = "text-primary";
          nextStepIconColor = "text-primary";
          nextStepIconBg = "bg-primary/20";
          nextStepBtnClass = "bg-primary text-white hover:bg-primary-strong border-transparent";
        } else if (s === "RECEIVED_AT_BRANCH" && hasIntake) {
          nextStepTitle = "Start Processing";
          nextStepDescription = `Garments received at branch (${order.actualItemCount} items). Move order to processing to begin washing & cleaning.`;
          nextStepIcon = <Activity size={24} className="text-primary" />;
        } else if (s === "PROCESSING") {
          nextStepTitle = "Mark Ready for Delivery";
          nextStepDescription = "Garments are being cleaned. Mark them ready for delivery once finished.";
          nextStepIcon = <CheckCircle2 size={24} className="text-primary" />;
        } else if (s === "READY_FOR_DELIVERY" && !hasDeliveryRider) {
          nextStepTitle = "Assign Delivery Rider";
          nextStepDescription = "Order is ready. Assign a rider for delivery via the Delivery Trips dashboard.";
          nextStepIcon = <Truck size={24} className="text-primary" />;
          nextStepBg = "bg-primary/10 border-primary/30";
          nextStepTitleColor = "text-primary";
          nextStepIconColor = "text-primary";
          nextStepIconBg = "bg-primary/20";
          nextStepBtnClass = "bg-primary text-white hover:bg-primary-strong border-transparent";
        } else if (s === "READY_FOR_DELIVERY" && hasDeliveryRider) {
          nextStepTitle = "Ready for Dispatch";
          nextStepDescription = `Rider ${deliveryRider?.displayName ?? "assigned"} is assigned to delivery trip. Dispatch when ready.`;
          nextStepIcon = <Bike size={24} className="text-primary" />;
        } else if (s === "OUT_FOR_DELIVERY") {
          nextStepTitle = "Monitor Delivery";
          nextStepDescription = "Order is out for delivery. Await rider completion.";
          nextStepIcon = <Truck size={24} className="text-primary" />;
        } else if (s === "PICKUP_FAILED") {
          nextStepTitle = "Pickup Failed — Action Required";
          nextStepDescription = "The pickup attempt failed. Reassign a rider or reschedule the pickup.";
          nextStepIcon = <AlertTriangle size={24} className="text-rose-500" />;
          nextStepBg = "bg-rose-500/10 border-rose-500/30";
          nextStepTitleColor = "text-rose-700 dark:text-rose-400";
          nextStepIconColor = "text-rose-600";
          nextStepIconBg = "bg-rose-500/20";
          nextStepBtnClass = "bg-rose-600 text-white hover:bg-rose-700 border-transparent";
        } else if (s === "DELIVERY_FAILED") {
          nextStepTitle = "Delivery Failed — Action Required";
          nextStepDescription = "The delivery attempt failed. Manage re-delivery in the Delivery Trips dashboard.";
          nextStepIcon = <AlertTriangle size={24} className="text-rose-500" />;
          nextStepBg = "bg-rose-500/10 border-rose-500/30";
          nextStepTitleColor = "text-rose-700 dark:text-rose-400";
          nextStepIconColor = "text-rose-600";
          nextStepIconBg = "bg-rose-500/20";
          nextStepBtnClass = "bg-rose-600 text-white hover:bg-rose-700 border-transparent";
        } else if (s === "COMPLETED" || s === "DELIVERED") {
          return (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 flex items-center justify-between gap-4 mb-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-0.5">FULFILLMENT COMPLETE</p>
                  <p className="font-bold text-lg text-emerald-800 dark:text-emerald-300">
                    {s === "DELIVERED" ? "Delivered to Customer" : "Order Completed"}
                  </p>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    All items processed and delivered. No pending tasks for this order.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadInvoice}
                disabled={isDownloadingInvoice}
                className="gap-2 font-bold shrink-0"
              >
                <Download size={14} /> Download Invoice
              </Button>
            </div>
          );
        } else if (s === "CANCELLED") {
          return (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 flex items-center gap-4 mb-6 shadow-sm">
              <div className="h-11 w-11 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                <X size={24} className="text-rose-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 dark:text-rose-400 mb-0.5">ORDER CANCELLED</p>
                <p className="font-bold text-lg text-rose-800 dark:text-rose-300">Order is Cancelled</p>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                  This order was cancelled. No further action is required.
                </p>
              </div>
            </div>
          );
        }

        if (s === "PENDING") {
          nextStepAction = (
            <Button
              onClick={() =>
                handleActionClick(
                  "Confirm Order",
                  "This will mark the order as confirmed and allow assigning riders or operators.",
                  () =>
                    startTransition(async () => {
                      await mutate(
                        `/admin/orders/${order.id}/status`,
                        "PATCH",
                        { status: "CONFIRMED" },
                        "Order confirmed successfully.",
                      );
                    }),
                )
              }
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Confirm Order →
            </Button>
          );
        } else if (s === "CONFIRMED" && isPickupDelivery && !hasPickupRider) {
          nextStepAction = (
            <Button
              onClick={() => openModal("pickupRider")}
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Assign Pickup Rider →
            </Button>
          );
        } else if (s === "CONFIRMED" && isPickupDelivery && hasPickupRider) {
          nextStepAction = (
            <Button
              onClick={() => openModal("pickupRider")}
              variant="secondary"
              size="sm"
              disabled={isPending}
              className="gap-2 font-semibold"
            >
              Reassign Rider →
            </Button>
          );
        } else if (s === "CONFIRMED" && isAtHome && !hasOperator) {
          nextStepAction = (
            <Button
              onClick={() => openModal("operator")}
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Assign Professional →
            </Button>
          );
        } else if (s === "CONFIRMED" && isAtHome && hasOperator) {
          nextStepAction = (
            <Button
              onClick={() => openModal("operator")}
              variant="secondary"
              size="sm"
              disabled={isPending}
              className="gap-2 font-semibold"
            >
              Reassign Professional →
            </Button>
          );
        } else if (s === "IN_PROGRESS" && isAtHome) {
          if (
            order.fulfillment?.assignmentState === "PROOF_SUBMITTED" ||
            order.fulfillment?.assignmentState === "COMPLETED"
          ) {
            if (isPaid || order.paymentStatus === "COD_COLLECTED") {
              nextStepAction = (
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Complete Service Order",
                      "This will finalize and complete this at-home service order.",
                      () =>
                        startTransition(() =>
                          mutate(
                            `/admin/orders/${order.id}/status`,
                            "PATCH",
                            { status: "COMPLETED" },
                            "At-home order marked as completed.",
                          ),
                        ),
                    )
                  }
                  disabled={isPending}
                  className={`gap-2 font-bold ${nextStepBtnClass}`}
                >
                  Complete Order →
                </Button>
              );
            } else {
              nextStepAction = (
                <Button
                  onClick={() => openModal("payment")}
                  disabled={isPending}
                  className={`gap-2 font-bold ${nextStepBtnClass}`}
                >
                  Update Payment to Complete →
                </Button>
              );
            }
          } else {
            nextStepAction = (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => openModal("operator")}
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  className="gap-2 font-semibold"
                >
                  Reassign Professional
                </Button>
                <Button
                  onClick={() =>
                    handleActionClick(
                      "Complete Service Order",
                      "Manually complete this at-home service order.",
                      () =>
                        startTransition(() =>
                          mutate(
                            `/admin/orders/${order.id}/status`,
                            "PATCH",
                            { status: "COMPLETED" },
                            "At-home order marked as completed.",
                          ),
                        ),
                    )
                  }
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  className="gap-2 font-semibold"
                >
                  Complete Order
                </Button>
              </div>
            );
          }
        } else if (s === "IN_PROGRESS" && isPickupDelivery && !hasIntake) {
          nextStepAction = (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => openModal("intake")}
                disabled={isPending}
                className={`gap-2 font-bold ${nextStepBtnClass}`}
              >
                Start Intake →
              </Button>
              <Button
                onClick={() =>
                  handleActionClick(
                    "Receive at Branch",
                    "Confirm garments have arrived at the branch facility.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "RECEIVED_AT_BRANCH" },
                          "Order marked as received at branch.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                variant="secondary"
                size="sm"
                className="gap-2 font-semibold"
              >
                Receive at Branch →
              </Button>
            </div>
          );
        } else if (s === "IN_PROGRESS" && isPickupDelivery && hasIntake) {
          nextStepAction = (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() =>
                  handleActionClick(
                    "Receive at Branch",
                    "Confirm garments have arrived at the branch facility.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "RECEIVED_AT_BRANCH" },
                          "Order marked as received at branch.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                className={`gap-2 font-bold ${nextStepBtnClass}`}
              >
                Receive at Branch →
              </Button>
              <Button
                onClick={() =>
                  handleActionClick(
                    "Start Processing",
                    "Move order directly to PROCESSING status.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "PROCESSING" },
                          "Order moved to processing.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                variant="secondary"
                size="sm"
                className="gap-2 font-semibold"
              >
                Start Processing →
              </Button>
              <Button
                onClick={() => openModal("intake")}
                disabled={isPending}
                variant="secondary"
                size="sm"
                className="gap-2 font-semibold text-xs"
              >
                Edit Intake ({order.actualItemCount})
              </Button>
            </div>
          );
        } else if (s === "RECEIVED_AT_BRANCH" && !hasIntake) {
          nextStepAction = (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => openModal("intake")}
                disabled={isPending}
                className={`gap-2 font-bold ${nextStepBtnClass}`}
              >
                Start Intake →
              </Button>
              <Button
                onClick={() =>
                  handleActionClick(
                    "Start Processing",
                    "Move this order to active PROCESSING status.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "PROCESSING" },
                          "Order moved to processing.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                variant="secondary"
                size="sm"
                className="gap-2 font-semibold"
              >
                Start Processing →
              </Button>
            </div>
          );
        } else if (s === "RECEIVED_AT_BRANCH" && hasIntake) {
          nextStepAction = (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() =>
                  handleActionClick(
                    "Start Processing",
                    "Move this order to active PROCESSING status.",
                    () =>
                      startTransition(() =>
                        mutate(
                          `/admin/orders/${order.id}/status`,
                          "PATCH",
                          { status: "PROCESSING" },
                          "Order moved to processing.",
                        ),
                      ),
                  )
                }
                disabled={isPending}
                className={`gap-2 font-bold ${nextStepBtnClass}`}
              >
                Start Processing →
              </Button>
              <Button
                onClick={() => openModal("intake")}
                disabled={isPending}
                variant="secondary"
                size="sm"
                className="gap-2 font-semibold text-xs"
              >
                Edit Intake ({order.actualItemCount})
              </Button>
            </div>
          );
        } else if (s === "PROCESSING") {
          nextStepAction = (
            <Button
              onClick={() =>
                handleActionClick(
                  "Ready for Delivery",
                  "Mark this order as ready for delivery assignment.",
                  () =>
                    startTransition(() =>
                      mutate(
                        `/admin/orders/${order.id}/status`,
                        "PATCH",
                        { status: "READY_FOR_DELIVERY" },
                        "Order is ready for delivery.",
                      ),
                    ),
                )
              }
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Mark Ready →
            </Button>
          );
        } else if (s === "READY_FOR_DELIVERY" && !hasDeliveryRider) {
          nextStepAction = (
            <Button
              onClick={() => openModal("delivery")}
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Assign Delivery →
            </Button>
          );
        } else if (s === "READY_FOR_DELIVERY" && hasDeliveryRider) {
          nextStepAction = (
            <Button
              onClick={() => openModal("delivery")}
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Manage Trip / Dispatch →
            </Button>
          );
        } else if (s === "OUT_FOR_DELIVERY") {
          nextStepAction = (
            <Button
              onClick={() =>
                handleActionClick(
                  "Complete Delivery",
                  "Confirm that the order has been successfully delivered to the customer.",
                  () =>
                    startTransition(() =>
                      mutate(
                        `/admin/orders/${order.id}/status`,
                        "PATCH",
                        { status: "DELIVERED" },
                        "Delivery completed successfully.",
                      ),
                    ),
                )
              }
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Complete Delivery →
            </Button>
          );
        } else if (s === "PICKUP_FAILED") {
          nextStepAction = (
            <Button
              onClick={() => openModal("pickupRider")}
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Reassign Pickup Rider →
            </Button>
          );
        } else if (s === "DELIVERY_FAILED") {
          nextStepAction = (
            <Button
              onClick={() => openModal("delivery")}
              disabled={isPending}
              className={`gap-2 font-bold ${nextStepBtnClass}`}
            >
              Schedule Re-Delivery →
            </Button>
          );
        }

        if (!nextStepTitle) return null;

        return (
          <div
            className={`border rounded-2xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-5 relative overflow-hidden mb-6 shadow-sm ${nextStepBg}`}
          >
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/2 ${nextStepIconBg}`}></div>
            <div className="flex items-center gap-4">
              <div className={`p-3.5 rounded-full shrink-0 ${nextStepIconBg}`}>
                {nextStepIcon}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${nextStepIconColor}`}>
                  NEXT ACTION
                </p>
                <p className={`font-bold text-xl ${nextStepTitleColor}`}>
                  {nextStepTitle}
                </p>
                <p className={`text-sm mt-0.5 opacity-85 ${nextStepTitleColor}`}>
                  {nextStepDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-black/10 dark:border-white/10 md:pl-6 pt-4 md:pt-0">
              <div>
                <p className={`text-[10px] uppercase tracking-wider mb-0.5 opacity-70 ${nextStepTitleColor}`}>
                  Your Role
                </p>
                <p className={`font-semibold text-sm ${nextStepTitleColor}`}>
                  {getCurrentResponsibility(order)}
                </p>
              </div>
              {nextStepAction}
            </div>
          </div>
        );
      })()}

      {/* ── Operational Progress Timeline ── */}
      <div className="py-2 px-2 mb-6 overflow-x-auto thin-scrollbar">
        <div className="flex items-center min-w-[700px] relative">
          <div className="absolute top-3 left-10 right-10 h-[2px] bg-[var(--border-soft)] -z-10" />
          {timelineStatuses.map((code, idx) => {
            const done =
              (statusIndex > idx || (isTerminal && order.status !== "CANCELLED")) &&
              order.status !== "CANCELLED";
            const current = order.status === code;

            if (order.status === "CANCELLED" && code === "CANCELLED") {
              return (
                <div key={code} className="flex flex-col items-center flex-1 relative">
                  <div className="h-6 w-6 rounded-full bg-danger z-10 flex items-center justify-center shadow-md">
                    <X size={14} className="text-white font-bold" />
                  </div>
                  <p className="text-[11px] font-bold text-danger mt-2 text-center">
                    Cancelled
                  </p>
                </div>
              );
            }

            return (
              <div key={code} className="flex flex-col items-center flex-1 relative group">
                {idx !== 0 && (
                  <div
                    className={`absolute top-3 left-[-50%] w-full h-[2px] -z-10 transition-colors ${done || current ? "bg-primary" : "bg-transparent"
                      }`}
                  />
                )}
                <div
                  className={`h-6 w-6 rounded-full border-2 z-10 flex items-center justify-center transition-all duration-300 ${current
                      ? "border-primary bg-primary ring-4 ring-primary/20 shadow-md scale-110"
                      : done
                        ? "border-primary bg-primary"
                        : "border-[var(--border-soft)] bg-surface"
                    }`}
                >
                  {(done || current) && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <p
                  className={`text-[11px] mt-2 text-center transition-colors max-w-[90px] leading-tight ${current
                      ? "font-bold text-primary"
                      : done
                        ? "font-medium text-foreground"
                        : "text-text-muted"
                    }`}
                >
                  {orderStatusLabel(code, order.serviceMode)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summary Cards (4-Column Grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Customer */}
        <Card className="p-4 flex items-center justify-between border-[var(--border-soft)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-full text-primary shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                CUSTOMER
              </p>
              <p
                className="font-semibold text-sm text-foreground truncate max-w-[120px]"
                title={order.contactSnapshot?.fullName}
              >
                {order.contactSnapshot?.fullName ?? "—"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {order.contactSnapshot?.phoneNumber ?? "No phone"}
              </p>
            </div>
          </div>
          <a
            href={order.contactSnapshot?.phoneNumber ? `tel:${order.contactSnapshot?.phoneNumber}` : "#"}
            className="p-2 border border-[var(--border-soft)] rounded-xl hover:bg-surface-muted transition-colors shrink-0 text-text-muted hover:text-foreground"
            title="Call customer"
          >
            <PhoneCall size={16} />
          </a>
        </Card>

        {/* Service */}
        <Card className="p-4 flex items-center gap-3 border-[var(--border-soft)] shadow-sm">
          <div className="bg-primary/10 p-2.5 rounded-full text-primary shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
              SERVICE
            </p>
            <p
              className="font-semibold text-sm text-foreground truncate max-w-[150px]"
              title={order.serviceName || order.serviceCode}
            >
              {order.serviceName || order.serviceCode || "Standard"}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {order.serviceCategoryName ?? order.serviceCategoryCode}
            </p>
          </div>
        </Card>

        {/* Address */}
        <Card
          className="p-4 flex items-center justify-between border-[var(--border-soft)] shadow-sm cursor-pointer hover:border-primary/50 transition-colors group"
          onClick={() => openModal("address")}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-blue-500/10 p-2.5 rounded-full text-blue-600 shrink-0">
              <MapPin size={20} />
            </div>
            <div className="truncate">
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                ADDRESS
              </p>
              <p
                className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors"
                title={order.serviceAddressSnapshot?.line1}
              >
                {order.serviceAddressSnapshot?.line1 || "—"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5 truncate">
                {[order.serviceAddressSnapshot?.city, order.serviceAddressSnapshot?.state]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-2 border border-[var(--border-soft)] rounded-xl hover:bg-surface-muted transition-colors shrink-0 text-text-muted group-hover:text-primary pointer-events-none"
          >
            <MapIcon size={16} />
          </button>
        </Card>

        {/* Payment */}
        <Card
          className="p-4 flex items-center justify-between border-[var(--border-soft)] shadow-sm cursor-pointer hover:border-primary/50 transition-colors group"
          onClick={() => openModal("payment")}
        >
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-full text-emerald-600 shrink-0">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                PAYMENT
              </p>
              <p className="font-semibold text-sm text-foreground">
                {formatMoney(grandTotal, order.currency)}
              </p>
              <p className="text-xs mt-0.5 flex items-center gap-1">
                <span className="text-text-secondary">{humanizeToken(order.paymentMethod)}</span>
                <span className="text-text-secondary">·</span>
                <span
                  className={
                    isPaid
                      ? "text-emerald-600 font-semibold"
                      : "text-amber-600 font-semibold"
                  }
                >
                  {paymentStatusLabel(order.paymentStatus)}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-2 border border-[var(--border-soft)] rounded-xl hover:bg-surface-muted transition-colors shrink-0 text-text-muted group-hover:text-primary pointer-events-none"
          >
            <Receipt size={16} />
          </button>
        </Card>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="border-b border-[var(--border-soft)] flex overflow-x-auto thin-scrollbar mb-6">
        {[
          { id: "details", label: "Order Details" },
          { id: "assignment", label: "Assignment & Staff" },
          { id: "activity", label: "Activity Trail" },
          { id: "photos", label: `Proof Photos (${order.proofArtifacts?.length ?? 0})` },
          { id: "invoices", label: "Financials & Invoice" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            type="button"
            className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all relative ${activeTab === t.id
                ? "text-primary"
                : "text-text-secondary hover:text-foreground hover:bg-surface-muted/50"
              }`}
          >
            {t.label}
            {activeTab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(184,137,62,0.4)]" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tabs Content ── */}
      <div className="min-h-[400px]">
        {/* TAB 1: Order Details */}
        {activeTab === "details" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Items List */}
            <Card className="p-0 overflow-hidden border-[var(--border-soft)]">
              <div className="bg-surface-muted/50 px-5 py-4 border-b border-[var(--border-soft)] flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Package size={16} className="text-text-muted" /> Order Items
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-text-secondary border border-[var(--border-soft)]">
                  {order.items.length} line item{order.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              {order.items.length === 0 ? (
                <div className="p-8 text-center text-text-muted">No line items for this order.</div>
              ) : (
                <div className="divide-y divide-[var(--border-soft)] max-h-[500px] overflow-y-auto thin-scrollbar">
                  {Array.from(itemsByService.entries()).map(([svcName, items]) => (
                    <div key={svcName}>
                      <div className="bg-surface-muted/30 px-5 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 backdrop-blur">
                        {svcName}
                      </div>
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 flex items-center justify-between hover:bg-surface-muted/20 transition-colors"
                        >
                          <div className="flex gap-4 items-start">
                            <div className="h-8 w-8 rounded-lg bg-surface-muted flex items-center justify-center border border-[var(--border-soft)] shrink-0 font-semibold text-text-secondary text-sm">
                              {item.quantity}x
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {item.itemName || item.itemCode}
                              </p>
                              {Number(item.unitPrice) > 0 && Number(item.quantity) > 1 && (
                                <p className="text-xs text-text-secondary mt-0.5">
                                  {formatMoney(item.unitPrice, order.currency)} each
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="font-semibold text-sm text-foreground">
                            {formatMoney(
                              (item as any).totalPrice ??
                              Number(item.unitPrice || 0) * Number(item.quantity || 1),
                              order.currency,
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-surface-muted/50 p-4 border-t border-[var(--border-soft)] flex flex-wrap justify-between items-center text-sm font-bold">
                <div className="flex items-center gap-6">
                  <span>
                    Total Pieces:{" "}
                    <strong className="text-foreground">
                      {order.items.reduce((acc, i) => acc + Number(i.quantity), 0)}
                    </strong>
                  </span>
                  {order.actualItemCount != null && (
                    <span className="text-primary">
                      Actual Intake Count: <strong>{order.actualItemCount}</strong>
                    </span>
                  )}
                </div>
                <div className="text-foreground text-base">
                  Grand Total: {formatMoney(grandTotal, order.currency)}
                </div>
              </div>
            </Card>

            {/* 3 Information Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <Card className="p-0 overflow-hidden border-[var(--border-soft)] shadow-sm">
                <div className="bg-surface-muted/50 px-5 py-3 border-b border-[var(--border-soft)]">
                  <p className="text-xs font-bold tracking-wider text-text-muted uppercase">
                    Basic Information
                  </p>
                </div>
                <div className="p-5 space-y-3.5 text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-text-secondary">Order ID</div>
                    <div className="col-span-2 font-medium flex justify-between items-center text-foreground">
                      {orderLabel(order)}
                      <button
                        className="text-text-muted hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(orderLabel(order));
                          toast.success("Order ID copied");
                        }}
                        type="button"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-text-secondary">Category</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {order.serviceCategoryName ?? order.serviceCategoryCode}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-text-secondary">Service</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {order.serviceName || "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-text-secondary">Booking Type</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {humanizeToken(order.bookingType)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-text-secondary">Status</div>
                    <div className="col-span-2">
                      <Badge tone={order.status === "COMPLETED" || order.status === "DELIVERED" ? "success" : "muted"}>
                        {orderStatusLabel(order.status, order.serviceMode)}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-text-secondary">Created At</div>
                    <div className="col-span-2 font-medium text-foreground">
                      {formatDateTime(order.createdAt)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-text-secondary">Branch</div>
                    <div className="col-span-2 font-medium text-foreground">{branchName}</div>
                  </div>
                </div>
              </Card>

              {/* Schedule & Operational */}
              <Card className="p-0 overflow-hidden border-[var(--border-soft)] shadow-sm">
                <div className="bg-surface-muted/50 px-5 py-3 border-b border-[var(--border-soft)] flex items-center gap-2">
                  <Clock size={14} className="text-text-muted" />
                  <p className="text-xs font-bold tracking-wider text-text-muted uppercase">
                    Schedule & Timing
                  </p>
                </div>
                <div className="p-5 space-y-3.5 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-text-secondary">Scheduled Date</div>
                    <div className="font-medium text-foreground">
                      {formatDateTime(order.scheduledDate) || "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-text-secondary">
                      {serviceMode === "AT_HOME" ? "Service Slot" : "Pickup Slot"}
                    </div>
                    <div className="font-medium text-foreground">
                      {scheduledSlotLabel(order.scheduledSlotCode) || "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-text-secondary">
                      {serviceMode === "AT_HOME" ? "Operator Reached" : "Pickup Completed"}
                    </div>
                    <div className="font-medium text-foreground">
                      {operatorReachedAt ? formatTime(operatorReachedAt) : "Pending"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-text-secondary">
                      {serviceMode === "AT_HOME"
                        ? isOrderCompleted
                          ? "Work Completed At"
                          : "Target Arrival"
                        : isOrderCompleted
                          ? "Delivered At"
                          : "Target Delivery"}
                    </div>
                    <div className="font-medium text-foreground">
                      {workCompletedAt
                        ? formatTime(workCompletedAt)
                        : order.promisedArrivalTo
                          ? formatTime(order.promisedArrivalTo)
                          : "Standard Window"}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted pt-2 border-t border-[var(--border-soft)]">
                    {order.bookingType === "ASAP"
                      ? "⚡ Express arrival promise order"
                      : "📅 Scheduled booking window"}
                  </p>
                </div>
              </Card>

              {/* Notes & Blockers */}
              <Card className="p-0 overflow-hidden border-[var(--border-soft)] shadow-sm h-full">
                <div className="bg-surface-muted/50 px-5 py-3 border-b border-[var(--border-soft)] flex items-center gap-2">
                  <Info size={14} className="text-text-muted" />
                  <p className="text-xs font-bold tracking-wider text-text-muted uppercase">
                    Notes & Blockers
                  </p>
                </div>
                <div className="p-5 space-y-4 text-sm">
                  <div>
                    <p className="text-text-secondary mb-1.5 text-xs font-semibold uppercase tracking-wider">
                      Customer Notes
                    </p>
                    <div className="p-3 bg-surface-muted rounded-xl text-sm border border-[var(--border-soft)]">
                      {(order as any).customerNotes || (
                        <span className="opacity-50 italic">No notes provided</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-text-secondary mb-1.5 text-xs font-semibold uppercase tracking-wider">
                      Internal Notes
                    </p>
                    <div className="p-3 bg-primary/5 rounded-xl text-sm border border-primary/20">
                      {(order as any).internalNotes || (
                        <span className="opacity-50 italic">No internal notes</span>
                      )}
                    </div>
                  </div>

                  {blockers.length > 0 && (
                    <div>
                      <p className="text-rose-600 mb-1.5 text-xs font-semibold uppercase tracking-wider">
                        Active Blockers
                      </p>
                      <div className="space-y-1.5">
                        {blockers.map((b: string) => (
                          <div
                            key={b}
                            className="p-2.5 bg-danger/10 text-danger rounded-xl text-xs flex gap-2"
                          >
                            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                            <span className="font-semibold">{humanizeBlocker(b)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: Assignment & Staff */}
        {activeTab === "assignment" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Express Delivery Target Card (if ASAP) */}
            {order.bookingType === "ASAP" && (
              <Card className="space-y-3 bg-primary/5 border-primary/30">
                {(() => {
                  const promise = deliveryPromiseInfo(order);
                  const isPickupDone = isLaundry && Boolean(order.pickupCompletedAt);

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Zap size={18} className="text-primary" />{" "}
                          {isOrderCompleted
                            ? isLaundry
                              ? "Order Delivered"
                              : "Work Completed"
                            : isLaundry
                              ? isPickupDone
                                ? "Express Pickup Completed"
                                : "Express Pickup Target"
                              : "Service Arrival Target"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${promise.badgeClass}`}
                        >
                          {promise.statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {isOrderCompleted
                          ? isLaundry
                            ? "Order has been professionally cleaned and delivered to the customer."
                            : "Service has been completed on-site."
                          : isLaundry
                            ? isPickupDone
                              ? "✓ Pickup completed within the 2-hour arrival promise. Clothes are being cleaned at our facility."
                              : "ℹ️ 2-hour arrival promise is strictly for pickup. Rider will arrive to collect garments."
                            : "ℹ️ Estimated Arrival Time represents operator journey to customer premises."}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 items-center">
                        <div>
                          <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider mb-1">
                            Time Placed
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {formatTime(order.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider mb-1">
                            {isLaundry
                              ? order.pickupCompletedAt
                                ? "Pickup Completed"
                                : "Rider Arrival"
                              : "Operator Reached"}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {isLaundry && order.pickupCompletedAt
                              ? formatTime(order.pickupCompletedAt)
                              : operatorReachedAt
                                ? formatTime(operatorReachedAt)
                                : "Pending Pickup"}
                          </p>
                        </div>
                        <div
                          className={`md:col-span-2 p-3 rounded-xl border shadow-sm ${isLaundry && isPickupDone && !isOrderCompleted
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                              : "bg-primary/10 border-primary/20 text-foreground"
                            }`}
                        >
                          {isLaundry ? (
                            isOrderCompleted ? (
                              <>
                                <p className="text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 size={14} /> Delivered At
                                </p>
                                <p className="text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                                  {workCompletedAt ? formatTime(workCompletedAt) : "Completed"}
                                </p>
                              </>
                            ) : isPickupDone ? (
                              <>
                                <p className="text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                  <Truck size={14} /> Delivery: Handled with Care
                                </p>
                                <p className="text-sm font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
                                  Processed at branch · Delivered fresh once ready
                                </p>
                                <p className="text-[11px] font-medium opacity-80 mt-0.5 text-emerald-700 dark:text-emerald-400">
                                  Garments receive thorough care and quality inspection. Dispatched fresh without rushed deadlines.
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-2 text-primary">
                                  <Clock size={14} /> Express Pickup Target End
                                </p>
                                <p className="text-xl font-black tracking-tight text-foreground">
                                  {formatTime(order.promisedArrivalTo)}
                                </p>
                                <p className="text-[11px] font-medium opacity-80 mt-0.5 text-text-secondary">
                                  2-hr promise for pickup arrival · Delivery scheduled upon cleaning
                                </p>
                              </>
                            )
                          ) : (
                            <>
                              <p className="text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-2 text-primary">
                                <Clock size={14} />{" "}
                                {isOrderCompleted ? "Work Completed At" : "Target Arrival"}
                              </p>
                              <p className="text-xl font-black tracking-tight text-foreground">
                                {isOrderCompleted && workCompletedAt
                                  ? formatTime(workCompletedAt)
                                  : formatTime(order.promisedArrivalTo)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </Card>
            )}

            {/* Staff Cards List */}
            <div className="max-w-3xl">
              <Card className="p-0 overflow-hidden border-[var(--border-soft)]">
                <div className="bg-surface-muted/50 px-5 py-4 border-b border-[var(--border-soft)] flex justify-between items-center">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Users size={16} className="text-text-muted" />
                    {serviceMode === "PICKUP_DELIVERY"
                      ? "Rider Assignment"
                      : "Service Professional Assignment"}
                  </h3>
                </div>

                <div className="divide-y divide-[var(--border-soft)]">
                  {/* Operator - strictly for AT_HOME */}
                  {serviceMode === "AT_HOME" && (
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <UserCheck size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
                              Service Professional
                            </p>
                            {order.fulfillment?.assignmentState &&
                              order.fulfillment?.assignmentState !== "UNASSIGNED" && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                                  {humanizeToken(order.fulfillment.assignmentState)}
                                </span>
                              )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {assignedOperator?.displayName || "Not assigned"}
                            </p>
                            {assignedOperator?.isDeleted && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                Former Staff
                              </span>
                            )}
                          </div>
                          {assignedOperator?.phoneNumber && (
                            <p className="text-xs text-text-secondary mt-0.5">
                              {assignedOperator.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignedOperator?.phoneNumber && (
                          <a
                            href={`tel:${assignedOperator.phoneNumber}`}
                            className="p-2 border border-[var(--border-soft)] rounded-xl hover:bg-surface-muted transition-colors text-text-muted hover:text-foreground"
                            title="Call operator"
                          >
                            <PhoneCall size={16} />
                          </a>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openModal("operator")}
                        >
                          {assignedOperator && !assignedOperator.isDeleted ? "Reassign" : "Assign Professional"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Pickup Rider - strictly for PICKUP_DELIVERY */}
                  {serviceMode === "PICKUP_DELIVERY" && (
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Truck size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
                            Pickup Rider
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {pickupRider?.displayName || "Not assigned"}
                            </p>
                            {pickupRider?.isDeleted && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                Former Rider
                              </span>
                            )}
                          </div>
                          {pickupRider?.phoneNumber && (
                            <p className="text-xs text-text-secondary mt-0.5">
                              {pickupRider.phoneNumber}
                            </p>
                          )}
                          {order.pickupCompletedAt && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                              <CheckCircle2 size={13} /> Picked up at{" "}
                              {formatDateTime(order.pickupCompletedAt)} (
                              {order.actualItemCount ?? order.items?.length ?? 0} items)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pickupRider?.phoneNumber && (
                          <a
                            href={`tel:${pickupRider.phoneNumber}`}
                            className="p-2 border border-[var(--border-soft)] rounded-xl hover:bg-surface-muted transition-colors text-text-muted hover:text-foreground"
                            title="Call pickup rider"
                          >
                            <PhoneCall size={16} />
                          </a>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openModal("pickupRider")}
                        >
                          {pickupRider && !pickupRider.isDeleted ? "Reassign Rider" : "Assign Pickup Rider"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Delivery Rider - strictly for PICKUP_DELIVERY */}
                  {serviceMode === "PICKUP_DELIVERY" && (
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <Bike size={20} />
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
                            Delivery Rider
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {deliveryRider?.displayName || "Not assigned"}
                            </p>
                            {deliveryRider?.isDeleted && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                Former Rider
                              </span>
                            )}
                          </div>
                          {deliveryRider?.phoneNumber && (
                            <p className="text-xs text-text-secondary mt-0.5">
                              {deliveryRider.phoneNumber}
                            </p>
                          )}
                          {(order.status === "DELIVERED" || order.status === "COMPLETED") && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                              <CheckCircle2 size={13} /> Delivered
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deliveryRider?.phoneNumber && (
                          <a
                            href={`tel:${deliveryRider.phoneNumber}`}
                            className="p-2 border border-[var(--border-soft)] rounded-xl hover:bg-surface-muted transition-colors text-text-muted hover:text-foreground"
                            title="Call delivery rider"
                          >
                            <PhoneCall size={16} />
                          </a>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openModal("delivery")}
                        >
                          {deliveryRider ? "Manage Trip" : "Assign Delivery"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: Activity Trail */}
        {activeTab === "activity" && (
          <div className="animate-in fade-in duration-300 max-w-3xl">
            <Card className="p-6">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                <Activity size={16} className="text-text-muted" /> Status History & Audit Trail
              </h3>
              <div className="space-y-6">
                {order.statusEvents && order.statusEvents.length > 0 ? (
                  order.statusEvents.map((h: any, i: number) => (
                    <div key={i} className="flex gap-4 relative">
                      {i !== (order.statusEvents?.length ?? 0) - 1 && (
                        <div className="absolute top-6 left-3 bottom-[-24px] w-px bg-[var(--border-soft)]"></div>
                      )}
                      <div className="w-6 h-6 rounded-full bg-surface-muted border border-[var(--border-soft)] flex items-center justify-center shrink-0 z-10 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {orderStatusLabel(h.toStatus || h.status, order.serviceMode)}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {formatDateTime(h.createdAt || h.timestamp)}
                        </p>
                        {(h.note || h.reason) && (
                          <p className="text-xs mt-2 text-text-secondary bg-surface-muted px-3 py-1.5 rounded-lg border border-[var(--border-soft)] italic">
                            "{h.note || h.reason}"
                          </p>
                        )}
                        {(h.actorType || h.updatedBy) && (
                          <p className="text-[11px] text-text-muted mt-1.5">
                            By: {h.actorType || h.updatedBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted text-center py-6">
                    No status events recorded yet.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: Proof Photos */}
        {activeTab === "photos" && (
          <div className="animate-in fade-in duration-300">
            <Card className="p-0 overflow-hidden border-[var(--border-soft)]">
              <div className="bg-surface-muted/50 px-5 py-4 border-b border-[var(--border-soft)] flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Camera size={16} className="text-text-muted" /> Proof Photos
                </h3>
                {order.proofArtifacts && order.proofArtifacts.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-text-secondary border border-[var(--border-soft)]">
                    {order.proofArtifacts.length} photo{order.proofArtifacts.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="p-5">
                {order.proofArtifacts && order.proofArtifacts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {order.proofArtifacts.map((proof, i) => {
                      const imgUrl = proof.assetUrl || `/api/assets/${proof.storageKey}`;
                      return (
                        <div
                          key={proof.id || i}
                          className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--border-soft)] shadow-sm bg-surface-muted cursor-zoom-in"
                          onClick={() => setSelectedProofUrl(imgUrl)}
                        >
                          <img
                            src={imgUrl}
                            alt={`Proof ${i}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90"></div>
                          <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/50 px-2 py-0.5 rounded backdrop-blur self-start">
                              {proof.type === "BEFORE"
                                ? serviceMode === "AT_HOME"
                                  ? "Inspection (Before)"
                                  : "Pickup Proof"
                                : proof.type === "AFTER"
                                  ? serviceMode === "AT_HOME"
                                    ? "Completion (After)"
                                    : "Completion Proof"
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
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center text-text-muted mb-4 border border-[var(--border-soft)]">
                      <Camera size={24} />
                    </div>
                    <p className="text-foreground font-semibold">No photos uploaded</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Inspection and delivery proof photos will appear here once submitted by staff.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 5: Invoices & Financials */}
        {activeTab === "invoices" && (
          <div className="animate-in fade-in duration-300 max-w-3xl">
            <Card className="p-0 overflow-hidden border-[var(--border-soft)]">
              <div className="bg-surface-muted/50 px-5 py-4 border-b border-[var(--border-soft)] flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Receipt size={16} className="text-text-muted" /> Financial Breakdown
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-text-secondary border border-[var(--border-soft)]">
                  GST 18% Included
                </span>
              </div>
              <div className="p-6 space-y-4">
                {/* Itemized List */}
                <div className="space-y-3 pb-4 border-b border-[var(--border-soft)]">
                  {Array.from(itemsByService.entries()).map(([svcName, items]) => (
                    <div key={svcName} className="space-y-2">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {svcName}
                      </p>
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-sm">
                          <div>
                            <span className="font-medium text-foreground">{item.quantity}x</span>{" "}
                            <span className="text-foreground">{item.itemName || item.itemCode}</span>
                            {Number(item.unitPrice) > 0 && Number(item.quantity) > 1 && (
                              <p className="text-xs text-text-secondary mt-0.5">
                                {formatMoney(item.unitPrice, order.currency)} each
                              </p>
                            )}
                          </div>
                          <span className="font-medium text-foreground">
                            {formatMoney(
                              (item as any).totalPrice ??
                              Number(item.unitPrice || 0) * Number(item.quantity || 1),
                              order.currency,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-sm text-text-secondary pt-2">
                  <span>Subtotal (Base Items)</span>
                  <span>{formatMoney(subtotal, order.currency)}</span>
                </div>

                {parseFloat(String(addOnTotal || "0")) > 0 && (
                  <div className="flex justify-between items-center text-sm text-text-secondary">
                    <span>Add-ons</span>
                    <span>+{formatMoney(addOnTotal, order.currency)}</span>
                  </div>
                )}

                {parseFloat(String(discountAmount || "0")) > 0 && (
                  <div className="flex justify-between items-center text-sm text-primary font-medium">
                    <span>Discount</span>
                    <span>-{formatMoney(discountAmount, order.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-text-secondary">
                  <span>GST (18%)</span>
                  <span>+{formatMoney(taxAmount, order.currency)}</span>
                </div>

                {numExpress > 0 && (
                  <div className="flex justify-between items-center text-sm text-primary font-medium">
                    <span>⚡ Express Arrival Promise Fee</span>
                    <span>+{formatMoney(String(numExpress), order.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center font-bold text-lg pt-3 border-t border-[var(--border-soft)] text-foreground">
                  <span>Total Amount</span>
                  <span>{formatMoney(grandTotal, order.currency)}</span>
                </div>

                {/* Tax Invoice Download Box */}
                <div className="pt-6 mt-6 border-t border-[var(--border-soft)]">
                  <div className="flex items-center justify-between p-4 bg-surface-muted rounded-2xl border border-[var(--border-soft)]">
                    <div className="flex items-center gap-3">
                      <Receipt className="text-text-muted" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">Tax Invoice</p>
                        <p className="text-xs text-text-secondary">
                          Official tax invoice for Order #{orderLabel(order)}.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleDownloadInvoice}
                      disabled={!isPaid || isDownloadingInvoice}
                      variant="secondary"
                      size="sm"
                      className="font-semibold"
                    >
                      {isDownloadingInvoice ? "Downloading..." : "Download PDF"}
                    </Button>
                  </div>
                  {!isPaid && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                      <Info size={13} /> Official tax invoice will be generated once payment is completed.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Photo Proof Fullscreen Zoom Lightbox ── */}
      {selectedProofUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedProofUrl(null)}
        >
          <div
            role="dialog"
            className="relative max-w-4xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden shadow-2xl p-2 border border-[var(--border-soft)] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProofUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-md"
              title="Close image preview"
              type="button"
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
            className="w-full max-w-sm bg-surface border border-[var(--border-soft)] rounded-[24px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          >
            <h2 className="text-lg font-bold text-foreground">{confirmAction.title}?</h2>
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

      {/* ── Individual Action Modals ── */}

      {/* Assign Operator Modal */}
      <Modal
        isOpen={modals.operator}
        onClose={() => closeModal("operator")}
        title="Assign Service Professional"
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
                  assignedOperatorAuthUserId: formData.get("assignedOperatorAuthUserId"),
                  note: formData.get("note"),
                  forceOverride: formData.get("forceOverride") === "on",
                  overrideReason: formData.get("overrideReason"),
                },
                "Service professional assigned successfully.",
              ),
            );
          }}
        >
          <div className="space-y-4">
            <Select
              label="Select Service Professional"
              name="assignedOperatorAuthUserId"
              defaultValue={order.assignedOperatorAuthUserId ?? ""}
            >
              <option value="">Select professional...</option>
              {sameBranchStaff(effectiveOperators, order, "OPERATOR").map((operator) => (
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
              Force assign even if conflicting with other slots
            </label>
            <Field label="Override Reason" name="overrideReason" />
          </div>
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => closeModal("operator")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Pickup Rider Modal */}
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
            {sameBranchStaff(effectiveOperators, order, "RIDER").map((rider) => (
              <option key={rider.authUserId} value={rider.authUserId}>
                {rider.displayName}
              </option>
            ))}
          </Select>
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => closeModal("pickupRider")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Assign Rider
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delivery Trip Modal */}
      <Modal
        isOpen={modals.delivery}
        onClose={() => closeModal("delivery")}
        title="Delivery Dispatch"
      >
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck size={32} className="text-primary" />
          </div>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            Delivery assignment is managed centrally via the <strong>Delivery Trips</strong> dashboard to optimize routes and scheduling.
          </p>
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-center gap-3">
            <Button variant="ghost" onClick={() => closeModal("delivery")}>
              Cancel
            </Button>
            <Button onClick={() => (window.location.href = "/delivery-trips")}>
              Go to Delivery Trips
            </Button>
          </div>
        </div>
      </Modal>

      {/* Laundry Intake Modal */}
      <Modal
        isOpen={modals.intake}
        onClose={() => closeModal("intake")}
        title="Record Laundry Intake"
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
                  continueWithMismatch: formData.get("continueWithMismatch") === "on",
                  note: formData.get("note"),
                },
                "Laundry intake recorded successfully.",
              ),
            );
          }}
        >
          <div className="bg-surface-muted p-4 rounded-xl border border-[var(--border-soft)] mb-4 flex justify-between items-center">
            <span className="text-sm font-medium text-text-secondary">Expected Items</span>
            <span className="text-lg font-bold text-foreground">
              {order.expectedItemCount ?? order.items.reduce((acc, i) => acc + Number(i.quantity), 0)}
            </span>
          </div>

          <Field
            label="Actual item count"
            name="actualItemCount"
            type="number"
            defaultValue={
              order.actualItemCount ??
              order.expectedItemCount ??
              order.items.reduce((acc, i) => acc + Number(i.quantity), 0)
            }
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
            <Button variant="ghost" type="button" onClick={() => closeModal("intake")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Record Intake
            </Button>
          </div>
        </form>
      </Modal>

      {/* Override Status Modal */}
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
          <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl mb-4">
            <p className="text-xs text-foreground font-medium">
              Warning: Manually overriding status may bypass normal workflow steps. Use with caution.
            </p>
          </div>
          <Select label="Order status" name="status" defaultValue={order.status}>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabel(status, order.serviceMode)}
              </option>
            ))}
          </Select>
          <TextArea label="Reason for override" name="note" required />
          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => closeModal("status")}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={isPending}>
              Force Update Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Payment Modal */}
      <Modal
        isOpen={modals.payment}
        onClose={() => closeModal("payment")}
        title="Update Payment Details"
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
            <Button variant="ghost" type="button" onClick={() => closeModal("payment")}>
              Cancel
            </Button>
            {order.paymentMethod === "COD" && order.paymentStatus !== "COD_COLLECTED" && (
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
            )}
            <Button type="submit" disabled={isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
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
            Force reschedule (ignore existing staff schedules)
          </label>
          <Field label="Reason for override" name="overrideReason" />

          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3 mt-4">
            <Button variant="ghost" type="button" onClick={() => closeModal("reschedule")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              Confirm Reschedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Address Modal */}
      <Modal
        isOpen={modals.address}
        onClose={() => closeModal("address")}
        title="Service Address Details"
      >
        {order.serviceAddressSnapshot ? (
          <div className="space-y-4">
            <div className="bg-surface-muted p-4 rounded-2xl border border-[var(--border-soft)]">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
                Full Address
              </p>
              <p className="font-semibold text-foreground text-sm">
                {order.serviceAddressSnapshot.line1}
              </p>
              {order.serviceAddressSnapshot.line2 && (
                <p className="text-foreground text-sm mt-1">
                  {order.serviceAddressSnapshot.line2}
                </p>
              )}
              <p className="text-text-secondary text-sm mt-1">
                {[
                  order.serviceAddressSnapshot.city,
                  order.serviceAddressSnapshot.state,
                  order.serviceAddressSnapshot.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {order.serviceAddressSnapshot.country && (
                <p className="text-text-secondary text-sm mt-1">
                  {order.serviceAddressSnapshot.country}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                className="w-full gap-2 font-bold"
                onClick={() => {
                  const addressString = [
                    order.serviceAddressSnapshot?.line1,
                    order.serviceAddressSnapshot?.line2,
                    order.serviceAddressSnapshot?.city,
                    order.serviceAddressSnapshot?.state,
                    order.serviceAddressSnapshot?.postalCode,
                    order.serviceAddressSnapshot?.country,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      addressString,
                    )}`,
                    "_blank",
                  );
                }}
              >
                <MapIcon size={16} />
                Open in Google Maps
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <MapPin size={32} className="mx-auto mb-3 opacity-50" />
            <p>No address information available</p>
          </div>
        )}
      </Modal>

      {/* Delete Order Confirmation Modal */}
      <Modal
        isOpen={modals.delete}
        onClose={() => closeModal("delete")}
        title="Delete Order"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to permanently delete this order?</p>
              <p className="mt-1 text-xs opacity-90">
                This will delete <strong>{orderLabel(order)}</strong> along with all associated line items, tracking history, logs, and artifacts. This action is intended for test data cleanup and cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-soft)] flex justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => closeModal("delete")}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteOrder}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
