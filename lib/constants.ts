import type {
  GeoOverrideTargetType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PricingType,
  PublishState,
  ServiceMode,
  SlotCode,
  OperatorStatus,
} from "@/lib/types";

export const orderStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "PICKUP_FAILED",
  "RECEIVED_AT_BRANCH",
  "PROCESSING",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

export const paymentStatuses: PaymentStatus[] = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "COD_PENDING_COLLECTION",
  "COD_COLLECTED",
];

export const paymentMethods: PaymentMethod[] = ["COD", "RAZORPAY"];

export const slotCodes: SlotCode[] = ["MORNING", "AFTERNOON", "EVENING"];

export const serviceModes: ServiceMode[] = ["PICKUP_DELIVERY", "AT_HOME"];

export const operatorStatuses: OperatorStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export const staffRoles = ["OPERATOR", "RIDER"] as const;

export const publishStates: PublishState[] = ["DRAFT", "ACTIVE", "INACTIVE"];

export const pricingTypes: PricingType[] = [
  "FIXED",
  "PER_ITEM",
  "PER_KG",
  "PER_ROOM",
  "PER_HOUR",
  "PER_SEAT",
  "PER_BATHROOM",
  "PER_SQ_FT",
  "PER_AREA",
  "PER_PANEL",
  "INSPECTION_BASED",
  "PACKAGE",
  "PROPERTY_SIZE_BASED",
  "AREA_BASED",
  "ADD_ON",
];

export const geoOverrideTargetTypes: GeoOverrideTargetType[] = ["SERVICE", "ADD_ON"];

export const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
