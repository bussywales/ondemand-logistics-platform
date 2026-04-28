import type {
  AppJob,
  BusinessCustomerOrder,
  BusinessCustomerOrderList,
  BusinessSession,
  CustomerOrderSubmission,
  DispatchAttempt,
  MenuCategorySummary,
  MenuItemSummary,
  PaymentSummary,
  PublicRestaurantMenu,
  RestaurantMenu,
  RestaurantMenuCategory,
  RestaurantSummary,
  TimelineEvent,
  TrackingSummary,
  VehicleType
} from "./product-state";
import { createId } from "./product-state";

type QuoteResponse = {
  id: string;
  premiumDistanceFlag: boolean;
  pricingVersion: string;
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
};

type JobResponse = {
  id: string;
  quoteId: string | null;
  status: AppJob["status"];
  pickupAddress: string;
  dropoffAddress: string;
  distanceMiles: number;
  etaMinutes: number;
  vehicleRequired: VehicleType;
  premiumDistanceFlag: boolean;
  attentionLevel: AppJob["attentionLevel"];
  attentionReason: string | null;
  customerTotalCents: number;
  driverPayoutGrossCents: number;
  platformFeeCents: number;
  pricingVersion: string;
  createdAt: string;
};

type JobsPageResponse = {
  items: JobResponse[];
};

type TrackingResponse = {
  attentionLevel: AppJob["attentionLevel"];
  attentionReason: string | null;
  etaMinutes: number;
  premiumDistanceFlag: boolean;
  assignedDriver: {
    displayName: string;
    latestLocation: { latitude: number; longitude: number } | null;
  } | null;
  dispatchAttempts: Array<{
    id: string;
    attemptNumber: number;
    triggerSource: string;
    outcome: string;
    driverId: string | null;
    driverDisplayName: string | null;
    offerId: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  timeline: Array<{
    id: number;
    eventType: string;
    createdAt: string;
  }>;
};

type PaymentResponse = {
  payment: {
    id: string;
    status: PaymentSummary["status"];
    amountAuthorizedCents: number;
    amountCapturedCents: number;
    amountRefundedCents: number;
    customerTotalCents: number;
    platformFeeCents: number;
    payoutGrossCents: number;
    currency: string;
    clientSecret: string | null;
    lastError: string | null;
  };
};

type RestaurantResponse = RestaurantSummary;

type RestaurantListResponse = {
  items: RestaurantSummary[];
};

type MenuCategoryResponse = MenuCategorySummary;

type MenuItemResponse = MenuItemSummary;

type RestaurantMenuResponse = {
  restaurant: RestaurantSummary;
  categories: RestaurantMenuCategory[];
};

type PublicRestaurantMenuResponse = PublicRestaurantMenu;

type SubmitCustomerOrderResponse = CustomerOrderSubmission;

type BusinessCustomerOrderListResponse = BusinessCustomerOrderList;
type BusinessCustomerOrderResponse = BusinessCustomerOrder;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-staging-qvmv.onrender.com";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

async function apiFetch<T>(session: BusinessSession, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as unknown) : null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof (payload as { error?: unknown }).error === "object" &&
            (payload as { error?: Record<string, unknown> }).error !== null &&
            "message" in ((payload as { error?: Record<string, unknown> }).error ?? {})
          ? String((payload as { error: { message?: unknown } }).error.message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

async function publicApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${normalizeBaseUrl(apiBaseUrl)}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as unknown) : null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof (payload as { error?: unknown }).error === "object" &&
            (payload as { error?: Record<string, unknown> }).error !== null &&
            "message" in ((payload as { error?: Record<string, unknown> }).error ?? {})
          ? String((payload as { error: { message?: unknown } }).error.message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function toTrackingSummary(tracking?: TrackingResponse | null): TrackingSummary {
  if (!tracking) {
    return {
      latestLocation: null,
      assignedDriverName: null,
      dispatchAttempts: [],
      timeline: []
    };
  }

  return {
    latestLocation: tracking.assignedDriver?.latestLocation ?? null,
    assignedDriverName: tracking.assignedDriver?.displayName ?? null,
    dispatchAttempts: tracking.dispatchAttempts.map(
      (attempt): DispatchAttempt => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        triggerSource: attempt.triggerSource,
        outcome: attempt.outcome,
        driverId: attempt.driverId,
        driverDisplayName: attempt.driverDisplayName,
        offerId: attempt.offerId,
        notes: attempt.notes,
        createdAt: attempt.createdAt
      })
    ),
    timeline: tracking.timeline.map((event): TimelineEvent => ({
      id: String(event.id),
      eventType: event.eventType,
      createdAt: event.createdAt,
      summary: event.eventType.replace(/_/g, " ").toLowerCase()
    }))
  };
}

