import type {
  AdminPaymentSummary,
  AdminDriverReadinessItem,
  AdminDriverReadinessList,
  AdminJobSummary,
  AdminOrderSummary,
  AdminOutboxItem,
  AdminOverview,
  AppJob,
  DailyBriefing,
  EndOfDayReport,
  CreateDemoRequestInput,
  DispatchRecoverySuggestion,
  DemoRequest,
  DemoRequestStatus,
  OperationalIncidentSummary,
  CreateSupportEscalationInput,
  CreatePilotWorkspaceInput,
  BusinessNotification,
  BusinessNotificationList,
  BusinessCustomerOrder,
  BusinessCustomerOrderList,
  BusinessPilotStatus,
  BusinessTeam,
  BusinessPaymentSummary,
  BusinessSession,
  CustomerOrderSubmission,
  PublicOrderTracking,
  SupportEscalation,
  SupportEscalationEvent,
  SupportEscalationEventList,
  SupportEscalationList,
  PilotReadinessCheck,
  PilotReadinessCheckList,
  PilotRehearsalSummary,
  PilotWorkspace,
  PilotWorkspaceList,
  UpdatePilotReadinessCheckInput,
  UpdatePilotWorkspaceInput,
  UpdateSupportEscalationInput,
  DriverAvailabilityStatus,
  IdentityInvitation,
  IdentityMembership,
  IdentityOrg,
  IdentityOrgMembers,
  IdentityUser,
  OrgRole,
  EligibleDriver,
  EligibleDriverSuitabilityFlag,
  DriverJob,
  DriverOffer,
  DriverOfferAcceptResult,
  DriverOfferRejectResult,
  DriverState,
  DispatchAttempt,
  MenuCategorySummary,
  MenuItemSummary,
  FleetDriver,
  FleetDriverList,
  FleetOrganisation,
  FleetOrganisationList,
  FleetReadinessSummary,
  PaymentSummary,
  ProofOfDelivery,
  ProofOfDeliveryUploadUrl,
  PublicRestaurantMenu,
  RestaurantMenu,
  RestaurantMenuCategory,
  RestaurantSummary,
  TimelineEvent,
  TrackingSummary,
  UpdateDemoRequestInput,
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
  recoverySuggestion?: DispatchRecoverySuggestion | null;
  incidentSummary?: OperationalIncidentSummary | null;
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
type PublicOrderTrackingResponse = PublicOrderTracking;
type BusinessNotificationListResponse = BusinessNotificationList;
type BusinessPaymentListResponse = {
  items: BusinessPaymentSummary[];
};
type DailyBriefingResponse = DailyBriefing;
type EndOfDayReportResponse = EndOfDayReport;
type SupportEscalationListResponse = SupportEscalationList;
type SupportEscalationResponse = SupportEscalation;
type SupportEscalationEventListResponse = SupportEscalationEventList;
type DemoRequestResponse = DemoRequest;
type DemoRequestListResponse = {
  items: DemoRequest[];
};
type PilotWorkspaceListResponse = PilotWorkspaceList;
type PilotWorkspaceResponse = PilotWorkspace;
type PilotReadinessCheckListResponse = PilotReadinessCheckList;
type PilotReadinessCheckResponse = PilotReadinessCheck;
type PilotRehearsalSummaryResponse = PilotRehearsalSummary;
type BusinessPilotStatusResponse = BusinessPilotStatus;
type IdentityUserListResponse = {
  items: IdentityUser[];
};
type IdentityOrgListResponse = {
  items: IdentityOrg[];
};
type IdentityOrgMembersResponse = IdentityOrgMembers;
type BusinessTeamResponse = BusinessTeam;
type IdentityMembershipResponse = IdentityMembership;
type IdentityInvitationResponse = IdentityInvitation;
type FleetOrganisationListResponse = FleetOrganisationList;
type FleetOrganisationResponse = FleetOrganisation;
type FleetDriverListResponse = FleetDriverList;
type FleetDriverResponse = FleetDriver;
type FleetReadinessSummaryResponse = FleetReadinessSummary;
type AdminOverviewResponse = AdminOverview;
type AdminJobListResponse = {
  items: AdminJobSummary[];
};
type AdminOrderListResponse = {
  items: AdminOrderSummary[];
};
type AdminPaymentListResponse = {
  items: AdminPaymentSummary[];
};
type AdminDriverReadinessListResponse = AdminDriverReadinessList;
type AdminOutboxListResponse = {
  items: AdminOutboxItem[];
};
type BusinessNotificationReadResponse = {
  ok: true;
  notificationId: string;
  readAt: string;
};
type BusinessNotificationReadAllResponse = {
  ok: true;
  readAt: string;
  updatedCount: number;
};
type DriverStateResponse = DriverState;
type DriverOfferResponse = DriverOffer;
type EligibleDriverListResponse = {
  items: EligibleDriver[];
};
type DriverJobResponse = DriverJob | null;
type DriverOfferAcceptResponse = DriverOfferAcceptResult;
type DriverOfferRejectResponse = DriverOfferRejectResult;
type ProofOfDeliveryResponse = ProofOfDelivery;
type ProofOfDeliveryUploadUrlResponse = ProofOfDeliveryUploadUrl;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api-staging-qvmv.onrender.com";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

type DriverAssignmentIneligibilityPayload = {
  message: string;
  reason: string;
  suitabilityFlags: EligibleDriverSuitabilityFlag[];
  suitabilityReason: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function isUnauthorizedApiError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 401;
}

export function getUserFacingApiError(
  error: unknown,
  fallbackMessage: string
) {
  if (error instanceof ApiRequestError) {
    if (error.status >= 500 || error.message === "internal_server_error") {
      return fallbackMessage;
    }

    if (error.message.startsWith("Cannot ")) {
      return fallbackMessage;
    }

    return error.message;
  }

  return error instanceof Error ? error.message : fallbackMessage;
}

export function getDriverAssignmentIneligibility(
  error: unknown
): DriverAssignmentIneligibilityPayload | null {
  if (!(error instanceof ApiRequestError) || error.status !== 422) {
    return null;
  }

  const payload = error.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { message?: unknown }).message !== "string" ||
    typeof (payload as { reason?: unknown }).reason !== "string" ||
    typeof (payload as { suitabilityReason?: unknown }).suitabilityReason !== "string" ||
    !Array.isArray((payload as { suitabilityFlags?: unknown }).suitabilityFlags)
  ) {
    return null;
  }

  const suitabilityFlags = (payload as { suitabilityFlags: unknown[] }).suitabilityFlags;
  if (!suitabilityFlags.every((flag) => typeof flag === "string")) {
    return null;
  }

  return {
    message: (payload as { message: string }).message,
    reason: (payload as { reason: string }).reason,
    suitabilityFlags: suitabilityFlags as EligibleDriverSuitabilityFlag[],
    suitabilityReason: (payload as { suitabilityReason: string }).suitabilityReason
  };
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
    throw new ApiRequestError(message, response.status, payload);
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
    throw new ApiRequestError(message, response.status, payload);
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
    payment: toPaymentSummary(job, payment),
    recoverySuggestion: tracking?.recoverySuggestion ?? null,
    incidentSummary: tracking?.incidentSummary ?? null
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

