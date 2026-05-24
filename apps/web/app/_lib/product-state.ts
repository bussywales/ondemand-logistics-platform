export type VehicleType = "BIKE" | "CAR";
export type Role = "business" | "driver" | "consumer";
export type OrgRole =
  | "CONSUMER"
  | "DRIVER"
  | "BUSINESS_OPERATOR"
  | "ADMIN"
  | "PLATFORM_OWNER"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT"
  | "PLATFORM_FINANCE"
  | "PLATFORM_VIEWER"
  | "OWNER"
  | "MANAGER"
  | "OPERATOR"
  | "FINANCE_VIEWER"
  | "SUPPORT_USER"
  | "MENU_MANAGER"
  | "FLEET_OWNER"
  | "FLEET_MANAGER"
  | "DISPATCHER"
  | "COMPLIANCE_MANAGER";
export type OrgType = "PLATFORM" | "RESTAURANT" | "RETAILER" | "DRIVER_COMPANY" | "INDEPENDENT_COURIER" | "SUPPORT_PARTNER";
export type OrgStatus = "ACTIVE" | "INACTIVE" | "ONBOARDING" | "SUSPENDED" | "CLOSED";
export type DemoRequestInterestType = "PILOT_MERCHANT" | "OPERATOR_PLATFORM" | "INVESTOR_PARTNER" | "OTHER";
export type DemoRequestStatus = "NEW" | "REVIEWED" | "CONTACTED" | "QUALIFIED" | "CLOSED" | "SPAM";
export type DemoRequestFollowUpPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type DemoRequestEventType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "NOTE_UPDATED"
  | "OWNER_ASSIGNED"
  | "FOLLOW_UP_SCHEDULED"
  | "CONTACT_RECORDED"
  | "PRIORITY_CHANGED"
  | "CLOSED"
  | "REOPENED";
export type DemoRequestNotificationDeliveryStatus = "pending" | "sent" | "skipped" | "failed" | "retrying" | "unknown";
export type DemoRequestNotificationStatus = {
  status: DemoRequestNotificationDeliveryStatus;
  channel: string | null;
  provider: string | null;
  lastAttemptAt: string | null;
  lastEventType: string | null;
  outboxMessageId: string | null;
  retryCount: number;
  safeErrorSummary: string | null;
};
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
  status: OrgStatus;
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
  role: OrgRole;
  isActive: boolean;
  createdAt: string;
};