function toPaymentSummary(job: JobResponse, payment?: PaymentResponse | null): PaymentSummary {
  const item = payment?.payment;
  return {
    id: item?.id ?? createId("payment"),
    status: item?.status ?? "REQUIRES_PAYMENT_METHOD",
    customerTotalCents: item?.customerTotalCents ?? job.customerTotalCents,
    platformFeeCents: item?.platformFeeCents ?? job.platformFeeCents,
    payoutGrossCents: item?.payoutGrossCents ?? job.driverPayoutGrossCents,
    amountAuthorizedCents: item?.amountAuthorizedCents ?? 0,
    amountCapturedCents: item?.amountCapturedCents ?? 0,
    amountRefundedCents: item?.amountRefundedCents ?? 0,
    currency: item?.currency ?? "GBP",
    clientSecret: item?.clientSecret ?? null,
    lastError: item?.lastError ?? null
  };
}

function toAppJob(job: JobResponse, tracking?: TrackingResponse | null, payment?: PaymentResponse | null): AppJob {
  return {
    id: job.id,
    quoteId: job.quoteId,
    status: job.status,
    pickupAddress: job.pickupAddress,
    dropoffAddress: job.dropoffAddress,
    distanceMiles: job.distanceMiles,
    etaMinutes: tracking?.etaMinutes ?? job.etaMinutes,
    vehicleRequired: job.vehicleRequired,
    premiumDistanceFlag: tracking?.premiumDistanceFlag ?? job.premiumDistanceFlag,
    attentionLevel: tracking?.attentionLevel ?? job.attentionLevel,
    attentionReason: tracking?.attentionReason ?? job.attentionReason,
    customerTotalCents: job.customerTotalCents,
    driverPayoutGrossCents: job.driverPayoutGrossCents,
    platformFeeCents: job.platformFeeCents,
    pricingVersion: job.pricingVersion,
    createdAt: job.createdAt,
    tracking: toTrackingSummary(tracking),
    payment: toPaymentSummary(job, payment)
  };
}

async function jobMutation(session: BusinessSession, jobId: string, path: string, body?: Record<string, unknown>) {
  return apiFetch<JobResponse>(session, `/v1/jobs/${jobId}/${path}`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-${path}`
    },
    body: JSON.stringify(body ?? {})
  });
}

export async function listRestaurants(session: BusinessSession) {
  const payload = await apiFetch<RestaurantListResponse>(session, "/v1/business/restaurants", {
    method: "GET"
  });

  return payload.items;
}

export async function createRestaurant(
  session: BusinessSession,
  input: { orgId: string; name: string; slug: string; status?: RestaurantSummary["status"] }
) {
  return apiFetch<RestaurantResponse>(session, "/v1/business/restaurants", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-restaurant`
    },
    body: JSON.stringify(input)
  });
}

export async function createMenuCategory(
  session: BusinessSession,
  restaurantId: string,
  input: { name: string; sortOrder?: number; isActive?: boolean }
) {
  return apiFetch<MenuCategoryResponse>(session, `/v1/business/restaurants/${restaurantId}/menu-categories`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-menu-category`
    },
    body: JSON.stringify(input)
  });
}

export async function createMenuItem(
  session: BusinessSession,
  restaurantId: string,
  input: {
    categoryId: string;
    name: string;
    description?: string | null;
    priceCents: number;
    currency?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  return apiFetch<MenuItemResponse>(session, `/v1/business/restaurants/${restaurantId}/menu-items`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-menu-item`
    },
    body: JSON.stringify(input)
  });
}

export async function getRestaurantMenu(session: BusinessSession, restaurantId: string): Promise<RestaurantMenu> {
  return apiFetch<RestaurantMenuResponse>(session, `/v1/business/restaurants/${restaurantId}/menu`, {
    method: "GET"
  });
}

export async function getPublicRestaurantMenu(slug: string): Promise<PublicRestaurantMenu> {
  return publicApiFetch<PublicRestaurantMenuResponse>(`/v1/restaurants/${encodeURIComponent(slug)}/menu`, {
    method: "GET"
  });
}

