export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ApiEnvelope<T> =
  | { success: true; data: T }
  | {
    success: false;
    error:
    | string
    | {
      code?: string;
      message: string;
      details?: JsonValue;
    };
  };

/** Roles returned by auth; admin web allows only DIRECTOR and BRANCH_ADMIN. */
export type UserRole = "USER" | "DIRECTOR" | "BRANCH_ADMIN" | "WORKER" | "RIDER";

export type AdminRole = "DIRECTOR" | "BRANCH_ADMIN";

export type AuthUser = {
  id: string;
  name?: string | null;
  email: string;
  role: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ManagedAuthUserRole = "DIRECTOR" | "BRANCH_ADMIN" | "WORKER" | "RIDER";

export type ManagedAuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: ManagedAuthUserRole;
  isVerified?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SessionData = {
  token: string;
  user?: AuthUser | null;
};

export type PublishState = "DRAFT" | "ACTIVE" | "INACTIVE";

export type PricingType =
  | "FIXED"
  | "PER_ITEM"
  | "PER_KG"
  | "PER_ROOM"
  | "PER_HOUR"
  | "PER_SEAT"
  | "PER_BATHROOM"
  | "PER_SQ_FT"
  | "PER_AREA"
  | "PER_PANEL"
  | "INSPECTION_BASED"
  | "PACKAGE"
  | "PROPERTY_SIZE_BASED"
  | "AREA_BASED"
  | "ADD_ON";

export type ServiceMode = "PICKUP_DELIVERY" | "AT_HOME";

export type SlotCode = "MORNING" | "AFTERNOON" | "EVENING";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "PICKUP_FAILED"
  | "RECEIVED_AT_BRANCH"
  | "PROCESSING"
  | "READY_FOR_DELIVERY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_FAILED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "COD_PENDING_COLLECTION"
  | "COD_COLLECTED";

export type PaymentMethod = "COD" | "RAZORPAY";

export type AssignmentState =
  | "UNASSIGNED"
  | "OFFERED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "REASSIGNED"
  | "EN_ROUTE"
  | "ON_SITE"
  | "WORK_STARTED"
  | "PROOF_SUBMITTED"
  | "COMPLETED"
  | "CANCELLED";

export type ProofStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PARTIAL"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export type WorkerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type StaffRole = "WORKER" | "RIDER";

export type LaundryStageCode = "WASHING" | "DRYING" | "IRONING" | "DRY_CLEANING";

export type LaundryStageStatus =
  | "PENDING"
  | "CLAIMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED";

export type GeoOverrideTargetType = "SERVICE" | "ADD_ON" | "ITEM" | "ADDON";

export type CategorySummary = {
  id: string;
  code: string;
  slug: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  publishState: PublishState;
  isEnabled: boolean;
  versionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  services?: CatalogServiceSummary[];
};

export type CatalogServiceSummary = {
  id: string;
  categoryId: string;
  code: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  serviceMode: ServiceMode;
  durationEstimateMinutes?: number | null;
  tags?: JsonValue;
  attributes?: JsonValue;
  sortOrder: number;
  publishState: PublishState;
  isEnabled: boolean;
  versionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  items?: CatalogItemResponse[];
  addOns?: CatalogAddOnResponse[];
};

export type CatalogItemResponse = {
  id: string;
  serviceId: string;
  code: string;
  slug: string;
  name: string;
  pricingType: PricingType;
  price: number | string;
  currency: string;
  unitLabel: string | null;
  minQty: number | null;
  maxQty: number | null;
  attributes?: JsonValue;
  sortOrder: number;
  publishState: PublishState;
  isEnabled: boolean;
  versionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CatalogAddOnResponse = {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  description: string | null;
  pricingType: PricingType;
  price: number | string;
  currency: string;
  unitLabel: string | null;
  maxQty: number | null;
  attributes?: JsonValue;
  sortOrder: number;
  publishState: PublishState;
  isEnabled: boolean;
  versionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GeoOverrideResponse = {
  id: string;
  targetType: GeoOverrideTargetType;
  serviceId: string | null;
  addOnId: string | null;
  itemId?: string | null;
  targetId?: string | null;
  branchId: string;
  overriddenPrice: number | string;
  overriddenPublishState?: PublishState | null;
  overriddenIsEnabled?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BranchAdminResponse = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm?: number;
  assignedBranchAdminAuthUserId?: string | null;
  isActive: boolean;
  metrics?: {
    activeOrderCount?: number;
    pipelineBacklog?: number;
    deliveryBacklog?: number;
    slotUtilizationPct?: number;
    lastCalculatedAt?: string;
    isFresh?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type BranchOption = {
  id: string;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
};

export type ScheduleOverrideResponse = {
  id: string;
  branchId: string;
  specificDate: string;
  slotCode: SlotCode | null;
  reason: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkerProfileResponse = {
  authUserId: string;
  displayName: string;
  phoneNumber: string | null;
  role: StaffRole;
  status: WorkerStatus;
  branchId: string | null;
  serviceCategoryCodes: string[];
  serviceZones: string[];
  skillTags: string[];
  maxConcurrentJobs: number;
  dateOfBirth?: string | null;
  gender?: string | null;
  fullAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  governmentIdType?: string | null;
  governmentIdNumber?: string | null;
  profilePhotoUrl?: string | null;
  governmentIdProofUrl?: string | null;
  isVerified?: boolean;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  drivingLicenseNumber?: string | null;
  drivingLicenseExpiry?: string | null;
  drivingLicenseUrl?: string | null;
  branch?: {
    id: string;
    code: string;
    name: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Success payload from POST /admin/staff — does not include authUserId. */
export type StaffCreateResponse = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: StaffRole;
  branchId: string;
  status: WorkerStatus;
  onboardingStatus?: string;
  serviceCategoryCodes: string[];
  dateOfBirth?: string | null;
  gender?: string | null;
  fullAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  governmentIdType?: string | null;
  governmentIdNumber?: string | null;
  profilePhotoUrl?: string | null;
  governmentIdProofUrl?: string | null;
  isVerified?: boolean;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  drivingLicenseNumber?: string | null;
  drivingLicenseExpiry?: string | null;
  drivingLicenseUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderLineItemResponse = {
  id: string;
  serviceCode?: string;
  serviceName?: string;
  itemCode?: string;
  itemName?: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
};

export type OrderFulfillmentSummary = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  assignmentState: AssignmentState;
  proofStatus?: ProofStatus;
  blockers: string[];
};

export type StatusEventResponse = {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  actorType: string;
  actorId: string;
  note?: string | null;
  createdAt: string;
};

export type PaymentStatusHistoryResponse = {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  actorType: string;
  actorId: string;
  note?: string | null;
  createdAt: string;
};

export type OrderAuditEventResponse = {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  reason?: string | null;
  createdAt: string;
};

export type LaundryStageTask = {
  id: string;
  orderId?: string;
  branchId?: string;
  stageCode: LaundryStageCode | string;
  sequence: number;
  status: LaundryStageStatus | string;
  claimedByAuthUserId?: string | null;
  assignedWorkerAuthUserId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  dueAt?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  order?: {
    id: string;
    orderNumber?: string;
    orderCode?: string;
    status: string;
    customerAuthUserId: string;
  };
};

export type DeliveryTripStopResponse = {
  id: string;
  orderId: string;
  sequence: number;
  status: string;
  failureReason?: string | null;
  failureNote?: string | null;
  deliveredAt?: string | null;
};

export type DeliveryTripResponse = {
  id: string;
  branchId: string;
  riderAuthUserId: string;
  status: string;
  note?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdByAuthUserId?: string;
  stops: DeliveryTripStopResponse[];
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Admin order — align with GET /admin/orders and GET /admin/orders/:orderId.
 * Money fields are strings in payloads.
 */
export type OrderResponse = {
  id: string;
  orderNumber: string;
  customerAuthUserId: string;
  serviceCategoryCode: string;
  serviceCategoryName?: string;
  serviceCode?: string;
  serviceName?: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  /** Present on admin order payloads; infer pickup flow when omitted (legacy). */
  serviceMode?: ServiceMode;
  branchId: string;
  scheduledDate: string;
  scheduledSlotCode: SlotCode;
  expectedItemCount?: number | null;
  actualItemCount?: number | null;
  subtotalAmount?: string;
  addOnTotalAmount?: string;
  grandTotalAmount?: string;
  items: OrderLineItemResponse[];
  fulfillment?: OrderFulfillmentSummary;
  /** May appear on detailed responses */
  assignedWorkerAuthUserId?: string | null;
  pickupRiderAuthUserId?: string | null;
  /** Legacy alias */
  orderCode?: string;
  /** Optional extended detail fields */
  serviceAddressSnapshot?: {
    id: string;
    label?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  contactSnapshot?: {
    authUserId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
  statusEvents?: StatusEventResponse[];
  paymentStatusHistory?: PaymentStatusHistoryResponse[];
  auditEvents?: OrderAuditEventResponse[];
  laundryStageTasks?: LaundryStageTask[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileResponse = {
  authUserId: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  internalNotes: string | null;
  preferences?: {
    emailOptIn?: boolean;
    smsOptIn?: boolean;
    whatsappOptIn?: boolean;
  };
};

export type ApplicationStatus = "PENDING" | "REVIEWED" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";

export interface Career {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  hasVacancies: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number };
}

export interface CareerApplication {
  id: string;
  careerId: string;
  career?: Career;
  fullName: string;
  email: string;
  phone: string;
  resumeOriginalName: string;
  resumeStoredName: string;
  resumeMimeType: string;
  resumeSize: number;
  experienceSummary: string;
  status: ApplicationStatus;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}