export async function updateMenuItem(
  session: BusinessSession,
  restaurantId: string,
  itemId: string,
  input: {
    categoryId?: string;
    name?: string;
    description?: string | null;
    priceCents?: number;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  return apiFetch<MenuItemResponse>(
    session,
    `/v1/business/restaurants/${restaurantId}/menu-items/${itemId}`,
    {
      method: "PATCH",
      headers: {
        "Idempotency-Key": `${createId("idem")}-menu-item-update`
      },
      body: JSON.stringify(input)
    }
  );
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

export async function listBusinessPayments(session: BusinessSession): Promise<BusinessPaymentSummary[]> {
  const payload = await apiFetch<BusinessPaymentListResponse>(session, "/v1/business/payments", {
    method: "GET"
  });

  return payload.items;
}

export async function getBusinessDailyBriefing(session: BusinessSession): Promise<DailyBriefing> {
  return apiFetch<DailyBriefingResponse>(session, "/v1/business/briefing/daily", {
    method: "GET"
  });
}

export async function getAdminDailyBriefing(session: BusinessSession): Promise<DailyBriefing> {
  return apiFetch<DailyBriefingResponse>(session, "/v1/admin/briefing/daily", {
    method: "GET"
  });
}

export async function getBusinessEndOfDayReport(
  session: BusinessSession,
  date: string
): Promise<EndOfDayReport> {
  return apiFetch<EndOfDayReportResponse>(
    session,
    `/v1/business/reports/end-of-day?date=${encodeURIComponent(date)}`,
    {
      method: "GET"
    }
  );
}

export async function getAdminEndOfDayReport(
  session: BusinessSession,
  date: string
): Promise<EndOfDayReport> {
  return apiFetch<EndOfDayReportResponse>(
    session,
    `/v1/admin/reports/end-of-day?date=${encodeURIComponent(date)}`,
    {
      method: "GET"
    }
  );
}

export async function getBusinessOrder(session: BusinessSession, orderId: string): Promise<BusinessCustomerOrder> {
  return apiFetch<BusinessCustomerOrderResponse>(session, `/v1/business/orders/${orderId}`, {
    method: "GET"
  });
}

export async function listAdminPilots(session: BusinessSession): Promise<PilotWorkspace[]> {
  const payload = await apiFetch<PilotWorkspaceListResponse>(session, "/v1/admin/pilots", { method: "GET" });
  return payload.items;
}

export async function createAdminPilot(
  session: BusinessSession,
  input: CreatePilotWorkspaceInput
): Promise<PilotWorkspace> {
  return apiFetch<PilotWorkspaceResponse>(session, "/v1/admin/pilots", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateAdminPilot(
  session: BusinessSession,
  id: string,
  input: UpdatePilotWorkspaceInput
): Promise<PilotWorkspace> {
  return apiFetch<PilotWorkspaceResponse>(session, `/v1/admin/pilots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listAdminPilotChecks(session: BusinessSession, id: string): Promise<PilotReadinessCheck[]> {
  const payload = await apiFetch<PilotReadinessCheckListResponse>(session, `/v1/admin/pilots/${id}/checks`, { method: "GET" });
  return payload.items;
}

export async function getAdminPilotRehearsal(session: BusinessSession, id: string): Promise<PilotRehearsalSummary> {
  return apiFetch<PilotRehearsalSummaryResponse>(session, `/v1/admin/pilots/${id}/rehearsal`, { method: "GET" });
}

export async function updateAdminPilotCheck(
  session: BusinessSession,
  id: string,
  checkId: string,
  input: UpdatePilotReadinessCheckInput
): Promise<PilotReadinessCheck> {
  return apiFetch<PilotReadinessCheckResponse>(session, `/v1/admin/pilots/${id}/checks/${checkId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function getBusinessPilotStatus(session: BusinessSession): Promise<BusinessPilotStatus> {
  return apiFetch<BusinessPilotStatusResponse>(session, "/v1/business/pilot-status", { method: "GET" });
}

export async function listAdminUsers(session: BusinessSession, search?: string): Promise<IdentityUser[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const payload = await apiFetch<IdentityUserListResponse>(session, `/v1/admin/users${query}`, { method: "GET" });
  return payload.items;
}

export async function listAdminOrgs(session: BusinessSession, search?: string): Promise<IdentityOrg[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const payload = await apiFetch<IdentityOrgListResponse>(session, `/v1/admin/orgs${query}`, { method: "GET" });
  return payload.items;
}

export async function getAdminOrgMembers(session: BusinessSession, orgId: string): Promise<IdentityOrgMembers> {
  return apiFetch<IdentityOrgMembersResponse>(session, `/v1/admin/orgs/${encodeURIComponent(orgId)}/members`, {
    method: "GET"
  });
}

export async function updateAdminOrgMembership(
  session: BusinessSession,
  orgId: string,
  membershipId: string,
  input: { role?: OrgRole; isActive?: boolean }
): Promise<IdentityMembership> {
  return apiFetch<IdentityMembershipResponse>(
    session,
    `/v1/admin/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}`,
    {
      method: "PATCH",
      headers: {
        "Idempotency-Key": `${createId("idem")}-admin-membership`
      },
      body: JSON.stringify(input)
    }
  );
}

export async function getBusinessTeam(session: BusinessSession): Promise<BusinessTeam> {
  return apiFetch<BusinessTeamResponse>(session, "/v1/business/team", { method: "GET" });
}

export async function createBusinessTeamInvite(
  session: BusinessSession,
  input: { email: string; displayName?: string; role: OrgRole }
): Promise<IdentityInvitation> {
  return apiFetch<IdentityInvitationResponse>(session, "/v1/business/team/invites", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-team-invite`
    },
    body: JSON.stringify(input)
  });
}

export async function updateBusinessTeamMembership(
  session: BusinessSession,
  membershipId: string,
  input: { role?: OrgRole; isActive?: boolean }
): Promise<IdentityMembership> {
  return apiFetch<IdentityMembershipResponse>(session, `/v1/business/team/${encodeURIComponent(membershipId)}`, {
    method: "PATCH",
    headers: {
      "Idempotency-Key": `${createId("idem")}-team-membership`
    },
    body: JSON.stringify(input)
  });
}

function buildSupportEscalationsQuery(filters?: {
  orderId?: string;
  jobId?: string;
  status?: string;
  category?: string;
  severity?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.orderId) params.set("orderId", filters.orderId);
  if (filters?.jobId) params.set("jobId", filters.jobId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.severity) params.set("severity", filters.severity);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listBusinessSupportEscalations(
  session: BusinessSession,
  filters?: {
    orderId?: string;
    jobId?: string;
    status?: string;
    category?: string;
    severity?: string;
  }
): Promise<SupportEscalation[]> {
  const payload = await apiFetch<SupportEscalationListResponse>(
    session,
    `/v1/business/support/escalations${buildSupportEscalationsQuery(filters)}`,
    { method: "GET" }
  );

  return payload.items;
}

export async function createBusinessSupportEscalation(
  session: BusinessSession,
  input: CreateSupportEscalationInput
): Promise<SupportEscalation> {
  return apiFetch<SupportEscalationResponse>(session, "/v1/business/support/escalations", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-support-escalation`
    },
    body: JSON.stringify(input)
  });
}

export async function updateBusinessSupportEscalation(
  session: BusinessSession,
  escalationId: string,
  input: UpdateSupportEscalationInput
): Promise<SupportEscalation> {
  return apiFetch<SupportEscalationResponse>(
    session,
    `/v1/business/support/escalations/${encodeURIComponent(escalationId)}`,
    {
      method: "PATCH",
      headers: {
        "Idempotency-Key": `${createId("idem")}-support-escalation-update`
      },
      body: JSON.stringify(input)
    }
  );
}

export async function listBusinessSupportEscalationEvents(
  session: BusinessSession,
  escalationId: string
): Promise<SupportEscalationEvent[]> {
  const payload = await apiFetch<SupportEscalationEventListResponse>(
    session,
    `/v1/business/support/escalations/${encodeURIComponent(escalationId)}/events`,
    { method: "GET" }
  );

  return payload.items;
}

export async function listAdminSupportEscalations(
  session: BusinessSession,
  filters?: {
    orderId?: string;
    jobId?: string;
    status?: string;
    category?: string;
    severity?: string;
  }
): Promise<SupportEscalation[]> {
  const payload = await apiFetch<SupportEscalationListResponse>(
    session,
    `/v1/admin/support/escalations${buildSupportEscalationsQuery(filters)}`,
    { method: "GET" }
  );

  return payload.items;
}

export async function listAdminSupportEscalationEvents(
  session: BusinessSession,
  escalationId: string
): Promise<SupportEscalationEvent[]> {
  const payload = await apiFetch<SupportEscalationEventListResponse>(
    session,
    `/v1/admin/support/escalations/${encodeURIComponent(escalationId)}/events`,
    { method: "GET" }
  );

  return payload.items;
}

export async function getPublicOrderTracking(orderId: string): Promise<PublicOrderTracking> {
  return publicApiFetch<PublicOrderTrackingResponse>(`/v1/orders/${encodeURIComponent(orderId)}/tracking`, {
    method: "GET"
  });
}

export async function listBusinessNotifications(session: BusinessSession): Promise<BusinessNotification[]> {
  const payload = await apiFetch<BusinessNotificationListResponse>(session, "/v1/business/notifications", {
    method: "GET"
  });

  return payload.items;
}

export async function markBusinessNotificationRead(
  session: BusinessSession,
  notificationId: string
): Promise<BusinessNotificationReadResponse> {
  return apiFetch<BusinessNotificationReadResponse>(
    session,
    `/v1/business/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": `${createId("idem")}-notification-read`
      }
    }
  );
}

export async function markAllBusinessNotificationsRead(session: BusinessSession): Promise<BusinessNotificationReadAllResponse> {
  return apiFetch<BusinessNotificationReadAllResponse>(session, "/v1/business/notifications/read-all", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-notification-read-all`
    }
  });
}

export async function getDriverState(session: BusinessSession): Promise<DriverState> {
  return apiFetch<DriverStateResponse>(session, "/v1/driver/me", {
    method: "GET"
  });
}

export async function updateDriverAvailability(
  session: BusinessSession,
  availability: DriverAvailabilityStatus
): Promise<DriverState> {
  return apiFetch<DriverStateResponse>(session, "/v1/driver/me/availability", {
    method: "PATCH",
    headers: {
      "Idempotency-Key": `${createId("idem")}-driver-availability`
    },
    body: JSON.stringify({ availability })
  });
}

export async function listDriverOffers(session: BusinessSession): Promise<DriverOffer[]> {
  return apiFetch<DriverOfferResponse[]>(session, "/v1/driver/me/offers", {
    method: "GET"
  });
}

export async function acceptDriverOffer(session: BusinessSession, offerId: string): Promise<DriverOfferAcceptResult> {
  return apiFetch<DriverOfferAcceptResponse>(session, `/v1/driver/me/offers/${offerId}/accept`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-driver-offer-accept`
    }
  });
}

export async function rejectDriverOffer(session: BusinessSession, offerId: string): Promise<DriverOfferRejectResult> {
  return apiFetch<DriverOfferRejectResponse>(session, `/v1/driver/me/offers/${offerId}/reject`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-driver-offer-reject`
    }
  });
}

export async function getCurrentDriverJob(session: BusinessSession): Promise<DriverJob | null> {
  return apiFetch<DriverJobResponse>(session, "/v1/driver/me/jobs/current", {
    method: "GET"
  });
}

export async function transitionDriverJob(
  session: BusinessSession,
  jobId: string,
  transition: "en-route-pickup" | "picked-up" | "en-route-drop" | "delivered"
): Promise<DriverJob> {
  return apiFetch<DriverJob>(session, `/v1/driver/me/jobs/${jobId}/${transition}`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-driver-${transition}`
    }
  });
}

export async function createProofOfDeliveryUploadUrl(
  session: BusinessSession,
  jobId: string
): Promise<ProofOfDeliveryUploadUrl> {
  return apiFetch<ProofOfDeliveryUploadUrlResponse>(session, `/v1/driver/me/jobs/${jobId}/proof-of-delivery/upload-url`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-pod-upload-url`
    }
  });
}

