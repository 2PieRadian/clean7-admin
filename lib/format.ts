import type {
  AssignmentState,
  OrderResponse,
  OrderStatus,
  PaymentStatus,
  ProofStatus,
  ServiceMode,
} from "@/lib/types";

export function formatMoney(value: number | string | undefined | null, currency = "INR") {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const numeric = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function humanizeToken(value?: string | null) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

/** Maps backend blocker codes to admin-friendly labels. */
const BLOCKER_LABELS: Record<string, string> = {
  payment_pending: "Payment not received",
  proof_pending: "Proof of work not submitted",
  assignment_incomplete: "Staff not assigned",
  pickup_rider_missing: "No pickup rider assigned",
  delivery_rider_missing: "No delivery rider assigned",
  intake_not_done: "Laundry intake not recorded",
  operator_missing: "Operator not assigned",
  address_missing: "Service address missing",
  slot_conflict: "Time slot conflict",
  item_count_mismatch: "Item count mismatch",
  awaiting_confirmation: "Order not yet confirmed",
};

export function humanizeBlocker(code: string): string {
  const lower = code.toLowerCase();
  return BLOCKER_LABELS[lower] ?? humanizeToken(code);
}

/** Slot codes from API → Morning / Afternoon / Evening only. */
export function scheduledSlotLabel(code: string | undefined | null) {
  if (!code) return "—";
  const map: Record<string, string> = {
    MORNING: "Morning",
    AFTERNOON: "Afternoon",
    EVENING: "Evening",
  };
  return map[code] ?? humanizeToken(code);
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "Pickup Completed",
  PICKUP_FAILED: "Pickup Failed",
  RECEIVED_AT_BRANCH: "Received at Branch",
  PROCESSING: "Currently Being Processed",
  READY_FOR_DELIVERY: "Ready for Delivery Pickup",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERY_FAILED: "Delivery Failed",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  COD_PENDING_COLLECTION: "COD pending",
  COD_COLLECTED: "COD collected",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? humanizeToken(status);
}

export function orderFulfillmentSurface(order: OrderResponse): {
  fulfillmentStatus: string;
  assignmentState: string;
} {
  const f = order.fulfillment;
  return {
    fulfillmentStatus: f?.status != null ? orderStatusLabel(f.status) : "—",
    assignmentState: f?.assignmentState != null ? humanizeToken(f.assignmentState) : "—",
  };
}

/** Short operational hint from order status and fulfillment blockers (no API). */
export function orderNextActionPhrase(order: OrderResponse): string {
  const blockers = order.fulfillment?.blockers ?? [];
  if (blockers.length > 0) {
    const slice = blockers.slice(0, 2).map(humanizeBlocker).join("; ");
    return blockers.length > 2 ? `${slice}…` : slice;
  }

  const s = order.status as OrderStatus;
  switch (s) {
    case "PENDING":
      return "Review and confirm the order.";
    case "CONFIRMED":
      return "Assign a pickup rider to begin collection.";
    case "IN_PROGRESS":
      return "Waiting for rider to complete pickup.";
    case "PICKUP_FAILED":
      return "Review failure and retry or reschedule pickup.";
    case "RECEIVED_AT_BRANCH":
      return "Record intake and start processing.";
    case "PROCESSING":
      return "Laundry is currently being processed. Mark it ready once completed.";
    case "READY_FOR_DELIVERY":
      return "Assign a delivery rider to complete delivery.";
    case "OUT_FOR_DELIVERY":
      return "Waiting for rider to complete delivery.";
    case "DELIVERY_FAILED":
      return "Review failure and retry delivery.";
    case "DELIVERED":
    case "COMPLETED":
      return "Order is complete. Finalize payment if needed.";
    case "CANCELLED":
      return "No further action required.";
    default:
      return "Review order status.";
  }
}

export function getCurrentResponsibility(order: OrderResponse): string {
  const s = order.status as OrderStatus;
  switch (s) {
    case "PENDING":
    case "CONFIRMED":
    case "READY_FOR_DELIVERY":
      return "Branch Admin (Assignment)";
    case "IN_PROGRESS":
      return "Pickup Rider";
    case "RECEIVED_AT_BRANCH":
    case "PROCESSING":
      return "Branch Processing Team";
    case "OUT_FOR_DELIVERY":
      return "Delivery Rider";
    default:
      return "None";
  }
}

export function getStuckOrderReasoning(order: OrderResponse): string | null {
  const s = order.status as OrderStatus;

  if (order.fulfillment?.blockers?.length) {
    return humanizeBlocker(order.fulfillment.blockers[0]);
  }

  if ((s === "CONFIRMED" || s === "IN_PROGRESS") && !order.pickupRiderAuthUserId) {
    return "Waiting for pickup assignment.";
  }

  if (s === "READY_FOR_DELIVERY") {
    // Delivery rider is assigned via Delivery Trip, but we just flag it here if it's waiting
    return "Ready for delivery but no rider assigned.";
  }

  if (order.updatedAt) {
    const updatedDate = new Date(order.updatedAt).getTime();
    const now = Date.now();
    const hours = Math.floor((now - updatedDate) / (1000 * 60 * 60));

    if (hours >= 24) {
      if (s === "PROCESSING") return `Processing not updated for ${hours} hours.`;
      if (s === "PENDING") return `Pending confirmation for ${hours} hours.`;
      return `Stuck in ${orderStatusLabel(s)} for ${hours} hours.`;
    }
  }

  return null;
}

export function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABELS[status] ?? humanizeToken(status);
}

