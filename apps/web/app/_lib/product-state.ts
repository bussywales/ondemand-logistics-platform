export type VehicleType = "BIKE" | "CAR";
export type AppMode = "staged" | "live";
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

export type BusinessProfile = {
  role: "business";
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  operatingCity: string;
  apiBaseUrl: string;
  authToken: string;
  orgId: string;
  consumerId: string;
};

export type DriverProfile = {
  role: "driver";
  name: string;
  phone: string;
  vehicleType: VehicleType;
};

export type OnboardingProfile = BusinessProfile | DriverProfile | null;

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

export type TrackingSummary = {
  latestLocation: { latitude: number; longitude: number } | null;
  assignedDriverName: string | null;
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
  mode: AppMode;
  quoteId: string | null;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  distanceMiles: number;
  etaMinutes: number;
  vehicleRequired: VehicleType;
  premiumDistanceFlag: boolean;
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
  pricingVersion: string;
  createdAt: string;
  tracking: TrackingSummary;
  payment: PaymentSummary;
};

const BUSINESS_PROFILE_KEY = "shipwright.business-profile.v1";
const DRIVER_PROFILE_KEY = "shipwright.driver-profile.v1";
const JOBS_KEY = "shipwright.jobs.v1";

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-staging-qvmv.onrender.com";

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

export function readBusinessProfile(): BusinessProfile | null {
  return readStorage<BusinessProfile | null>(BUSINESS_PROFILE_KEY, null);
}

export function saveBusinessProfile(input: Omit<BusinessProfile, "role"> & { role?: "business" }) {
  const profile: BusinessProfile = {
    role: "business",
    apiBaseUrl: input.apiBaseUrl?.trim() || defaultApiBaseUrl,
    authToken: input.authToken?.trim() || "",
    orgId: input.orgId?.trim() || "",
    consumerId: input.consumerId?.trim() || "",
    businessName: input.businessName.trim(),
    contactName: input.contactName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    operatingCity: input.operatingCity.trim()
  };

  writeStorage(BUSINESS_PROFILE_KEY, profile);
  return profile;
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

export function readJobs(): AppJob[] {
  return readStorage<AppJob[]>(JOBS_KEY, []);
}

export function saveJobs(jobs: AppJob[]) {
  writeStorage(JOBS_KEY, jobs);
}

function inferTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 11) return "BREAKFAST";
  if (hour < 14) return "LUNCH";
  if (hour < 18) return "AFTERNOON";
  if (hour < 23) return "DINNER";
  return "OVERNIGHT";
}

export function buildLocalQuote(input: DeliveryFormInput) {
  if (input.distanceMiles > 12) {
    throw new Error("Distance exceeds the 12 mile service cap.");
  }

  const premiumDistanceFlag = input.distanceMiles > 8 && input.distanceMiles <= 12;
  const baseCents = input.vehicleType === "CAR" ? 950 : 700;
  const distanceComponent = Math.round(input.distanceMiles * (input.vehicleType === "CAR" ? 165 : 145));
  const etaComponent = Math.round(input.etaMinutes * 18);
  const premiumComponent = premiumDistanceFlag ? 350 : 0;
  const customerTotalCents = baseCents + distanceComponent + etaComponent + premiumComponent;
  const driverPayoutGrossCents = Math.round(customerTotalCents * 0.68);
  const platformFeeCents = customerTotalCents - driverPayoutGrossCents;

  return {
    id: createId("quote"),
    timeOfDay: inferTimeOfDay(),
    pricingVersion: "web-staged-v1",
    premiumDistanceFlag,
    customerTotalCents,
    driverPayoutGrossCents,
    platformFeeCents
  };
}

export function createLocalJob(input: DeliveryFormInput): AppJob {
  const quote = buildLocalQuote(input);
  const createdAt = new Date().toISOString();

  return {
    id: createId("job"),
    mode: "staged",
    quoteId: quote.id,
    status: "REQUESTED",
    pickupAddress: input.pickupAddress.trim(),
    dropoffAddress: input.dropoffAddress.trim(),
    distanceMiles: input.distanceMiles,
    etaMinutes: input.etaMinutes,
    vehicleRequired: input.vehicleType,
    premiumDistanceFlag: quote.premiumDistanceFlag,
    customerTotalCents: quote.customerTotalCents,
    driverPayoutGrossCents: quote.driverPayoutGrossCents,
    platformFeeCents: quote.platformFeeCents,
    pricingVersion: quote.pricingVersion,
    createdAt,
    tracking: {
      latestLocation: null,
      assignedDriverName: null,
      timeline: [
        {
          id: createId("timeline"),
          eventType: "JOB_REQUESTED",
          createdAt,
          summary: "Delivery request created in staged mode."
        }
      ]
    },
    payment: {
      id: createId("payment"),
      status: "REQUIRES_PAYMENT_METHOD",
      customerTotalCents: quote.customerTotalCents,
      platformFeeCents: quote.platformFeeCents,
      payoutGrossCents: quote.driverPayoutGrossCents,
      amountAuthorizedCents: 0,
      amountCapturedCents: 0,
      amountRefundedCents: 0,
      currency: "GBP",
      clientSecret: null,
      lastError: null
    }
  };
}

export function authorizeLocalJobPayment(jobId: string) {
  const jobs = readJobs();
  const nextJobs = jobs.map((job) => {
    if (job.id !== jobId) {
      return job;
    }

    return {
      ...job,
      payment: {
        ...job.payment,
        status: "AUTHORIZED" as const,
        amountAuthorizedCents: job.customerTotalCents,
        lastError: null
      },
      tracking: {
        ...job.tracking,
        timeline: [
          {
            id: createId("timeline"),
            eventType: "PAYMENT_AUTHORIZED",
            createdAt: new Date().toISOString(),
            summary: "Payment authorized in staged mode."
          },
          ...job.tracking.timeline
        ]
      }
    };
  });

  saveJobs(nextJobs);
  return nextJobs.find((job) => job.id === jobId) ?? null;
}

export function upsertJob(job: AppJob) {
  const jobs = readJobs();
  const filtered = jobs.filter((item) => item.id !== job.id);
  const nextJobs = [job, ...filtered].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  saveJobs(nextJobs);
  return nextJobs;
}
