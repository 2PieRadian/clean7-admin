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

export function humanizeToken(value: string) {
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
  worker_missing: "Worker not assigned",
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
  IN_PROGRESS: "In Progress",
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