export function getStatusTone(
  value?: PaymentStatus | AssignmentState | ProofStatus | string | null,
) {
  if (!value) return "muted";

  if (
    ["PAID", "COD_COLLECTED", "COMPLETED", "VERIFIED", "ACTIVE", "DELIVERED", "ACCEPTED"].includes(value)
  ) {
    return "success";
  }

  if (
    ["FAILED", "CANCELLED", "REJECTED", "SUSPENDED", "INACTIVE", "PICKUP_FAILED", "DELIVERY_FAILED"].includes(value)
  ) {
    return "danger";
  }

  if (
    [
      "PENDING",
      "COD_PENDING_COLLECTION",
      "OFFERED",
      "ACCEPTED",
      "ON_SITE",
      "WORK_STARTED",
      "IN_PROGRESS",
      "CONFIRMED",
      "PROCESSING",
      "OUT_FOR_DELIVERY",
      "READY_FOR_DELIVERY",
      "RECEIVED_AT_BRANCH",
      "SHORTLISTED",
    ].includes(value)
  ) {
    return "warning";
  }

  if (["REVIEWED"].includes(value)) {
    return "info";
  }

  return "info";
}

export function getServiceModeTone(mode?: ServiceMode | null) {
  return mode === "PICKUP_DELIVERY" ? "service-blue" : "service-orange";
}

export type DeliveryPromiseInfo = {
  isAsap: boolean;
  typeLabel: string;
  statusLabel: string;
  badgeClass: string;
  timeDetail: string;
  isOverdue: boolean;
};

export function deliveryPromiseInfo(order: OrderResponse): DeliveryPromiseInfo {
  if (order.bookingType === "ASAP") {
    let statusLabel = "In Progress";
    let badgeClass = "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20";
    let isOverdue = false;

    if (order.slaStatus === "MET" || order.status === "COMPLETED" || order.status === "DELIVERED") {
      statusLabel = "Delivered on Time";
      badgeClass = "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
    } else if (order.slaStatus === "BREACHED") {
      statusLabel = "Delayed past target";
      badgeClass = "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20";
      isOverdue = true;
    } else if (order.slaStatus === "ON_TRACK") {
      statusLabel = "On Track";
      badgeClass = "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
    } else if (order.slaStatus === "AT_RISK") {
      statusLabel = "Running Late";
      badgeClass = "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20";
    } else if (order.slaStatus === "NOT_STARTED") {
      statusLabel = "Starting Soon";
      badgeClass = "bg-slate-100 text-slate-700 ring-1 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-300";
    }

    const timeDetail = order.promisedArrivalTo
      ? `Target: ${formatTime(order.promisedArrivalTo)}`
      : order.slaStartedAt
        ? `Started: ${formatTime(order.slaStartedAt)}`
        : "Urgent delivery window";

    return {
      isAsap: true,
      typeLabel: "⚡ ASAP Express",
      statusLabel,
      badgeClass,
      timeDetail,
      isOverdue,
    };
  }

  // Scheduled order
  const slotName = scheduledSlotLabel(order.scheduledSlotCode);
  if (!order.scheduledDate) {
    return {
      isAsap: false,
      typeLabel: "📅 Scheduled",
      statusLabel: slotName,
      badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-300",
      timeDetail: slotName,
      isOverdue: false,
    };
  }

  const dateStr = String(order.scheduledDate).slice(0, 10);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  let datePrefix = formatDate(order.scheduledDate);
  if (dateStr === todayStr) {
    datePrefix = "Today";
  } else if (dateStr === tomorrowStr) {
    datePrefix = "Tomorrow";
  }

  const isCompleted = order.status === "COMPLETED" || order.status === "DELIVERED" || order.status === "CANCELLED";
  const isPast = dateStr < todayStr && !isCompleted;

  let statusLabel = `${datePrefix} · ${slotName}`;
  let badgeClass = "bg-slate-100 text-slate-700 ring-1 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-300";

  if (isPast) {
    statusLabel = `Delayed (Was ${formatDate(order.scheduledDate)})`;
    badgeClass = "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20";
  } else if (isCompleted) {
    statusLabel = "Delivered";
    badgeClass = "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
  } else if (dateStr === todayStr) {
    statusLabel = `Due Today · ${slotName}`;
    badgeClass = "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20";
  }

  return {
    isAsap: false,
    typeLabel: "📅 Scheduled",
    statusLabel,
    badgeClass,
    timeDetail: `${datePrefix} · ${slotName}`,
    isOverdue: isPast,
  };
}

export function paymentBadgeInfo(status?: string | null) {
  switch (status) {
    case "PAID":
      return {
        label: "Paid",
        badgeClass: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20",
      };
    case "COD_PENDING_COLLECTION":
      return {
        label: "COD to Collect",
        badgeClass: "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20",
      };
    case "COD_COLLECTED":
      return {
        label: "COD Collected",
        badgeClass: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20",
      };
    case "PENDING":
      return {
        label: "Payment Pending",
        badgeClass: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20",
      };
    case "FAILED":
      return {
        label: "Payment Failed",
        badgeClass: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20",
      };
    case "REFUNDED":
      return {
        label: "Refunded",
        badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-300",
      };
    default:
      return {
        label: humanizeToken(status),
        badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-300",
      };
  }
}