export async function submitCustomerOrder(slug: string, input: {
  customer: { name: string; email: string; phone: string };
  delivery: { address: string; notes: string | null };
  items: Array<{ menuItemId: string; quantity: number }>;
  paymentMethodId: string;
}): Promise<CustomerOrderSubmission> {
  return publicApiFetch<SubmitCustomerOrderResponse>(`/v1/restaurants/${encodeURIComponent(slug)}/orders`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-customer-order`
    },
    body: JSON.stringify(input)
  });
}

export async function listBusinessOrders(session: BusinessSession): Promise<BusinessCustomerOrder[]> {
  const payload = await apiFetch<BusinessCustomerOrderListResponse>(session, "/v1/business/orders", {
    method: "GET"
  });

  return payload.items;
}

export async function getBusinessOrder(session: BusinessSession, orderId: string): Promise<BusinessCustomerOrder> {
  return apiFetch<BusinessCustomerOrderResponse>(session, `/v1/business/orders/${orderId}`, {
    method: "GET"
  });
}

export async function createLiveJob(session: BusinessSession, input: {
  pickupAddress: string;
  dropoffAddress: string;
  distanceMiles: number;
  etaMinutes: number;
  vehicleType: VehicleType;
  pickupCoordinates: { latitude: number; longitude: number };
  dropoffCoordinates: { latitude: number; longitude: number };
}) {
  const orgId = session.context.currentOrg?.id;
  if (!orgId) {
    throw new Error("Create a business org before creating jobs.");
  }

  const idempotencyKey = createId("idem");
  const quote = await apiFetch<QuoteResponse>(session, "/v1/quotes", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${idempotencyKey}-quote`
    },
    body: JSON.stringify({
      orgId,
      distanceMiles: input.distanceMiles,
      etaMinutes: input.etaMinutes,
      vehicleType: input.vehicleType,
      timeOfDay: "AFTERNOON",
      demandFlag: false,
      weatherFlag: false
    })
  });

  const job = await apiFetch<JobResponse>(session, "/v1/jobs", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${idempotencyKey}-job`
    },
    body: JSON.stringify({
      orgId,
      quoteId: quote.id,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
      pickupCoordinates: input.pickupCoordinates,
      dropoffCoordinates: input.dropoffCoordinates
    })
  });

  const payment = await fetchPayment(session, job.id).catch(() => null);
  return toAppJob(job, null, payment ? { payment } : null);
}

export async function listLiveJobs(session: BusinessSession) {
  const page = await apiFetch<JobsPageResponse>(session, "/v1/business/jobs?page=1&limit=20", {
    method: "GET"
  });

  return page.items.map((job) => toAppJob(job));
}

export async function getLiveJob(session: BusinessSession, jobId: string) {
  const [job, tracking, payment] = await Promise.all([
    apiFetch<JobResponse>(session, `/v1/jobs/${jobId}`, { method: "GET" }),
    fetchTracking(session, jobId).catch(() => null),
    fetchPayment(session, jobId).catch(() => null)
  ]);

  return toAppJob(job, tracking, payment ? { payment } : null);
}

export async function fetchTracking(session: BusinessSession, jobId: string) {
  return apiFetch<TrackingResponse>(session, `/v1/jobs/${jobId}/tracking`, { method: "GET" });
}

export async function fetchPayment(session: BusinessSession, jobId: string) {
  const payload = await apiFetch<PaymentResponse>(session, `/v1/jobs/${jobId}/payment`, { method: "GET" });
  return payload.payment;
}

export async function authorizePayment(session: BusinessSession, jobId: string, paymentMethodId: string) {
  const payload = await apiFetch<PaymentResponse>(session, `/v1/jobs/${jobId}/payment/authorize`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-payment`
    },
    body: JSON.stringify({ paymentMethodId })
  });

  return payload.payment;
}

export async function retryDispatch(session: BusinessSession, jobId: string) {
  const job = await jobMutation(session, jobId, "retry-dispatch");
  const payment = await fetchPayment(session, job.id).catch(() => null);
  const tracking = await fetchTracking(session, job.id).catch(() => null);
  return toAppJob(job, tracking, payment ? { payment } : null);
}

export async function reassignDriver(session: BusinessSession, jobId: string, driverId: string) {
  const job = await jobMutation(session, jobId, "reassign-driver", { driverId });
  const payment = await fetchPayment(session, job.id).catch(() => null);
  const tracking = await fetchTracking(session, job.id).catch(() => null);
  return toAppJob(job, tracking, payment ? { payment } : null);
}

export async function cancelJob(session: BusinessSession, jobId: string, reason: string) {
  const job = await jobMutation(session, jobId, "cancel", {
    reason,
    settlementPolicyCode: "PENDING_PAYMENT_RULES"
  });
  const payment = await fetchPayment(session, job.id).catch(() => null);
  const tracking = await fetchTracking(session, job.id).catch(() => null);
  return toAppJob(job, tracking, payment ? { payment } : null);
}
