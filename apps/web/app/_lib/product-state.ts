export type VehicleType = "BIKE" | "CAR";
export type Role = "business" | "driver" | "consumer";
export type PaymentStatus =
  | "REQUIRES_PAYMENT_METHOD"
  | "REQUIRES_CONFIRMATION"
  | "AUTHORIZED"
  | "CAPTURED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "FAILED"
  | "CANCELLED";
export type JobAttentionLevel = "NORMAL" | "RISK" | "BLOCKER";
export type JobStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "EN_ROUTE_PICKUP"
  | "PICKED_UP"
  | "EN_ROUTE_DROP"
  | "DELIVERED"
  | "CANCELLED"
  | "DISPATCH_FAILED"
  | "IN_PROGRESS"
  | "COMPLETED";

export type OrgSummary = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
  createdByUserId: string;
  createdAt: string;
};

export type OrgMembershipSummary = {
  id: string;
  orgId: string;
  userId: string;
  role: "BUSINESS_OPERATOR" | "ADMIN" | "CONSUMER" | "DRIVER";
  isActive: boolean;
  createdAt: string;
};

export type BusinessContext = {
  userId: string;
  email: string;
  displayName: string;
  platformAdmin?: boolean;
  onboarded: boolean;
  currentOrg: OrgSummary | null;
  memberships: Array<{
    membership: OrgMembershipSummary;
    org: OrgSummary;
  }>;
};

export type BusinessSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  userId: string;
  email: string;
  context: BusinessContext;
};

export type RestaurantStatus = "DRAFT" | "ACTIVE";

export type RestaurantSummary = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  status: RestaurantStatus;
  createdAt: string;
  updatedAt: string;
};

