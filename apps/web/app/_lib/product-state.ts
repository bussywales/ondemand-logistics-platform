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
    status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED";
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
  status: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED";
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

export type DriverProfile = {
  role: "driver";
  name: string;
  phone: string;
  vehicleType: VehicleType;
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