export async function createProofOfDelivery(
  session: BusinessSession,
  jobId: string,
  input: {
    photoUrl?: string | null;
    recipientName?: string | null;
    deliveryNote?: string | null;
    coordinates?: { latitude: number; longitude: number } | null;
  }
): Promise<ProofOfDelivery> {
  return apiFetch<ProofOfDeliveryResponse>(session, `/v1/driver/me/jobs/${jobId}/proof-of-delivery`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-pod`
    },
    body: JSON.stringify(input)
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

export async function listEligibleDrivers(session: BusinessSession, jobId: string): Promise<EligibleDriver[]> {
  const result = await apiFetch<EligibleDriverListResponse>(session, `/v1/jobs/${jobId}/eligible-drivers`, {
    method: "GET"
  });

  return result.items;
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

export async function createDemoRequest(input: CreateDemoRequestInput): Promise<DemoRequest> {
  return publicApiFetch<DemoRequestResponse>("/v1/demo-requests", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getAdminOverview(session: BusinessSession): Promise<AdminOverview> {
  return apiFetch<AdminOverviewResponse>(session, "/v1/admin/overview", {
    method: "GET"
  });
}

export async function listAdminJobs(session: BusinessSession): Promise<AdminJobSummary[]> {
  const result = await apiFetch<AdminJobListResponse>(session, "/v1/admin/jobs", {
    method: "GET"
  });

  return result.items;
}

export async function listAdminOrders(session: BusinessSession): Promise<AdminOrderSummary[]> {
  const result = await apiFetch<AdminOrderListResponse>(session, "/v1/admin/orders", {
    method: "GET"
  });

  return result.items;
}

export async function listAdminPayments(session: BusinessSession): Promise<AdminPaymentSummary[]> {
  const result = await apiFetch<AdminPaymentListResponse>(session, "/v1/admin/payments", {
    method: "GET"
  });

  return result.items;
}

export async function listAdminDriverReadiness(session: BusinessSession): Promise<AdminDriverReadinessItem[]> {
  const result = await apiFetch<AdminDriverReadinessListResponse>(session, "/v1/admin/drivers/readiness", {
    method: "GET"
  });

  return result.items;
}

export async function listAdminDemoRequests(session: BusinessSession, status?: DemoRequestStatus): Promise<DemoRequest[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  const result = await apiFetch<DemoRequestListResponse>(session, `/v1/admin/demo-requests${params}`, {
    method: "GET"
  });

  return result.items;
}

export async function updateAdminDemoRequest(
  session: BusinessSession,
  id: string,
  input: UpdateDemoRequestInput
): Promise<DemoRequest> {
  return apiFetch<DemoRequestResponse>(session, `/v1/admin/demo-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listAdminFleets(session: BusinessSession): Promise<FleetOrganisation[]> {
  const result = await apiFetch<FleetOrganisationListResponse>(session, "/v1/admin/fleets", {
    method: "GET"
  });

  return result.items;
}

export async function createAdminFleet(
  session: BusinessSession,
  input: { name: string; contactName?: string | null; contactEmail?: string | null; city?: string | null; status?: FleetOrganisation["status"] }
): Promise<FleetOrganisation> {
  return apiFetch<FleetOrganisationResponse>(session, "/v1/admin/fleets", {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-fleet`
    },
    body: JSON.stringify(input)
  });
}

export async function listAdminFleetDrivers(session: BusinessSession, fleetOrgId: string): Promise<FleetDriver[]> {
  const result = await apiFetch<FleetDriverListResponse>(session, `/v1/admin/fleets/${fleetOrgId}/drivers`, {
    method: "GET"
  });

  return result.items;
}

export async function addAdminFleetDriver(
  session: BusinessSession,
  fleetOrgId: string,
  input: { userId?: string; driverId?: string; email?: string; role?: OrgRole }
): Promise<FleetDriver> {
  return apiFetch<FleetDriverResponse>(session, `/v1/admin/fleets/${fleetOrgId}/drivers`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `${createId("idem")}-fleet-driver`
    },
    body: JSON.stringify(input)
  });
}

export async function updateAdminFleetDriver(
  session: BusinessSession,
  fleetOrgId: string,
  membershipId: string,
  input: { role?: OrgRole; isActive?: boolean }
): Promise<FleetDriver> {
  return apiFetch<FleetDriverResponse>(session, `/v1/admin/fleets/${fleetOrgId}/drivers/${membershipId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listFleetDrivers(session: BusinessSession): Promise<FleetDriver[]> {
  const result = await apiFetch<FleetDriverListResponse>(session, "/v1/fleet/drivers", {
    method: "GET"
  });

  return result.items;
}

export async function getFleetReadiness(session: BusinessSession): Promise<FleetReadinessSummary> {
  return apiFetch<FleetReadinessSummaryResponse>(session, "/v1/fleet/readiness", {
    method: "GET"
  });
}

export async function listAdminOutbox(session: BusinessSession): Promise<AdminOutboxItem[]> {
  const result = await apiFetch<AdminOutboxListResponse>(session, "/v1/admin/outbox", {
    method: "GET"
  });

  return result.items;
}