export type MenuCategorySummary = {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuItemSummary = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantMenuCategory = MenuCategorySummary & {
  items: MenuItemSummary[];
};

export type RestaurantMenu = {
  restaurant: RestaurantSummary;
  categories: RestaurantMenuCategory[];
};

export type PublicRestaurantSummary = Pick<RestaurantSummary, "id" | "name" | "slug" | "status">;

export type PublicMenuItemSummary = Pick<
  MenuItemSummary,
  "id" | "name" | "description" | "priceCents" | "currency" | "sortOrder"
>;

export type PublicRestaurantMenuCategory = Pick<MenuCategorySummary, "id" | "name" | "sortOrder"> & {
  items: PublicMenuItemSummary[];
};

export type PublicRestaurantMenu = {
  restaurant: PublicRestaurantSummary;
  categories: PublicRestaurantMenuCategory[];
};

export type CustomerCheckoutDetails = {
  name: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  deliveryNotes: string;
};

export type CustomerOrderSubmission = {
  order: {
    id: string;
    restaurantId: string;
    jobId: string;
    paymentId: string;
    status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED";
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryNotes: string | null;
    subtotalCents: number;
    deliveryFeeCents: number;
    totalCents: number;
    currency: string;
    createdAt: string;
    items: Array<{
      id: string;
      menuItemId: string;
      name: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      currency: string;
    }>;
  };
  job: {
    id: string;
    status: JobStatus;
    etaMinutes: number;
    pickupAddress: string;
    dropoffAddress: string;
  };
  payment: {
    id: string;
    status: PaymentStatus;
    amountAuthorizedCents: number;
    amountCapturedCents: number;
    totalCents: number;
    currency: string;
    lastError: string | null;
  };
};

export type BusinessCustomerOrder = {
  id: string;
  status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED";
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  delivery: {
    address: string;
    addressSummary: string;
    notes: string | null;
  };
  items: CustomerOrderSubmission["order"]["items"];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  currency: string;
  payment: CustomerOrderSubmission["payment"];
  job: CustomerOrderSubmission["job"];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
};

export type BusinessCustomerOrderList = {
  items: BusinessCustomerOrder[];
};

export type PublicOrderTracking = {
  order: {
    id: string;
    status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED";
    totalCents: number;
    currency: string;
    createdAt: string;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
  delivery: {
    address: string;
    addressSummary: string;
    notes: string | null;
  };
  job: CustomerOrderSubmission["job"];
  payment: CustomerOrderSubmission["payment"];
  tracking: {
    driverAssigned: boolean;
    latestLocationAt: string | null;
    dispatchAttemptsCount: number;
    timeline: TimelineEvent[];
  };
};

export type NotificationSeverity = "info" | "success" | "warning" | "danger";
export type NotificationEntityType = "job" | "order" | "payment";

export type BusinessNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType: NotificationEntityType;
  entityId: string;
  createdAt: string;
  read: boolean;
};

export type BusinessNotificationList = {
  items: BusinessNotification[];
};

export type AdminInterventionSeverity = "danger" | "warning" | "info";
export type AdminInterventionEntityType = "job" | "order" | "payment" | "outbox" | "notification";

export type AdminInterventionItem = {
  id: string;
  category: "dispatch_failed" | "stuck_job" | "payment_failure" | "payment_capture_pending" | "notification_issue";
  severity: AdminInterventionSeverity;
  title: string;
  summary: string;
  orgId: string | null;
  orgName: string | null;
  restaurantName: string | null;
  entityType: AdminInterventionEntityType;
  entityId: string;
  jobId: string | null;
  orderId: string | null;
  paymentId: string | null;
  createdAt: string;
};

export type AdminJobSummary = {
  id: string;
  orgId: string | null;
  orgName: string | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  status: JobStatus;
  attentionLevel: JobAttentionLevel;
  attentionReason: string | null;
  customerName: string | null;
  driverName: string | null;
  vehicleRequired: VehicleType;
  paymentId: string | null;
  paymentStatus: PaymentStatus | null;
  pickupAddress: string;
  dropoffAddress: string;
  etaMinutes: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderSummary = {
  id: string;
  orgId: string;
  orgName: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddressSummary: string;
  totalCents: number;
  currency: string;
  paymentId: string;
  paymentStatus: PaymentStatus;
  jobId: string;
  jobStatus: JobStatus;
  createdAt: string;
  updatedAt: string;
};

export type PayoutLedgerStatus = "PENDING" | "READY" | "PAID" | "FAILED" | "CANCELLED";

export type DailyBriefingScope = "business" | "admin";
export type DailyBriefingItemCategory =
  | "dispatch_failed"
  | "payment_failed"
  | "delivered_uncaptured"
  | "active_without_driver"
  | "stale_job";
export type DailyBriefingSeverity = "danger" | "warning" | "success";
export type DailyBriefingEntityType = "order" | "job" | "payment";
export type DispatchRecoveryIssueType =
  | "DISPATCH_FAILED"
  | "NO_ELIGIBLE_DRIVER"
  | "OPEN_OFFER_STALE"
  | "DRIVER_UNAVAILABLE"
  | "VEHICLE_MISMATCH"
  | "PAYMENT_BLOCKER";
export type DispatchRecoveryAction =
  | "RETRY_DISPATCH"
  | "MANUAL_ASSIGN_DRIVER"
  | "REVIEW_DRIVER_POOL"
  | "REVIEW_PAYMENT_RISK"
  | "CONTACT_CUSTOMER"
  | "CANCEL_AND_REFUND_REVIEW";
export type DispatchRecoveryEvidence = {
  currentJobStatus: JobStatus;
  paymentStatus: PaymentStatus;
  offerCount: number | null;
  latestOfferStatus: "OFFERED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "WITHDRAWN" | null;
  eligibleDriverCount: number | null;
  ageMinutes: number;
};
export type DispatchRecoveryLinks = {
  jobHref: string;
  orderHref: string | null;
  paymentsHref: string | null;
};
export type DispatchRecoverySuggestion = {
  jobId: string;
  orderId: string | null;
  issueType: DispatchRecoveryIssueType;
  recommendedAction: DispatchRecoveryAction;
  explanation: string;
  evidence: DispatchRecoveryEvidence;
  links: DispatchRecoveryLinks;
  advisory: string;
};

export type DailyBriefingItem = {
  id: string;
  category: DailyBriefingItemCategory;
  severity: DailyBriefingSeverity;
  title: string;
  summary: string;
  reason: string;
  entityType: DailyBriefingEntityType;
  entityId: string;
  orderId: string | null;
  jobId: string | null;
  paymentId: string | null;
  orgId: string | null;
  orgName: string | null;
  restaurantName: string | null;
  customerName: string | null;
  orderStatus: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED" | null;
  jobStatus: JobStatus | null;
  paymentStatus: PaymentStatus | null;
  detectedAt: string;
  ageMinutes: number;
  href: string;
  recoverySuggestion?: DispatchRecoverySuggestion | null;
};

export type DailyBriefingRecommendation = {
  id: string;
  label: string;
  summary: string;
  href: string;
  entityType: DailyBriefingEntityType;
  entityId: string;
  orderId: string | null;
  jobId: string | null;
  paymentId: string | null;
};

export type DailyBriefingOperatingState = {
  ordersToday: number;
  activeJobs: number;
  fulfilledOrders: number;
  paymentRisks: number;
  availableDrivers: number | null;
};

export type DailyBriefing = {
  scope: DailyBriefingScope;
  generatedAt: string;
  headline: string;
  summary: string;
  attentionCount: number;
  criticalItems: DailyBriefingItem[];
  operatingState: DailyBriefingOperatingState;
  recommendations: DailyBriefingRecommendation[];
  guidance: string;
};

export type BusinessPaymentSummary = {
  id: string;
  orderId: string;
  jobId: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
  customerName: string;
  orderStatus: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED";
  jobStatus: JobStatus;
  paymentStatus: PaymentStatus;
  customerTotalCents: number;
  amountAuthorizedCents: number;
  amountCapturedCents: number;
  amountRefundedCents: number;
  currency: string;
  platformFeeCents: number;
  payoutGrossCents: number;
  payoutStatus: PayoutLedgerStatus | null;
  payoutHoldReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPaymentSummary = BusinessPaymentSummary & {
  orgId: string;
  orgName: string;
};

export type AdminOutboxItem = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  retryCount: number;
  lastError: string | null;
  processedAt: string | null;
  nextAttemptAt: string;
  createdAt: string;
};

export type AdminSystemHealth = {
  liveness: {
    status: "ok" | "error";
    service: "api";
  };
  readiness: {
    status: "ok" | "error";
    service: "api";
    message: string | null;
  };
  outboxBacklogCount: number;
  outboxRetryingCount: number;
  outboxFailedCount: number;
  paymentCapturePendingCount: number;
  notificationIssueCount: number;
};

export type AdminOverview = {
  interventionQueue: AdminInterventionItem[];
  activeJobs: AdminJobSummary[];
  recentOrders: AdminOrderSummary[];
  health: AdminSystemHealth;
};

export type DriverProfile = {
  role: "driver";
  name: string;
  phone: string;
  vehicleType: VehicleType;
};

export type DriverAvailabilityStatus = "ONLINE" | "OFFLINE";
export type DriverVerificationStatus = "APPROVED" | "PENDING" | "REJECTED" | "MISSING";
export type EligibleDriverSuitabilityFlag =
  | "READY"
  | "OFFLINE"
  | "ACTIVE_JOB"
  | "VEHICLE_MISMATCH"
  | "VERIFICATION_NOT_APPROVED"
  | "NO_LIVE_LOCATION"
  | "EXISTING_OPEN_OFFER";

export type DriverState = {
  driverId: string;
  availability: DriverAvailabilityStatus;
  latestLocation: { latitude: number; longitude: number } | null;
  availableSince: string | null;
  lastLocationAt: string | null;
};

export type DriverOffer = {
  offerId: string;
  jobId: string;
  status: "OFFERED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  distanceMiles: number;
  etaMinutes: number;
  payoutGrossCents: number;
  vehicleRequired: VehicleType;
  pickupAddress: string;
  dropoffAddress: string;
};

export type EligibleDriver = {
  id: string;
  displayName: string;
  vehicleType: VehicleType | null;
  availabilityStatus: DriverAvailabilityStatus;
  distanceMiles: number | null;
  lastLocationAt: string | null;
  verificationStatus: DriverVerificationStatus;
  activeJobId: string | null;
  activeJobStatus: JobStatus | null;
  eligible: boolean;
  suitabilityFlags: EligibleDriverSuitabilityFlag[];
  suitabilityReason: string;
};

export type DriverJob = {
  id: string;
  orgId: string | null;
  consumerId: string;
  assignedDriverId: string | null;
  quoteId: string | null;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoordinates: { latitude: number; longitude: number };
  dropoffCoordinates: { latitude: number; longitude: number };
  distanceMiles: number;
  etaMinutes: number;
  vehicleRequired: VehicleType;
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
  pricingVersion: string;
  premiumDistanceFlag: boolean;
  attentionLevel: JobAttentionLevel;
  attentionReason: string | null;
  createdByUserId: string;
  createdAt: string;
};

export type DriverOfferAcceptResult = {
  offerId: string;
  jobId: string;
  status: "ASSIGNED";
  distanceMiles: number;
  etaMinutes: number;
  payoutGrossCents: number;
};

export type DriverOfferRejectResult = {
  offerId: string;
  jobId: string;
  status: "REJECTED";
};

export type ProofOfDelivery = {
  id: string;
  jobId: string;
  deliveredByDriverId: string;
  photoUrl: string | null;
  recipientName: string | null;
  deliveryNote: string | null;
  deliveredAt: string;
  coordinates: { latitude: number; longitude: number } | null;
  otpVerified: boolean;
};

export type ProofOfDeliveryUploadUrl = {
  jobId: string;
  storageBucket: string;
  storagePath: string;
  uploadMethod: "PUT";
  uploadUrl: string;
  photoUrl: string;
  expiresAt: string | null;
};

export type DeliveryFormInput = {
  pickupAddress: string;
  dropoffAddress: string;
  distanceMiles: number;
  etaMinutes: number;
  vehicleType: VehicleType;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
};

export type TimelineEvent = {
  id: string;
  eventType: string;
  createdAt: string;
  summary: string;
};

export type DispatchAttempt = {
  id: string;
  attemptNumber: number;
  triggerSource: string;
  outcome: string;
  driverId: string | null;
  driverDisplayName: string | null;
  offerId: string | null;
  notes: string | null;
  createdAt: string;
};

export type TrackingSummary = {
  latestLocation: { latitude: number; longitude: number } | null;
  assignedDriverName: string | null;
  dispatchAttempts: DispatchAttempt[];
  timeline: TimelineEvent[];
};

export type PaymentSummary = {
  id: string;
  status: PaymentStatus;
  customerTotalCents: number;
  platformFeeCents: number;
  payoutGrossCents: number;
  amountAuthorizedCents: number;
  amountCapturedCents: number;
  amountRefundedCents: number;
  currency: string;
  clientSecret: string | null;
  lastError: string | null;
};

export type AppJob = {
  id: string;
  quoteId: string | null;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  distanceMiles: number;
  etaMinutes: number;
  vehicleRequired: VehicleType;
  premiumDistanceFlag: boolean;
  attentionLevel: JobAttentionLevel;
  attentionReason: string | null;
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
  pricingVersion: string;
  createdAt: string;
  tracking: TrackingSummary;
  payment: PaymentSummary;
  recoverySuggestion?: DispatchRecoverySuggestion | null;
};

const BUSINESS_SESSION_KEY = "shipwright.business-session.v2";
const DRIVER_PROFILE_KEY = "shipwright.driver-profile.v1";

function hasWindow() {
  return typeof window !== "undefined";
}

function readStorage<T>(key: string, fallback: T): T {
  if (!hasWindow()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function clearStorage(key: string) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(key);
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatCurrency(cents: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(cents / 100);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function readBusinessSession(): BusinessSession | null {
  return readStorage<BusinessSession | null>(BUSINESS_SESSION_KEY, null);
}

export function saveBusinessSession(session: BusinessSession) {
  writeStorage(BUSINESS_SESSION_KEY, session);
  return session;
}

export function clearBusinessSession() {
  clearStorage(BUSINESS_SESSION_KEY);
}

export function readDriverProfile(): DriverProfile | null {
  return readStorage<DriverProfile | null>(DRIVER_PROFILE_KEY, null);
}

export function saveDriverProfile(input: Omit<DriverProfile, "role"> & { role?: "driver" }) {
  const profile: DriverProfile = {
    role: "driver",
    name: input.name.trim(),
    phone: input.phone.trim(),
    vehicleType: input.vehicleType
  };

  writeStorage(DRIVER_PROFILE_KEY, profile);
  return profile;
}