export type IdentityMembership = {
  id: string;
  orgId: string;
  orgName: string;
  orgType: OrgType;
  orgStatus: OrgStatus;
  userId: string;
  email: string;
  displayName: string;
  role: OrgRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IdentityUser = {
  id: string;
  email: string;
  displayName: string;
  status: "ACTIVE" | "INVITED" | "INACTIVE" | "SUSPENDED" | "DISABLED";
  platformAdmin: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberships: IdentityMembership[];
};

export type IdentityOrg = {
  id: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  contactName: string | null;
  contactEmail: string | null;
  city: string | null;
  memberCount: number;
  activeMemberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type IdentityInvitation = {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IdentityAccessEvent = {
  id: string;
  orgId: string | null;
  eventType: string;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
  summary: string;
  metadata: Record<string, unknown>;
};

export type IdentityOrgMembers = {
  org: IdentityOrg;
  members: IdentityMembership[];
  invitations: IdentityInvitation[];
  accessEvents: IdentityAccessEvent[];
};

export type BusinessTeam = IdentityOrgMembers;

export type AdminGovernanceSummary = {
  suspendedOrgs: IdentityOrg[];
  suspendedUsers: IdentityUser[];
  recentEvents: IdentityAccessEvent[];
};

export type ImpersonationPreview = {
  allowed: false;
  userId: string;
  requirements: string[];
  message: string;
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

export type DemoRequest = {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  role: string | null;
  interestType: DemoRequestInterestType;
  message: string | null;
  source: string | null;
  status: DemoRequestStatus;
  adminNote: string | null;
  assignedOwner: string | null;
  nextFollowUpAt: string | null;
  followUpPriority: DemoRequestFollowUpPriority | null;
  lastContactedAt: string | null;
  closeReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notification?: DemoRequestNotificationStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type DemoRequestEvent = {
  id: string;
  demoRequestId: string;
  eventType: DemoRequestEventType;
  actorId: string | null;
  actorLabel: string | null;
  previousStatus: DemoRequestStatus | null;
  newStatus: DemoRequestStatus | null;
  note: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AnalyticsEventName =
  | "PUBLIC_PAGE_VIEW"
  | "CTA_CLICKED"
  | "PRICING_CTA_CLICKED"
  | "DEMO_REQUEST_FORM_STARTED"
  | "DEMO_REQUEST_SUBMITTED"
  | "DEMO_REQUEST_FAILED"
  | "MEGA_MENU_OPENED";

export type CreateAnalyticsEventInput = {
  eventName: AnalyticsEventName;
  source?: string;
  path?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
  visitorId?: string | null;
  demoRequestId?: string | null;
  metadata?: Record<string, unknown>;
};

export type AnalyticsEvent = {
  id: string;
  eventName: AnalyticsEventName;
  source: string;
  path: string | null;
  referrer: string | null;
  sessionId: string | null;
  visitorId: string | null;
  demoRequestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AnalyticsMetricWindow = {
  pageViews: number;
  ctaClicks: number;
  demoFormStarts: number;
  demoRequestSubmits: number;
  demoRequestFailures: number;
  formStartToSubmitRate: number | null;
  ctaToDemoRequestRate: number | null;
};

export type AnalyticsBreakdownRow = {
  label: string;
  source?: string | null;
  count: number;
};

export type AdminAnalyticsSummary = {
  generatedAt: string;
  windows: {
    last7Days: AnalyticsMetricWindow;
    last30Days: AnalyticsMetricWindow;
  };
  ctaPerformance: AnalyticsBreakdownRow[];
  pricingInterest: AnalyticsBreakdownRow[];
  recentEvents: AnalyticsEvent[];
};

export type OperationalResetMode =
  | "PREVIEW"
  | "ARCHIVE_DEMO_REQUESTS"
  | "CLOSE_TEST_ESCALATIONS"
  | "MARK_STALE_PILOT_REHEARSAL"
  | "FULL_DEMO_TIDY";

export type OperationalResetPreviewItem = {
  selectionId: string;
  resourceType: "demo_request" | "support_escalation" | "pilot_workspace" | "proof_record";
  resourceId: string;
  label: string;
  proposedAction: string;
  action: string;
  reason: string;
  eligible: boolean;
  warning: string | null;
  createdAt: string | null;
  currentStatus: string | null;
  metadata: Record<string, unknown>;
};

export type OperationalResetSummary = {
  affectedCount: number;
  demoRequests: number;
  supportEscalations: number;
  pilotRecommendations: number;
  proofRecordsUntouched: boolean;
  message: string;
};

export type OperationalResetPreview = {
  mode: OperationalResetMode;
  scope: string;
  reason: string;
  olderThan: string | null;
  summary: OperationalResetSummary;
  items: OperationalResetPreviewItem[];
};

export type OperationalResetRun = {
  id: string;
  createdBy: string | null;
  scope: string;
  mode: OperationalResetMode;
  reason: string;
  status: "COMPLETED" | "FAILED";
  summary: OperationalResetSummary;
  createdAt: string;
  completedAt: string | null;
};

export type OperationalResetRequestInput = {
  mode: Exclude<OperationalResetMode, "PREVIEW">;
  scope?: string;
  reason: string;
  olderThan?: string | null;
};

export type ExecuteOperationalResetInput = OperationalResetRequestInput & {
  confirmation: "RESET DEMO DATA";
  selectedItems?: Array<string | { resourceType: OperationalResetPreviewItem["resourceType"]; resourceId: string; action: string }>;
};

export type CreateDemoRequestInput = {
  name: string;
  email: string;
  organisation?: string | null;
  role?: string | null;
  interestType: DemoRequestInterestType;
  message?: string | null;
  source?: string | null;
  website?: string;
};

export type UpdateDemoRequestInput = {
  status?: DemoRequestStatus;
  adminNote?: string | null;
  assignedOwner?: string | null;
  nextFollowUpAt?: string | null;
  followUpPriority?: DemoRequestFollowUpPriority | null;
  lastContactedAt?: string | null;
  closeReason?: string | null;
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

export type MenuHistoryEventType =
  | "MENU_CATEGORY_CREATED"
  | "MENU_CATEGORY_UPDATED"
  | "MENU_CATEGORY_REORDERED"
  | "MENU_CATEGORY_ROLLBACK_APPLIED"
  | "MENU_ITEM_CREATED"
  | "MENU_ITEM_UPDATED"
  | "MENU_ITEM_PRICE_UPDATED"
  | "MENU_ITEM_VISIBILITY_UPDATED"
  | "MENU_ITEM_REORDERED"
  | "MENU_ITEM_MOVED_CATEGORY"
  | "MENU_ITEM_ROLLBACK_APPLIED";

export type MenuHistoryResourceType = "category" | "item";
export type MenuRollbackReadiness = "ROLLBACK_PREPARED" | "NOT_REVERSIBLE" | "INSUFFICIENT_METADATA";

export type MenuHistoryEvent = {
  id: string;
  eventType: MenuHistoryEventType;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
  summary: string;
  resourceType: MenuHistoryResourceType;
  resourceName: string | null;
  changedFields: string[];
  rollbackReadiness: MenuRollbackReadiness;
  rollbackReason: string;
  reversibleFields: string[];
  metadata: Record<string, unknown>;
};

export type MenuHistory = {
  items: MenuHistoryEvent[];
};

export type MenuRollbackField = {
  field: string;
  currentValue: unknown | null;
  expectedValue: unknown | null;
  rollbackValue: unknown | null;
  willChange: boolean;
};

export type MenuRollbackPreview = {
  auditId: string;
  eligible: boolean;
  reason: string;
  eventType: MenuHistoryEventType | null;
  resourceType: MenuHistoryResourceType | null;
  resourceId: string | null;
  resourceName: string | null;
  fields: MenuRollbackField[];
  warnings: string[];
};

export type MenuRollbackResult = {
  auditId: string;
  rollbackAuditId: string;
  resourceType: MenuHistoryResourceType;
  resourceId: string;
  restoredFields: string[];
  warnings: string[];
  appliedAt: string;
};

export type AdminMenuHistoryEvent = MenuHistoryEvent & {
  orgId: string | null;
  orgName: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
};

export type AdminMenuHistory = {
  items: AdminMenuHistoryEvent[];
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
  | "stale_job"
  | "support_follow_up";
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
export type IncidentSeverity = "critical" | "warning";
export type OperationalIncidentType =
  | "REQUESTED_STALE"
  | "ASSIGNED_STALE"
  | "EN_ROUTE_PICKUP_STALE"
  | "PICKED_UP_STALE"
  | "EN_ROUTE_DROP_STALE"
  | "DISPATCH_FAILED_UNRESOLVED"
  | "PAYMENT_AUTHORIZED_DELIVERY_BLOCKED";
export type IncidentCommunicationDrafts = {
  customerDraft: string | null;
  restaurantDraft: string | null;
  driverDraft: string | null;
};
export type OperationalIncidentEvidence = {
  currentJobStatus: JobStatus;
  currentOrderStatus: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "FULFILLED" | null;
  currentPaymentStatus: PaymentStatus | null;
  assignedDriverName: string | null;
  lastTimelineEventType: string | null;
  lastTimelineEventAt: string | null;
  dispatchAttemptsCount: number;
};
export type OperationalIncidentLinks = {
  jobHref: string;
  orderHref: string | null;
  paymentsHref: string | null;
};
export type OperationalIncidentSummary = {
  incidentType: OperationalIncidentType;
  severity: IncidentSeverity;
  jobId: string;
  orderId: string | null;
  title: string;
  summary: string;
  likelyCause: string | null;
  currentState: string;
  elapsedMinutes: number;
  evidence: OperationalIncidentEvidence;
  recommendedNextAction: string;
  links: OperationalIncidentLinks;
  communicationDrafts: IncidentCommunicationDrafts;
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
  incidentSummary?: OperationalIncidentSummary | null;
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
  openSupportEscalations: number;
  highCriticalSupportEscalations: number;
  oldestOpenSupportEscalationAgeMinutes: number | null;
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

export type EndOfDayReportScope = "business" | "admin";
export type EndOfDayActionType =
  | "REVIEW_PAYMENT_RISK"
  | "RETRY_DISPATCH"
  | "ASSIGN_DRIVER"
  | "CHECK_DELAYED_ORDER"
  | "REVIEW_CUSTOMER_COMMUNICATION_DRAFT"
  | "REVIEW_SUPPORT_ESCALATION";
export type EndOfDayActionSeverity = "danger" | "warning" | "info";

export type EndOfDayOperatingSummary = {
  ordersReceived: number;
  fulfilledOrders: number;
  activeOrUnresolvedOrders: number;
  cancelledOrPaymentFailedOrders: number;
  activeJobs: number;
  deliveredJobs: number;
  dispatchFailures: number;
  staleOrDelayedJobs: number;
};

export type EndOfDayPaymentsSummary = {
  authorized: number;
  captured: number;
  failed: number;
  deliveredNotCaptured: number;
  payoutReviewCount: number;
};

export type EndOfDayIncidentsSummary = {
  dispatchFailed: number;
  delayIncidents: number;
  paymentRisks: number;
  driverFollowUpIncidents: number;
  openSupportEscalations: number;
  highCriticalSupportEscalations: number;
  supportClosedToday: number;
  unresolvedRecommendations: number;
};

export type EndOfDayActionItem = {
  id: string;
  type: EndOfDayActionType;
  severity: EndOfDayActionSeverity;
  label: string;
  summary: string;
  href: string;
  entityType: DailyBriefingEntityType;
  entityId: string;
  orderId: string | null;
  jobId: string | null;
  paymentId: string | null;
};

export type EndOfDayEvidenceLink = {
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

export type EndOfDayReport = {
  scope: EndOfDayReportScope;
  date: string;
  generatedAt: string;
  headline: string;
  summary: string;
  unresolvedCount: number;
  operatingSummary: EndOfDayOperatingSummary;
  paymentsSummary: EndOfDayPaymentsSummary;
  incidentsSummary: EndOfDayIncidentsSummary;
  unresolvedActions: EndOfDayActionItem[];
  evidenceLinks: EndOfDayEvidenceLink[];
  guidance: string;
};

export type PilotWorkspaceMode = "DEMO" | "CONTROLLED_PILOT" | "INTERNAL_TEST" | "LIVE_READY";
export type PilotWorkspaceStatus =
  | "DRAFT"
  | "ONBOARDING"
  | "READY_FOR_REHEARSAL"
  | "IN_REHEARSAL"
  | "PAUSED"
  | "ACTIVE"
  | "CLOSED";
export type PilotReadinessStage =
  | "NOT_STARTED"
  | "MERCHANT_SETUP"
  | "COURIER_SETUP"
  | "PAYMENT_CHECKS"
  | "SUPPORT_OWNERS_ASSIGNED"
  | "REHEARSAL_READY"
  | "PILOT_READY";
export type PilotReadinessCheckStatus = "NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "BLOCKED" | "WAIVED";

export type PilotPostureCounts = {
  activeJobs: number;
  unresolvedSupportEscalations: number;
  paymentRisks: number;
  readyCouriers: number;
};

export type PilotWorkspace = {
  id: string;
  orgId: string;
  orgName: string | null;
  mode: PilotWorkspaceMode;
  status: PilotWorkspaceStatus;
  readinessStage: PilotReadinessStage;
  pilotOwner: string | null;
  supportOwner: string | null;
  courierOwner: string | null;
  paymentOwner: string | null;
  goLiveTargetDate: string | null;
  notes: string | null;
  checklistTotal: number;
  checklistPassed: number;
  posture: PilotPostureCounts;
  createdAt: string;
  updatedAt: string;
};

export type PilotWorkspaceList = {
  items: PilotWorkspace[];
};

export type CreatePilotWorkspaceInput = {
  orgId: string;
  mode?: PilotWorkspaceMode;
  status?: PilotWorkspaceStatus;
  readinessStage?: PilotReadinessStage;
  pilotOwner?: string | null;
  supportOwner?: string | null;
  courierOwner?: string | null;
  paymentOwner?: string | null;
  goLiveTargetDate?: string | null;
  notes?: string | null;
};

export type UpdatePilotWorkspaceInput = Partial<Omit<CreatePilotWorkspaceInput, "orgId">>;

export type PilotReadinessCheck = {
  id: string;
  pilotWorkspaceId: string;
  key: string;
  label: string;
  status: PilotReadinessCheckStatus;
  evidence: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export type PilotReadinessCheckList = {
  items: PilotReadinessCheck[];
};

export type UpdatePilotReadinessCheckInput = Partial<{
  status: PilotReadinessCheckStatus;
  evidence: string | null;
}>;

export type BusinessPilotStatus = {
  workspace: PilotWorkspace | null;
  checks: PilotReadinessCheck[];
  guidance: string;
};

export type ValidationEvidenceType = "RELEASE_VERIFY" | "PAID_DELIVERY_PROOF" | "PLAYWRIGHT_SMOKE" | "PLAYWRIGHT_SMOKE_REQUIRED_AUTH";
export type ValidationEvidenceStatus = "PASSED" | "FAILED" | "SKIPPED" | "UNKNOWN";

export type ValidationEvidenceRun = {
  id: string;
  evidenceType: ValidationEvidenceType;
  status: ValidationEvidenceStatus;
  environment: string;
  source: string;
  command: string | null;
  summary: Record<string, unknown>;
  artifactPath: string | null;
  relatedOrderId: string | null;
  relatedJobId: string | null;
  relatedPaymentId: string | null;
  relatedPodId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type ValidationEvidenceRunList = {
  items: ValidationEvidenceRun[];
};

export type ValidationEvidenceLatest = {
  environment: string;
  items: {
    releaseVerify: ValidationEvidenceRun | null;
    paidDeliveryProof: ValidationEvidenceRun | null;
    playwrightSmoke: ValidationEvidenceRun | null;
    playwrightSmokeRequiredAuth: ValidationEvidenceRun | null;
  };
};

export type ReleaseReadinessVerdict = "READY" | "NEEDS_REVIEW" | "BLOCKED";

export type ReleaseReadinessEvidenceItem = {
  evidenceType: ValidationEvidenceType;
  label: string;
  required: boolean;
  status: ValidationEvidenceStatus;
  createdAt: string | null;
  ageMinutes: number | null;
  isFresh: boolean;
  evidenceId: string | null;
  source: string | null;
  command: string | null;
  artifactPath: string | null;
  relatedOrderId: string | null;
  relatedJobId: string | null;
  relatedPaymentId: string | null;
  relatedPodId: string | null;
};

export type ReleaseReadinessSummary = {
  verdict: ReleaseReadinessVerdict;
  title: string;
  summary: string;
  environment: string;
  freshnessWindowHours: number;
  checkedAt: string;
  requiredEvidence: ReleaseReadinessEvidenceItem[];
  optionalEvidence: ReleaseReadinessEvidenceItem[];
  recommendedActions: string[];
  links: {
    validationEvidence: "/admin/validation-evidence";
    pilots: "/admin/pilots";
    command: "/admin/command";
  };
};

export type PilotGuardrailLevel = "INFO" | "CAUTION" | "WARNING" | "PAUSED" | "READY";
export type PilotRehearsalRecommendation = "READY_FOR_REHEARSAL" | "NEEDS_REVIEW" | "BLOCKED" | "UNKNOWN";
export type PilotRehearsalValidationStatus = "UNKNOWN" | "PASSED" | "FAILED" | "SKIPPED";

export type PilotRehearsalSummary = {
  workspace: PilotWorkspace;
  guardrailState: {
    level: PilotGuardrailLevel;
    title: string;
    message: string;
    recommendedAction: string;
    badgeCopy: string;
  };
  checks: PilotReadinessCheck[];
  checklistSummary: {
    total: number;
    passed: number;
    blocked: number;
    inProgress: number;
    waived: number;
    notStarted: number;
  };
  operationalPosture: {
    activeJobs: number;
    unresolvedSupportEscalations: number;
    highCriticalSupportEscalations: number;
    openPaymentRisks: number;
    readyCouriers: number;
  };
  validationPosture: {
    releaseVerification: PilotRehearsalValidationSignal;
    paidDeliveryProof: PilotRehearsalValidationSignal;
    browserSmoke: PilotRehearsalValidationSignal;
    requiredAuthSmoke: PilotRehearsalValidationSignal;
    freshnessWindowHours: number;
    overallStatus: PilotRehearsalValidationStatus;
    recommendedAction: string;
  };
  recommendation: PilotRehearsalRecommendation;
  recommendedNextActions: string[];
  guidance: string;
};

export type PilotRehearsalValidationSignal = {
  status: PilotRehearsalValidationStatus;
  label: string;
  summary: string;
  evidenceAt: string | null;
  freshness: "fresh" | "stale" | "missing";
  evidence?: ValidationEvidenceRun | null;
};

export type SupportEscalationCategory =
  | "DISPATCH_FAILURE"
  | "PAYMENT_RISK"
  | "CUSTOMER_SUPPORT"
  | "MERCHANT_SUPPORT"
  | "COURIER_SUPPORT"
  | "REFUND_REVIEW"
  | "DELIVERY_DELAY"
  | "GENERAL";
export type SupportEscalationStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "WAITING_ON_CUSTOMER"
  | "WAITING_ON_MERCHANT"
  | "WAITING_ON_COURIER"
  | "RESOLVED"
  | "CANCELLED";
export type SupportEscalationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SupportEscalationResolutionAction =
  | "CUSTOMER_UPDATED"
  | "MERCHANT_UPDATED"
  | "COURIER_UPDATED"
  | "DISPATCH_RETRIED"
  | "DRIVER_REASSIGNED"
  | "PAYMENT_REVIEWED"
  | "REFUND_REVIEWED"
  | "ORDER_CANCELLED_MANUALLY"
  | "NO_ACTION_REQUIRED"
  | "OTHER";
export type SupportEscalationResolutionReason =
  | "CUSTOMER_CONFIRMED"
  | "MERCHANT_CONFIRMED"
  | "COURIER_CONFIRMED"
  | "DELIVERY_COMPLETED"
  | "PAYMENT_RISK_CLEARED"
  | "DUPLICATE_ESCALATION"
  | "TEST_OR_DEMO_RECORD"
  | "ESCALATED_OUTSIDE_SHIPWRIGHT"
  | "OTHER";
export type SupportEscalationEventType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "NOTE_UPDATED"
  | "OWNER_UPDATED"
  | "CONTACT_FLAGS_UPDATED"
  | "RESOLVED"
  | "CANCELLED"
  | "REOPENED"
  | "RESOLUTION_UPDATED";

export type SupportEscalationEvent = {
  id: string;
  supportEscalationId: string;
  orgId: string;
  eventType: SupportEscalationEventType;
  actorId: string | null;
  actorLabel: string | null;
  previousStatus: SupportEscalationStatus | null;
  newStatus: SupportEscalationStatus | null;
  note: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type SupportEscalation = {
  id: string;
  orgId: string;
  orgName?: string | null;
  orderId: string | null;
  jobId: string | null;
  category: SupportEscalationCategory;
  status: SupportEscalationStatus;
  severity: SupportEscalationSeverity;
  title: string;
  note: string;
  followUpOwner: string | null;
  customerContactRequired: boolean;
  merchantContactRequired: boolean;
  courierContactRequired: boolean;
  resolutionNote: string | null;
  resolutionAction: SupportEscalationResolutionAction | null;
  resolutionReason: SupportEscalationResolutionReason | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  restaurantName?: string | null;
  customerName?: string | null;
};

export type SupportEscalationList = {
  items: SupportEscalation[];
};

export type SupportEscalationEventList = {
  items: SupportEscalationEvent[];
};

export type CreateSupportEscalationInput = {
  orderId?: string | null;
  jobId?: string | null;
  category: SupportEscalationCategory;
  status?: SupportEscalationStatus;
  severity: SupportEscalationSeverity;
  title: string;
  note: string;
  followUpOwner?: string | null;
  customerContactRequired?: boolean;
  merchantContactRequired?: boolean;
  courierContactRequired?: boolean;
};

export type UpdateSupportEscalationInput = Partial<{
  status: SupportEscalationStatus;
  severity: SupportEscalationSeverity;
  title: string;
  note: string;
  followUpOwner: string | null;
  customerContactRequired: boolean;
  merchantContactRequired: boolean;
  courierContactRequired: boolean;
  resolutionNote: string | null;
  resolutionAction: SupportEscalationResolutionAction | null;
  resolutionReason: SupportEscalationResolutionReason | null;
}>;

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
  orderStatus: "SUBMITTED" | "PAYMENT_AUTHORIZED" | "PAYMENT_FAILED" | "COMPLETED" | "FULFILLED";
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

export type FinanceReviewStatus = "CLEAR" | "NEEDS_REVIEW" | "REFUND_REVIEW";

export type FinanceTransaction = {
  orgId: string | null;
  orgName: string | null;
  restaurantId: string;
  restaurantName: string;
  orderId: string;
  jobId: string;
  paymentId: string;
  customerReference: string | null;
  amountCents: number;
  capturedAmountCents: number;
  pendingAmountCents: number;
  refundedAmountCents: number;
  currency: string;
  paymentStatus: PaymentStatus;
  orderStatus: BusinessPaymentSummary["orderStatus"];
  jobStatus: JobStatus;
  payoutStatus: PayoutLedgerStatus | null;
  capturedAt: string | null;
  createdAt: string;
  updatedAt: string;
  financeReviewStatus: FinanceReviewStatus;
  refundReviewRequired: boolean;
  refundReviewReason: string | null;
  recommendedNextAction: string;
};

export type FinanceTransactionList = {
  items: FinanceTransaction[];
};

export type FinanceSummary = {
  scope: "business" | "admin";
  currency: string;
  totalCapturedAmountCents: number;
  totalPendingAmountCents: number;
  totalFailedAmountCents: number;
  capturedPaymentCount: number;
  pendingPaymentCount: number;
  failedPaymentCount: number;
  fulfilledOrderCount: number;
  deliveredJobCount: number;
  ordersNeedingFinanceReview: number;
  refundReviewCandidates: number;
  openFinanceReviewCount: number;
  waitingSupportFinanceReviewCount: number;
  recentlyResolvedFinanceReviewCount: number;
  latestFinanceEvents: FinanceTransaction[];
  generatedAt: string;
};

export type FinanceReviewRecordType = "REFUND_REVIEW" | "PAYMENT_RECONCILIATION" | "FAILED_CAPTURE_REVIEW" | "DELIVERY_PAYMENT_MISMATCH";
export type FinanceReviewRecordStatus = "OPEN" | "IN_REVIEW" | "WAITING_SUPPORT" | "RESOLVED" | "CANCELLED";
export type FinanceReviewRecordSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FinanceReviewRecord = {
  id: string;
  orgId: string;
  orgName: string | null;
  orderId: string | null;
  jobId: string | null;
  paymentId: string | null;
  supportEscalationId: string | null;
  reviewType: FinanceReviewRecordType;
  status: FinanceReviewRecordStatus;
  severity: FinanceReviewRecordSeverity;
  reason: string;
  summary: string | null;
  ownerUserId: string | null;
  ownerLabel: string | null;
  resolution: string | null;
  resolutionReason: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type FinanceReviewList = {
  items: FinanceReviewRecord[];
};

export type CreateFinanceReviewInput = {
  orderId?: string | null;
  jobId?: string | null;
  paymentId?: string | null;
  supportEscalationId?: string | null;
  reviewType?: FinanceReviewRecordType;
  severity?: FinanceReviewRecordSeverity;
  reason: string;
  summary?: string | null;
  ownerUserId?: string | null;
  ownerLabel?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpdateFinanceReviewInput = {
  status?: FinanceReviewRecordStatus;
  severity?: FinanceReviewRecordSeverity;
  ownerUserId?: string | null;
  ownerLabel?: string | null;
  reason?: string;
  summary?: string | null;
  resolution?: string | null;
  resolutionReason?: string | null;
  confirmation?: string;
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

export type AdminNotificationChannel = "EMAIL" | "WEBHOOK";
export type AdminNotificationTestType = "DEMO_REQUEST_CREATED" | "ORG_INVITE_CREATED";
export type AdminNotificationDeliveryStatus = "pending" | "sent" | "skipped" | "failed" | "retrying";

export type AdminNotificationDiagnosticEvent = {
  id: string;
  outboxMessageId: string | null;
  eventType: string;
  notificationType: string | null;
  channel: string | null;
  status: AdminNotificationDeliveryStatus;
  provider: string | null;
  lastAttemptAt: string | null;
  retryCount: number;
  safeErrorSummary: string | null;
  createdAt: string;
};

export type NotificationDiagnostics = {
  configuration: {
    emailConfigured: boolean;
    webhookConfigured: boolean;
    adminEmailConfigured: boolean;
    fromEmailConfigured: boolean;
  };
  counts: {
    pending: number;
    sent: number;
    skipped: number;
    failed: number;
    retrying: number;
  };
  recentEvents: AdminNotificationDiagnosticEvent[];
  recentTestEvents: AdminNotificationDiagnosticEvent[];
};

export type NotificationTestResponse = {
  outboxMessageId: string;
  eventType: "TEST_ADMIN_NOTIFICATION";
  channel: AdminNotificationChannel;
  notificationType: AdminNotificationTestType;
  status: "queued";
  message: string;
};

export type AdminDriverReadinessStatus = "READY" | "NEEDS_REVIEW" | "NOT_ELIGIBLE";

export type AdminDriverReadinessChecklistItem = {
  key: string;
  label: string;
  result: "pass" | "warn" | "fail";
  reason: string;
};

export type AdminDriverReadinessItem = {
  driverId: string;
  driverName: string;
  availabilityStatus: DriverAvailabilityStatus;
  verificationStatus: DriverVerificationStatus;
  vehicleType: VehicleType | null;
  activeJobId: string | null;
  activeJobStatus: JobStatus | null;
  orgId: string | null;
  orgName: string | null;
  fleetOrgId?: string | null;
  fleetOrgName?: string | null;
  fleetRole?: OrgRole | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  lastLocationAt: string | null;
  locationRecentlySeen: boolean;
  readinessStatus: AdminDriverReadinessStatus;
  checklist: AdminDriverReadinessChecklistItem[];
  recommendedNextAction: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminDriverReadinessList = {
  items: AdminDriverReadinessItem[];
};

export type FleetOrganisation = {
  id: string;
  name: string;
  status: OrgStatus;
  contactName: string | null;
  contactEmail: string | null;
  city: string | null;
  memberCount: number;
  activeDriverCount: number;
  readyDriverCount: number;
  needsReviewDriverCount: number;
  notEligibleDriverCount: number;
  activeJobCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FleetOrganisationList = {
  items: FleetOrganisation[];
};

export type FleetDriver = {
  membershipId: string;
  fleetOrgId: string;
  fleetOrgName: string;
  userId: string;
  email: string;
  displayName: string;
  fleetRole: OrgRole;
  membershipActive: boolean;
  driverId: string | null;
  availabilityStatus: DriverAvailabilityStatus | null;
  verificationStatus: DriverVerificationStatus;
  vehicleType: VehicleType | null;
  activeJobId: string | null;
  activeJobStatus: JobStatus | null;
  lastLocationAt: string | null;
  readinessStatus: AdminDriverReadinessStatus;
  recommendedNextAction: string;
  createdAt: string;
  updatedAt: string;
};

export type FleetDriverList = {
  items: FleetDriver[];
};

export type FleetDriverRecentWork = {
  jobId: string;
  status: JobStatus;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type FleetReadinessHistoryEvent = {
  id: string;
  readinessStatus: AdminDriverReadinessStatus;
  reason: string;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type FleetDriverDetail = {
  driver: FleetDriver;
  recentWork: FleetDriverRecentWork[];
  readinessHistory: FleetReadinessHistoryEvent[];
  readinessHistoryNote: string;
};

export type FleetReadinessSummary = {
  fleetOrgId: string;
  fleetOrgName: string;
  totalDrivers: number;
  readyDrivers: number;
  needsReviewDrivers: number;
  notEligibleDrivers: number;
  onlineDrivers: number;
  activeJobs: number;
  humanReviewNote: string;
};

export type FleetTeam = {
  fleetOrgId: string;
  fleetOrgName: string;
  currentUserRole: OrgRole;
  canManageInvites: boolean;
  members: IdentityMembership[];
  invitations: IdentityInvitation[];
  accessEvents: IdentityAccessEvent[];
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

export type DispatchOverrideType =
  | "ASSIGN_DRIVER"
  | "REASSIGN_DRIVER"
  | "UNASSIGN_DRIVER"
  | "MARK_DISPATCH_REVIEWED"
  | "MARK_DISPATCH_BLOCKED"
  | "MANUAL_RECOVERY_NOTE";

export type DispatchCourierAffiliation = {
  courierType: "INDEPENDENT_COURIER" | "FLEET_MANAGED_COURIER" | "UNKNOWN";
  fleetOrgId: string | null;
  fleetOrgName: string | null;
  fleetRole: string | null;
};

export type DispatchAuditEvent = {
  id: string;
  orgId: string | null;
  orgName: string | null;
  jobId: string;
  orderId: string | null;
  eventType: string;
  overrideType: DispatchOverrideType | null;
  reason: string | null;
  note: string | null;
  actorId: string | null;
  actorLabel: string | null;
  previousDriverId: string | null;
  previousDriverName: string | null;
  previousDriverAffiliation: DispatchCourierAffiliation | null;
  newDriverId: string | null;
  newDriverName: string | null;
  newDriverAffiliation: DispatchCourierAffiliation | null;
  metadata: Record<string, unknown>;
  createdAt: string;
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
  incidentSummary?: OperationalIncidentSummary | null;
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
