import { z } from "zod";

export const OrgRoleSchema = z.enum([
  "CONSUMER",
  "DRIVER",
  "BUSINESS_OPERATOR",
  "ADMIN",
  "PLATFORM_OWNER",
  "PLATFORM_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_FINANCE",
  "PLATFORM_VIEWER",
  "OWNER",
  "MANAGER",
  "OPERATOR",
  "FINANCE_VIEWER",
  "SUPPORT_USER",
  "MENU_MANAGER",
  "FLEET_OWNER",
  "FLEET_MANAGER",
  "DISPATCHER",
  "COMPLIANCE_MANAGER"
]);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

export const OrgTypeSchema = z.enum([
  "PLATFORM",
  "RESTAURANT",
  "RETAILER",
  "DRIVER_COMPANY",
  "INDEPENDENT_COURIER",
  "SUPPORT_PARTNER"
]);
export type OrgType = z.infer<typeof OrgTypeSchema>;

export const OrgStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ONBOARDING", "SUSPENDED"]);
export type OrgStatus = z.infer<typeof OrgStatusSchema>;

export const VehicleTypeSchema = z.enum(["BIKE", "CAR"]);
export type VehicleType = z.infer<typeof VehicleTypeSchema>;

export const DriverAvailabilityStatusSchema = z.enum(["ONLINE", "OFFLINE"]);
export type DriverAvailabilityStatus = z.infer<typeof DriverAvailabilityStatusSchema>;

export const JobStatusSchema = z.enum([
  "REQUESTED",
  "ASSIGNED",
  "EN_ROUTE_PICKUP",
  "PICKED_UP",
  "EN_ROUTE_DROP",
  "DELIVERED",
  "CANCELLED",
  "DISPATCH_FAILED",
  "IN_PROGRESS",
  "COMPLETED"
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobAttentionLevelSchema = z.enum(["NORMAL", "RISK", "BLOCKER"]);
export type JobAttentionLevel = z.infer<typeof JobAttentionLevelSchema>;

export const JobOfferStatusSchema = z.enum([
  "OFFERED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED"
]);
export type JobOfferStatus = z.infer<typeof JobOfferStatusSchema>;

export const QuoteTimeOfDaySchema = z.enum([
  "BREAKFAST",
  "LUNCH",
  "AFTERNOON",
  "DINNER",
  "OVERNIGHT"
]);
export type QuoteTimeOfDay = z.infer<typeof QuoteTimeOfDaySchema>;

export const IdempotencyHeaderSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_\-:.]+$/);

const CurrencyAmountSchema = z.number().int().nonnegative();
const DistanceMilesSchema = z.number().positive().max(12);
const EtaMinutesSchema = z.number().int().positive().max(240);
const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});
const IsoDateTimeSchema = z.string();

export const QuoteBreakdownLineSchema = z.object({
  code: z.string().min(2),
  label: z.string().min(2),
  amountCents: CurrencyAmountSchema
});
export type QuoteBreakdownLine = z.infer<typeof QuoteBreakdownLineSchema>;

export const CreateQuoteSchema = z.object({
  orgId: z.string().uuid().nullable().optional(),
  distanceMiles: DistanceMilesSchema,
  etaMinutes: EtaMinutesSchema,
  vehicleType: VehicleTypeSchema,
  timeOfDay: QuoteTimeOfDaySchema,
  demandFlag: z.boolean().default(false),
  weatherFlag: z.boolean().default(false)
});
export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;

export const QuoteSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid().nullable(),
  createdByUserId: z.string().uuid(),
  distanceMiles: DistanceMilesSchema,
  etaMinutes: EtaMinutesSchema,
  vehicleType: VehicleTypeSchema,
  timeOfDay: QuoteTimeOfDaySchema,
  demandFlag: z.boolean(),
  weatherFlag: z.boolean(),
  customerTotalCents: CurrencyAmountSchema,
  driverPayoutGrossCents: CurrencyAmountSchema,
  platformFeeCents: CurrencyAmountSchema,
  breakdownLines: z.array(QuoteBreakdownLineSchema),
  pricingVersion: z.string().min(3),
  premiumDistanceFlag: z.boolean(),
  createdAt: IsoDateTimeSchema
});
export type QuoteDto = z.infer<typeof QuoteSchema>;

export const CreateJobRequestSchema = z.object({
  orgId: z.string().uuid().nullable().optional(),
  consumerId: z.string().uuid().optional(),
  quoteId: z.string().uuid(),
  pickupAddress: z.string().min(3),
  dropoffAddress: z.string().min(3),
  pickupCoordinates: CoordinatesSchema,
  dropoffCoordinates: CoordinatesSchema
});
export type CreateJobRequestInput = z.infer<typeof CreateJobRequestSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid().nullable(),
  consumerId: z.string().uuid(),
  assignedDriverId: z.string().uuid().nullable(),
  quoteId: z.string().uuid().nullable(),
  status: JobStatusSchema,
  pickupAddress: z.string(),
  dropoffAddress: z.string(),
  pickupCoordinates: CoordinatesSchema,
  dropoffCoordinates: CoordinatesSchema,
  distanceMiles: DistanceMilesSchema,
  etaMinutes: EtaMinutesSchema,
  vehicleRequired: VehicleTypeSchema,
  customerTotalCents: CurrencyAmountSchema,
  driverPayoutGrossCents: CurrencyAmountSchema,
  platformFeeCents: CurrencyAmountSchema,
  pricingVersion: z.string().min(3),
  premiumDistanceFlag: z.boolean(),
  attentionLevel: JobAttentionLevelSchema,
  attentionReason: z.string().min(2).nullable(),
  createdByUserId: z.string().uuid(),
  createdAt: IsoDateTimeSchema
});
export type JobDto = z.infer<typeof JobSchema>;

export const PaginatedJobsSchema = z.object({
  items: z.array(JobSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  hasMore: z.boolean()
});
export type PaginatedJobsDto = z.infer<typeof PaginatedJobsSchema>;

export const UpdateDriverAvailabilitySchema = z.object({
  availability: DriverAvailabilityStatusSchema
});
export type UpdateDriverAvailabilityInput = z.infer<typeof UpdateDriverAvailabilitySchema>;

export const UpdateDriverLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});
export type UpdateDriverLocationInput = z.infer<typeof UpdateDriverLocationSchema>;

export const DriverStateSchema = z.object({
  driverId: z.string().uuid(),
  availability: DriverAvailabilityStatusSchema,
  latestLocation: CoordinatesSchema.nullable(),
  availableSince: IsoDateTimeSchema.nullable(),
  lastLocationAt: IsoDateTimeSchema.nullable()
});
export type DriverStateDto = z.infer<typeof DriverStateSchema>;

export const DriverOfferSchema = z.object({
  offerId: z.string().uuid(),
  jobId: z.string().uuid(),
  status: JobOfferStatusSchema,
  expiresAt: IsoDateTimeSchema,
  distanceMiles: DistanceMilesSchema,
  etaMinutes: EtaMinutesSchema,
  payoutGrossCents: CurrencyAmountSchema,
  vehicleRequired: VehicleTypeSchema,
  pickupAddress: z.string(),
  dropoffAddress: z.string()
});
export type DriverOfferDto = z.infer<typeof DriverOfferSchema>;

export const OfferDecisionSchema = z.object({
  offerId: z.string().uuid(),
  jobId: z.string().uuid(),
  status: z.literal("REJECTED")
});
export type OfferDecisionDto = z.infer<typeof OfferDecisionSchema>;

export const AcceptDriverOfferResponseSchema = z.object({
  offerId: z.string().uuid(),
  jobId: z.string().uuid(),
  status: z.literal("ASSIGNED"),
  distanceMiles: DistanceMilesSchema,
  etaMinutes: EtaMinutesSchema,
  payoutGrossCents: CurrencyAmountSchema
});
export type AcceptDriverOfferResponse = z.infer<typeof AcceptDriverOfferResponseSchema>;

export const TrackingDriverSummarySchema = z.object({
  driverId: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().min(2),
  latestLocation: CoordinatesSchema.nullable(),
  lastLocationAt: IsoDateTimeSchema.nullable()
});
export type TrackingDriverSummaryDto = z.infer<typeof TrackingDriverSummarySchema>;

export const JobTimelineEventSchema = z.object({
  id: z.number().int().nonnegative(),
  eventType: z.string().min(2),
  actorId: z.string().uuid().nullable(),
  createdAt: IsoDateTimeSchema,
  payload: z.record(z.string(), z.unknown())
});
export type JobTimelineEventDto = z.infer<typeof JobTimelineEventSchema>;

export const DispatchAttemptSchema = z.object({
  id: z.string().uuid(),
  attemptNumber: z.number().int().positive(),
  triggerSource: z.string().min(2),
  outcome: z.string().min(2),
  driverId: z.string().uuid().nullable(),
  driverDisplayName: z.string().min(2).nullable(),
  offerId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  createdAt: IsoDateTimeSchema
});
export type DispatchAttemptDto = z.infer<typeof DispatchAttemptSchema>;

export const DispatchRecoveryIssueTypeSchema = z.enum([
  "DISPATCH_FAILED",
  "NO_ELIGIBLE_DRIVER",
  "OPEN_OFFER_STALE",
  "DRIVER_UNAVAILABLE",
  "VEHICLE_MISMATCH",
  "PAYMENT_BLOCKER"
]);
export type DispatchRecoveryIssueType = z.infer<typeof DispatchRecoveryIssueTypeSchema>;

export const DispatchRecoveryActionSchema = z.enum([
  "RETRY_DISPATCH",
  "MANUAL_ASSIGN_DRIVER",
  "REVIEW_DRIVER_POOL",
  "REVIEW_PAYMENT_RISK",
  "CONTACT_CUSTOMER",
  "CANCEL_AND_REFUND_REVIEW"
]);
export type DispatchRecoveryAction = z.infer<typeof DispatchRecoveryActionSchema>;

export const DispatchRecoveryEvidenceSchema = z.object({
  currentJobStatus: JobStatusSchema,
  paymentStatus: z.lazy(() => PaymentStatusSchema),
  offerCount: z.number().int().nonnegative().nullable(),
  latestOfferStatus: JobOfferStatusSchema.nullable(),
  eligibleDriverCount: z.number().int().nonnegative().nullable(),
  ageMinutes: z.number().int().nonnegative()
});
export type DispatchRecoveryEvidenceDto = z.infer<typeof DispatchRecoveryEvidenceSchema>;

export const DispatchRecoveryLinksSchema = z.object({
  jobHref: z.string().min(2),
  orderHref: z.string().min(2).nullable(),
  paymentsHref: z.string().min(2).nullable()
});
export type DispatchRecoveryLinksDto = z.infer<typeof DispatchRecoveryLinksSchema>;

export const DispatchRecoverySuggestionSchema = z.object({
  jobId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  issueType: DispatchRecoveryIssueTypeSchema,
  recommendedAction: DispatchRecoveryActionSchema,
  explanation: z.string().min(2),
  evidence: DispatchRecoveryEvidenceSchema,
  links: DispatchRecoveryLinksSchema,
  advisory: z.string().min(2)
});
export type DispatchRecoverySuggestionDto = z.infer<typeof DispatchRecoverySuggestionSchema>;

export const IncidentSeveritySchema = z.enum(["critical", "warning"]);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const OperationalIncidentTypeSchema = z.enum([
  "REQUESTED_STALE",
  "ASSIGNED_STALE",
  "EN_ROUTE_PICKUP_STALE",
  "PICKED_UP_STALE",
  "EN_ROUTE_DROP_STALE",
  "DISPATCH_FAILED_UNRESOLVED",
  "PAYMENT_AUTHORIZED_DELIVERY_BLOCKED"
]);
export type OperationalIncidentType = z.infer<typeof OperationalIncidentTypeSchema>;

export const IncidentCommunicationDraftsSchema = z.object({
  customerDraft: z.string().min(2).nullable(),
  restaurantDraft: z.string().min(2).nullable(),
  driverDraft: z.string().min(2).nullable()
});
export type IncidentCommunicationDraftsDto = z.infer<typeof IncidentCommunicationDraftsSchema>;

export const OperationalIncidentEvidenceSchema = z.object({
  currentJobStatus: JobStatusSchema,
  currentOrderStatus: z.lazy(() => CustomerOrderStatusSchema).nullable(),
  currentPaymentStatus: z.lazy(() => PaymentStatusSchema).nullable(),
  assignedDriverName: z.string().min(2).nullable(),
  lastTimelineEventType: z.string().min(2).nullable(),
  lastTimelineEventAt: IsoDateTimeSchema.nullable(),
  dispatchAttemptsCount: z.number().int().nonnegative()
});
export type OperationalIncidentEvidenceDto = z.infer<typeof OperationalIncidentEvidenceSchema>;

export const OperationalIncidentLinksSchema = z.object({
  jobHref: z.string().min(2),
  orderHref: z.string().min(2).nullable(),
  paymentsHref: z.string().min(2).nullable()
});
export type OperationalIncidentLinksDto = z.infer<typeof OperationalIncidentLinksSchema>;

export const OperationalIncidentSummarySchema = z.object({
  incidentType: OperationalIncidentTypeSchema,
  severity: IncidentSeveritySchema,
  jobId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  title: z.string().min(2),
  summary: z.string().min(2),
  likelyCause: z.string().min(2).nullable(),
  currentState: z.string().min(2),
  elapsedMinutes: z.number().int().nonnegative(),
  evidence: OperationalIncidentEvidenceSchema,
  recommendedNextAction: z.string().min(2),
  links: OperationalIncidentLinksSchema,
  communicationDrafts: IncidentCommunicationDraftsSchema
});
export type OperationalIncidentSummaryDto = z.infer<typeof OperationalIncidentSummarySchema>;

export const JobTrackingSchema = z.object({
  jobId: z.string().uuid(),
  status: JobStatusSchema,
  attentionLevel: JobAttentionLevelSchema,
  attentionReason: z.string().min(2).nullable(),
  pickup: z.object({
    address: z.string(),
    coordinates: CoordinatesSchema
  }),
  dropoff: z.object({
    address: z.string(),
    coordinates: CoordinatesSchema
  }),
  etaMinutes: EtaMinutesSchema,
  premiumDistanceFlag: z.boolean(),
  assignedDriver: TrackingDriverSummarySchema.nullable(),
  dispatchAttempts: z.array(DispatchAttemptSchema),
  timeline: z.array(JobTimelineEventSchema),
  recoverySuggestion: DispatchRecoverySuggestionSchema.nullable().optional(),
  incidentSummary: OperationalIncidentSummarySchema.nullable().optional()
});
export type JobTrackingDto = z.infer<typeof JobTrackingSchema>;

export const ProofOfDeliverySchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  deliveredByDriverId: z.string().uuid(),
  photoUrl: z.string().url().nullable(),
  recipientName: z.string().min(2).nullable(),
  deliveryNote: z.string().min(3).max(1000).nullable(),
  deliveredAt: IsoDateTimeSchema,
  coordinates: CoordinatesSchema.nullable(),
  otpVerified: z.boolean()
});
export type ProofOfDeliveryDto = z.infer<typeof ProofOfDeliverySchema>;

export const CreateProofOfDeliverySchema = z.object({
  photoUrl: z.string().url().nullable().optional(),
  recipientName: z.string().min(2).max(120).nullable().optional(),
  deliveryNote: z.string().min(3).max(1000).nullable().optional(),
  coordinates: CoordinatesSchema.nullable().optional(),
  otpVerified: z.boolean().optional().default(false)
});
export type CreateProofOfDeliveryInput = z.infer<typeof CreateProofOfDeliverySchema>;

export const ProofOfDeliveryUploadUrlResponseSchema = z.object({
  jobId: z.string().uuid(),
  storageBucket: z.string().min(2),
  storagePath: z.string().min(3),
  uploadMethod: z.literal("PUT"),
  uploadUrl: z.string().url(),
  photoUrl: z.string().url(),
  expiresAt: IsoDateTimeSchema.nullable()
});
export type ProofOfDeliveryUploadUrlResponse = z.infer<typeof ProofOfDeliveryUploadUrlResponseSchema>;

export const CancellationActorRoleSchema = z.enum(["CONSUMER", "BUSINESS_OPERATOR", "ADMIN"]);
export type CancellationActorRole = z.infer<typeof CancellationActorRoleSchema>;

export const CancelJobSchema = z.object({
  reason: z.string().min(3).max(500),
  settlementPolicyCode: z.string().min(3).max(64).default("PENDING_PAYMENT_RULES"),
  settlementNote: z.string().min(3).max(500).nullable().optional()
});
export type CancelJobInput = z.infer<typeof CancelJobSchema>;

export const ReassignJobSchema = z.object({
  driverId: z.string().uuid()
});
export type ReassignJobInput = z.infer<typeof ReassignJobSchema>;

export const EligibleDriverVerificationStatusSchema = z.enum(["APPROVED", "PENDING", "REJECTED", "MISSING"]);
export type EligibleDriverVerificationStatus = z.infer<typeof EligibleDriverVerificationStatusSchema>;

export const EligibleDriverSuitabilityFlagSchema = z.enum([
  "READY",
  "OFFLINE",
  "ACTIVE_JOB",
  "VEHICLE_MISMATCH",
  "VERIFICATION_NOT_APPROVED",
  "NO_LIVE_LOCATION",
  "EXISTING_OPEN_OFFER"
]);
export type EligibleDriverSuitabilityFlag = z.infer<typeof EligibleDriverSuitabilityFlagSchema>;

export const EligibleDriverSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(2),
  vehicleType: VehicleTypeSchema.nullable(),
  availabilityStatus: DriverAvailabilityStatusSchema,
  distanceMiles: z.number().nonnegative().nullable(),
  lastLocationAt: IsoDateTimeSchema.nullable(),
  verificationStatus: EligibleDriverVerificationStatusSchema,
  activeJobId: z.string().uuid().nullable(),
  activeJobStatus: JobStatusSchema.nullable(),
  eligible: z.boolean(),
  suitabilityFlags: z.array(EligibleDriverSuitabilityFlagSchema),
  suitabilityReason: z.string().min(2)
});
export type EligibleDriverDto = z.infer<typeof EligibleDriverSchema>;

export const AdminDriverReadinessStatusSchema = z.enum(["READY", "NEEDS_REVIEW", "NOT_ELIGIBLE"]);
export type AdminDriverReadinessStatus = z.infer<typeof AdminDriverReadinessStatusSchema>;

export const AdminDriverReadinessChecklistItemSchema = z.object({
  key: z.string().min(2),
  label: z.string().min(2),
  result: z.enum(["pass", "warn", "fail"]),
  reason: z.string().min(2)
});
export type AdminDriverReadinessChecklistItemDto = z.infer<typeof AdminDriverReadinessChecklistItemSchema>;

export const AdminDriverReadinessItemSchema = z.object({
  driverId: z.string().uuid(),
  driverName: z.string().min(2),
  availabilityStatus: DriverAvailabilityStatusSchema,
  verificationStatus: EligibleDriverVerificationStatusSchema,
  vehicleType: VehicleTypeSchema.nullable(),
  activeJobId: z.string().uuid().nullable(),
  activeJobStatus: JobStatusSchema.nullable(),
  orgId: z.string().uuid().nullable(),
  orgName: z.string().nullable(),
  fleetOrgId: z.string().uuid().nullable().optional().default(null),
  fleetOrgName: z.string().nullable().optional().default(null),
  fleetRole: OrgRoleSchema.nullable().optional().default(null),
  restaurantName: z.string().nullable(),
  restaurantSlug: z.string().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable(),
  lastLocationAt: z.string().nullable(),
  locationRecentlySeen: z.boolean(),
  readinessStatus: AdminDriverReadinessStatusSchema,
  checklist: z.array(AdminDriverReadinessChecklistItemSchema),
  recommendedNextAction: z.string().min(2),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type AdminDriverReadinessItemDto = z.infer<typeof AdminDriverReadinessItemSchema>;

export const AdminDriverReadinessListSchema = z.object({
  items: z.array(AdminDriverReadinessItemSchema)
});
export type AdminDriverReadinessListDto = z.infer<typeof AdminDriverReadinessListSchema>;

export const FleetOrganisationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  status: OrgStatusSchema,
  contactName: z.string().nullable(),
  contactEmail: z.string().email().nullable(),
  city: z.string().nullable(),
  memberCount: z.number().int().nonnegative(),
  activeDriverCount: z.number().int().nonnegative(),
  readyDriverCount: z.number().int().nonnegative(),
  needsReviewDriverCount: z.number().int().nonnegative(),
  notEligibleDriverCount: z.number().int().nonnegative(),
  activeJobCount: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type FleetOrganisationDto = z.infer<typeof FleetOrganisationSchema>;

export const FleetOrganisationListSchema = z.object({
  items: z.array(FleetOrganisationSchema)
});
export type FleetOrganisationListDto = z.infer<typeof FleetOrganisationListSchema>;

export const CreateFleetOrganisationSchema = z.object({
  name: z.string().min(2).max(160),
  contactName: z.string().min(2).max(160).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  city: z.string().min(2).max(120).nullable().optional(),
  status: OrgStatusSchema.optional().default("ONBOARDING")
});
export type CreateFleetOrganisationInput = z.infer<typeof CreateFleetOrganisationSchema>;

export const FleetDriverSchema = z.object({
  membershipId: z.string().uuid(),
  fleetOrgId: z.string().uuid(),
  fleetOrgName: z.string().min(2),
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(2),
  fleetRole: OrgRoleSchema,
  membershipActive: z.boolean(),
  driverId: z.string().uuid().nullable(),
  availabilityStatus: DriverAvailabilityStatusSchema.nullable(),
  verificationStatus: EligibleDriverVerificationStatusSchema,
  vehicleType: VehicleTypeSchema.nullable(),
  activeJobId: z.string().uuid().nullable(),
  activeJobStatus: JobStatusSchema.nullable(),
  lastLocationAt: IsoDateTimeSchema.nullable(),
  readinessStatus: AdminDriverReadinessStatusSchema,
  recommendedNextAction: z.string().min(2),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type FleetDriverDto = z.infer<typeof FleetDriverSchema>;

export const FleetDriverListSchema = z.object({
  items: z.array(FleetDriverSchema)
});
export type FleetDriverListDto = z.infer<typeof FleetDriverListSchema>;

export const FleetDriverRecentWorkSchema = z.object({
  jobId: z.string().uuid(),
  status: JobStatusSchema,
  pickupAddress: z.string().nullable(),
  dropoffAddress: z.string().nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema
});
export type FleetDriverRecentWorkDto = z.infer<typeof FleetDriverRecentWorkSchema>;

export const FleetReadinessHistoryEventSchema = z.object({
  id: z.string(),
  readinessStatus: AdminDriverReadinessStatusSchema,
  reason: z.string(),
  source: z.string(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: IsoDateTimeSchema
});
export type FleetReadinessHistoryEventDto = z.infer<typeof FleetReadinessHistoryEventSchema>;

export const FleetDriverDetailSchema = z.object({
  driver: FleetDriverSchema,
  recentWork: z.array(FleetDriverRecentWorkSchema),
  readinessHistory: z.array(FleetReadinessHistoryEventSchema),
  readinessHistoryNote: z.string().min(2)
});
export type FleetDriverDetailDto = z.infer<typeof FleetDriverDetailSchema>;

export const CreateFleetInviteSchema = z.object({
  email: z.string().email(),
  role: OrgRoleSchema
});
export type CreateFleetInviteInput = z.infer<typeof CreateFleetInviteSchema>;

export const AddFleetDriverSchema = z
  .object({
    userId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    role: OrgRoleSchema.default("DRIVER")
  })
  .refine((value) => Boolean(value.userId || value.driverId || value.email), {
    message: "fleet_driver_identifier_required"
  });
export type AddFleetDriverInput = z.infer<typeof AddFleetDriverSchema>;

export const UpdateFleetDriverMembershipSchema = z
  .object({
    role: OrgRoleSchema.optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: "fleet_membership_update_requires_fields"
  });
export type UpdateFleetDriverMembershipInput = z.infer<typeof UpdateFleetDriverMembershipSchema>;

export const FleetReadinessSummarySchema = z.object({
  fleetOrgId: z.string().uuid(),
  fleetOrgName: z.string().min(2),
  totalDrivers: z.number().int().nonnegative(),
  readyDrivers: z.number().int().nonnegative(),
  needsReviewDrivers: z.number().int().nonnegative(),
  notEligibleDrivers: z.number().int().nonnegative(),
  onlineDrivers: z.number().int().nonnegative(),
  activeJobs: z.number().int().nonnegative(),
  humanReviewNote: z.string().min(2)
});
export type FleetReadinessSummaryDto = z.infer<typeof FleetReadinessSummarySchema>;

export const EligibleDriverListSchema = z.object({
  items: z.array(EligibleDriverSchema)
});
export type EligibleDriverListDto = z.infer<typeof EligibleDriverListSchema>;

export const CreateBusinessOrgSchema = z.object({
  businessName: z.string().min(2).max(160),
  contactName: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().min(7).max(32),
  city: z.string().min(2).max(120)
});
export type CreateBusinessOrgInput = z.infer<typeof CreateBusinessOrgSchema>;

export const OrgSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  city: z.string().nullable(),
  createdByUserId: z.string().uuid(),
  createdAt: IsoDateTimeSchema
});
export type OrgSummaryDto = z.infer<typeof OrgSummarySchema>;

export const OrgMembershipSummarySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  role: OrgRoleSchema,
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema
});
export type OrgMembershipSummaryDto = z.infer<typeof OrgMembershipSummarySchema>;

export const BusinessContextSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(2),
  platformAdmin: z.boolean().default(false),
  onboarded: z.boolean(),
  currentOrg: OrgSummarySchema.nullable(),
  memberships: z.array(
    z.object({
      membership: OrgMembershipSummarySchema,
      org: OrgSummarySchema
    })
  )
});
export type BusinessContextDto = z.infer<typeof BusinessContextSchema>;

export const IdentityUserStatusSchema = z.enum(["ACTIVE", "INVITED", "INACTIVE"]);
export type IdentityUserStatus = z.infer<typeof IdentityUserStatusSchema>;

export const IdentityMembershipSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  orgName: z.string().min(2),
  orgType: OrgTypeSchema,
  orgStatus: OrgStatusSchema,
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(2),
  role: OrgRoleSchema,
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type IdentityMembershipDto = z.infer<typeof IdentityMembershipSchema>;

export const IdentityUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(2),
  status: IdentityUserStatusSchema,
  platformAdmin: z.boolean(),
  lastSignInAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  memberships: z.array(IdentityMembershipSchema)
});
export type IdentityUserDto = z.infer<typeof IdentityUserSchema>;

export const IdentityUserListSchema = z.object({
  items: z.array(IdentityUserSchema)
});
export type IdentityUserListDto = z.infer<typeof IdentityUserListSchema>;

export const IdentityOrgSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  type: OrgTypeSchema,
  status: OrgStatusSchema,
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  city: z.string().nullable(),
  memberCount: z.number().int().nonnegative(),
  activeMemberCount: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type IdentityOrgDto = z.infer<typeof IdentityOrgSchema>;

export const IdentityOrgListSchema = z.object({
  items: z.array(IdentityOrgSchema)
});
export type IdentityOrgListDto = z.infer<typeof IdentityOrgListSchema>;

export const IdentityInvitationStatusSchema = z.enum(["PENDING", "ACCEPTED", "CANCELLED", "EXPIRED"]);
export type IdentityInvitationStatus = z.infer<typeof IdentityInvitationStatusSchema>;

export const IdentityInvitationSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: OrgRoleSchema,
  status: IdentityInvitationStatusSchema,
  invitedBy: z.string().uuid().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type IdentityInvitationDto = z.infer<typeof IdentityInvitationSchema>;

export const IdentityAccessEventSchema = z.object({
  id: z.string(),
  orgId: z.string().uuid(),
  eventType: z.string().min(2),
  actorName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  summary: z.string().min(2),
  metadata: z.record(z.unknown())
});
export type IdentityAccessEventDto = z.infer<typeof IdentityAccessEventSchema>;

export const IdentityOrgMembersSchema = z.object({
  org: IdentityOrgSchema,
  members: z.array(IdentityMembershipSchema),
  invitations: z.array(IdentityInvitationSchema),
  accessEvents: z.array(IdentityAccessEventSchema).default([])
});
export type IdentityOrgMembersDto = z.infer<typeof IdentityOrgMembersSchema>;

export const BusinessTeamSchema = IdentityOrgMembersSchema;
export type BusinessTeamDto = z.infer<typeof BusinessTeamSchema>;

export const FleetTeamSchema = z.object({
  fleetOrgId: z.string().uuid(),
  fleetOrgName: z.string().min(2),
  currentUserRole: OrgRoleSchema,
  canManageInvites: z.boolean(),
  members: z.array(IdentityMembershipSchema),
  invitations: z.array(IdentityInvitationSchema),
  accessEvents: z.array(IdentityAccessEventSchema)
});
export type FleetTeamDto = z.infer<typeof FleetTeamSchema>;

export const CreateTeamInviteSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(160).optional(),
  role: OrgRoleSchema
});
export type CreateTeamInviteInput = z.infer<typeof CreateTeamInviteSchema>;

export const UpdateMembershipSchema = z.object({
  role: OrgRoleSchema.optional(),
  isActive: z.boolean().optional()
}).refine((value) => value.role !== undefined || value.isActive !== undefined, {
  message: "membership_update_requires_change"
});
export type UpdateMembershipInput = z.infer<typeof UpdateMembershipSchema>;

export const RestaurantStatusSchema = z.enum(["DRAFT", "ACTIVE"]);
export type RestaurantStatus = z.infer<typeof RestaurantStatusSchema>;

const RestaurantSlugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const CreateRestaurantSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(2).max(160),
  slug: RestaurantSlugSchema,
  status: RestaurantStatusSchema.default("ACTIVE")
});
export type CreateRestaurantInput = z.infer<typeof CreateRestaurantSchema>;

export const RestaurantSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(2),
  slug: RestaurantSlugSchema,
  status: RestaurantStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type RestaurantDto = z.infer<typeof RestaurantSchema>;

export const RestaurantListSchema = z.object({
  items: z.array(RestaurantSchema)
});
export type RestaurantListDto = z.infer<typeof RestaurantListSchema>;

export const CreateMenuCategorySchema = z.object({
  name: z.string().min(2).max(120),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().optional().default(true)
});
export type CreateMenuCategoryInput = z.infer<typeof CreateMenuCategorySchema>;

export const UpdateMenuCategorySchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "at_least_one_menu_category_field_required"
  });
export type UpdateMenuCategoryInput = z.infer<typeof UpdateMenuCategorySchema>;

export const MenuCategorySchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(2),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type MenuCategoryDto = z.infer<typeof MenuCategorySchema>;

export const CreateMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(160),
  description: z.string().min(2).max(1000).nullable().optional(),
  priceCents: z.number().int().positive(),
  currency: z.string().length(3).default("GBP"),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().optional().default(true)
});
export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;

export const UpdateMenuItemSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(2).max(160).optional(),
    description: z.string().min(2).max(1000).nullable().optional(),
    priceCents: z.number().int().positive().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "at_least_one_menu_item_field_required"
  });
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().nullable(),
  priceCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type MenuItemDto = z.infer<typeof MenuItemSchema>;

export const RestaurantMenuCategorySchema = MenuCategorySchema.extend({
  items: z.array(MenuItemSchema)
});
export type RestaurantMenuCategoryDto = z.infer<typeof RestaurantMenuCategorySchema>;

export const RestaurantMenuSchema = z.object({
  restaurant: RestaurantSchema,
  categories: z.array(RestaurantMenuCategorySchema)
});
export type RestaurantMenuDto = z.infer<typeof RestaurantMenuSchema>;

export const PublicRestaurantSchema = RestaurantSchema.pick({
  id: true,
  name: true,
  slug: true,
  status: true
});
export type PublicRestaurantDto = z.infer<typeof PublicRestaurantSchema>;

export const PublicMenuItemSchema = MenuItemSchema.pick({
  id: true,
  name: true,
  description: true,
  priceCents: true,
  currency: true,
  sortOrder: true
});
export type PublicMenuItemDto = z.infer<typeof PublicMenuItemSchema>;

export const PublicRestaurantMenuCategorySchema = MenuCategorySchema.pick({
  id: true,
  name: true,
  sortOrder: true
}).extend({
  items: z.array(PublicMenuItemSchema)
});
export type PublicRestaurantMenuCategoryDto = z.infer<typeof PublicRestaurantMenuCategorySchema>;

export const PublicRestaurantMenuSchema = z.object({
  restaurant: PublicRestaurantSchema,
  categories: z.array(PublicRestaurantMenuCategorySchema)
});
export type PublicRestaurantMenuDto = z.infer<typeof PublicRestaurantMenuSchema>;

export const MenuHistoryEventTypeSchema = z.enum([
  "MENU_CATEGORY_CREATED",
  "MENU_CATEGORY_UPDATED",
  "MENU_CATEGORY_REORDERED",
  "MENU_CATEGORY_ROLLBACK_APPLIED",
  "MENU_ITEM_CREATED",
  "MENU_ITEM_UPDATED",
  "MENU_ITEM_PRICE_UPDATED",
  "MENU_ITEM_VISIBILITY_UPDATED",
  "MENU_ITEM_REORDERED",
  "MENU_ITEM_MOVED_CATEGORY",
  "MENU_ITEM_ROLLBACK_APPLIED"
]);
export type MenuHistoryEventType = z.infer<typeof MenuHistoryEventTypeSchema>;

export const MenuHistoryResourceTypeSchema = z.enum(["category", "item"]);
export type MenuHistoryResourceType = z.infer<typeof MenuHistoryResourceTypeSchema>;

export const MenuRollbackReadinessSchema = z.enum(["ROLLBACK_PREPARED", "NOT_REVERSIBLE", "INSUFFICIENT_METADATA"]);
export type MenuRollbackReadiness = z.infer<typeof MenuRollbackReadinessSchema>;

export const MenuHistoryEventSchema = z.object({
  id: z.string(),
  eventType: MenuHistoryEventTypeSchema,
  actorName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  summary: z.string(),
  resourceType: MenuHistoryResourceTypeSchema,
  resourceName: z.string().nullable(),
  changedFields: z.array(z.string()),
  rollbackReadiness: MenuRollbackReadinessSchema,
  rollbackReason: z.string(),
  reversibleFields: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).default({})
});
export type MenuHistoryEventDto = z.infer<typeof MenuHistoryEventSchema>;

export const MenuHistorySchema = z.object({
  items: z.array(MenuHistoryEventSchema)
});
export type MenuHistoryDto = z.infer<typeof MenuHistorySchema>;

export const AdminMenuHistoryEventSchema = MenuHistoryEventSchema.extend({
  orgId: z.string().nullable(),
  orgName: z.string().nullable(),
  restaurantId: z.string().nullable(),
  restaurantName: z.string().nullable()
});
export type AdminMenuHistoryEventDto = z.infer<typeof AdminMenuHistoryEventSchema>;

export const AdminMenuHistorySchema = z.object({
  items: z.array(AdminMenuHistoryEventSchema)
});
export type AdminMenuHistoryDto = z.infer<typeof AdminMenuHistorySchema>;

export const MenuRollbackFieldSchema = z.object({
  field: z.string(),
  currentValue: z.unknown().nullable(),
  expectedValue: z.unknown().nullable(),
  rollbackValue: z.unknown().nullable(),
  willChange: z.boolean()
});
export type MenuRollbackFieldDto = z.infer<typeof MenuRollbackFieldSchema>;

export const MenuRollbackPreviewSchema = z.object({
  auditId: z.string(),
  eligible: z.boolean(),
  reason: z.string(),
  eventType: MenuHistoryEventTypeSchema.nullable(),
  resourceType: MenuHistoryResourceTypeSchema.nullable(),
  resourceId: z.string().nullable(),
  resourceName: z.string().nullable(),
  fields: z.array(MenuRollbackFieldSchema),
  warnings: z.array(z.string())
});
export type MenuRollbackPreviewDto = z.infer<typeof MenuRollbackPreviewSchema>;

export const ApplyMenuRollbackSchema = z.object({
  confirmation: z.literal("ROLLBACK MENU CHANGE")
});
export type ApplyMenuRollbackInput = z.infer<typeof ApplyMenuRollbackSchema>;

export const MenuRollbackResultSchema = z.object({
  auditId: z.string(),
  rollbackAuditId: z.string(),
  resourceType: MenuHistoryResourceTypeSchema,
  resourceId: z.string(),
  restoredFields: z.array(z.string()),
  warnings: z.array(z.string()),
  appliedAt: IsoDateTimeSchema
});
export type MenuRollbackResultDto = z.infer<typeof MenuRollbackResultSchema>;

export const CustomerOrderStatusSchema = z.enum(["SUBMITTED", "PAYMENT_AUTHORIZED", "PAYMENT_FAILED", "FULFILLED"]);
export type CustomerOrderStatus = z.infer<typeof CustomerOrderStatusSchema>;

export const SubmitCustomerOrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive().max(20)
});
export type SubmitCustomerOrderItemInput = z.infer<typeof SubmitCustomerOrderItemSchema>;

export const SubmitCustomerOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(2).max(160),
    email: z.string().email(),
    phone: z.string().min(7).max(32)
  }),
  delivery: z.object({
    address: z.string().min(5).max(500),
    notes: z.string().min(2).max(1000).nullable().optional()
  }),
  items: z.array(SubmitCustomerOrderItemSchema).min(1).max(50),
  paymentMethodId: z.string().min(3).max(128)
});
export type SubmitCustomerOrderInput = z.infer<typeof SubmitCustomerOrderSchema>;

export const PublicCustomerOrderItemSchema = z.object({
  id: z.string().uuid(),
  menuItemId: z.string().uuid(),
  name: z.string().min(2),
  quantity: z.number().int().positive(),
  unitPriceCents: CurrencyAmountSchema,
  lineTotalCents: CurrencyAmountSchema,
  currency: z.string().length(3)
});
export type PublicCustomerOrderItemDto = z.infer<typeof PublicCustomerOrderItemSchema>;

export const PublicCustomerOrderSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  jobId: z.string().uuid(),
  paymentId: z.string().uuid(),
  status: CustomerOrderStatusSchema,
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(7),
  deliveryAddress: z.string().min(5),
  deliveryNotes: z.string().nullable(),
  subtotalCents: CurrencyAmountSchema,
  deliveryFeeCents: CurrencyAmountSchema,
  totalCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  createdAt: IsoDateTimeSchema,
  items: z.array(PublicCustomerOrderItemSchema)
});
export type PublicCustomerOrderDto = z.infer<typeof PublicCustomerOrderSchema>;

export const PublicCustomerOrderJobSchema = z.object({
  id: z.string().uuid(),
  status: JobStatusSchema,
  etaMinutes: EtaMinutesSchema,
  pickupAddress: z.string(),
  dropoffAddress: z.string()
});
export type PublicCustomerOrderJobDto = z.infer<typeof PublicCustomerOrderJobSchema>;

export const PublicCustomerOrderPaymentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "REQUIRES_PAYMENT_METHOD",
    "REQUIRES_CONFIRMATION",
    "AUTHORIZED",
    "CAPTURED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
    "FAILED",
    "CANCELLED"
  ]),
  amountAuthorizedCents: CurrencyAmountSchema,
  amountCapturedCents: CurrencyAmountSchema,
  totalCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  lastError: z.string().nullable()
});
export type PublicCustomerOrderPaymentDto = z.infer<typeof PublicCustomerOrderPaymentSchema>;

export const SubmitCustomerOrderResponseSchema = z.object({
  order: PublicCustomerOrderSchema,
  job: PublicCustomerOrderJobSchema,
  payment: PublicCustomerOrderPaymentSchema
});
export type SubmitCustomerOrderResponseDto = z.infer<typeof SubmitCustomerOrderResponseSchema>;

export const BusinessCustomerOrderTimelineEventSchema = z.object({
  id: z.string(),
  eventType: z.string().min(2),
  createdAt: IsoDateTimeSchema,
  summary: z.string().min(2)
});
export type BusinessCustomerOrderTimelineEventDto = z.infer<typeof BusinessCustomerOrderTimelineEventSchema>;

export const BusinessCustomerOrderSchema = z.object({
  id: z.string().uuid(),
  status: CustomerOrderStatusSchema,
  restaurant: z.object({
    id: z.string().uuid(),
    name: z.string().min(2),
    slug: RestaurantSlugSchema
  }),
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7)
  }),
  delivery: z.object({
    address: z.string().min(5),
    addressSummary: z.string().min(2),
    notes: z.string().nullable()
  }),
  items: z.array(PublicCustomerOrderItemSchema),
  subtotalCents: CurrencyAmountSchema,
  deliveryFeeCents: CurrencyAmountSchema,
  totalCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  payment: PublicCustomerOrderPaymentSchema,
  job: PublicCustomerOrderJobSchema,
  timeline: z.array(BusinessCustomerOrderTimelineEventSchema),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type BusinessCustomerOrderDto = z.infer<typeof BusinessCustomerOrderSchema>;

export const BusinessCustomerOrderListSchema = z.object({
  items: z.array(BusinessCustomerOrderSchema)
});
export type BusinessCustomerOrderListDto = z.infer<typeof BusinessCustomerOrderListSchema>;

export const PublicOrderTrackingSchema = z.object({
  order: z.object({
    id: z.string().uuid(),
    status: CustomerOrderStatusSchema,
    totalCents: CurrencyAmountSchema,
    currency: z.string().length(3),
    createdAt: IsoDateTimeSchema
  }),
  restaurant: z.object({
    id: z.string().uuid(),
    name: z.string().min(2),
    slug: RestaurantSlugSchema
  }),
  delivery: z.object({
    address: z.string().min(5),
    addressSummary: z.string().min(2),
    notes: z.string().nullable()
  }),
  job: PublicCustomerOrderJobSchema,
  payment: PublicCustomerOrderPaymentSchema,
  tracking: z.object({
    driverAssigned: z.boolean(),
    latestLocationAt: IsoDateTimeSchema.nullable(),
    dispatchAttemptsCount: z.number().int().nonnegative(),
    timeline: z.array(BusinessCustomerOrderTimelineEventSchema)
  })
});
export type PublicOrderTrackingDto = z.infer<typeof PublicOrderTrackingSchema>;

export const BusinessNotificationSeveritySchema = z.enum(["info", "success", "warning", "danger"]);
export type BusinessNotificationSeverity = z.infer<typeof BusinessNotificationSeveritySchema>;

export const BusinessNotificationEntityTypeSchema = z.enum(["job", "order", "payment"]);
export type BusinessNotificationEntityType = z.infer<typeof BusinessNotificationEntityTypeSchema>;

export const BusinessNotificationSchema = z.object({
  id: z.string().min(2),
  type: z.string().min(2),
  title: z.string().min(2),
  message: z.string().min(2),
  severity: BusinessNotificationSeveritySchema,
  entityType: BusinessNotificationEntityTypeSchema,
  entityId: z.string().uuid(),
  createdAt: IsoDateTimeSchema,
  read: z.boolean()
});
export type BusinessNotificationDto = z.infer<typeof BusinessNotificationSchema>;

export const BusinessNotificationListSchema = z.object({
  items: z.array(BusinessNotificationSchema)
});
export type BusinessNotificationListDto = z.infer<typeof BusinessNotificationListSchema>;

export const BusinessNotificationReadSchema = z.object({
  ok: z.literal(true),
  notificationId: z.string().min(2),
  readAt: IsoDateTimeSchema
});
export type BusinessNotificationReadDto = z.infer<typeof BusinessNotificationReadSchema>;

export const BusinessNotificationReadAllSchema = z.object({
  ok: z.literal(true),
  readAt: IsoDateTimeSchema,
  updatedCount: z.number().int().nonnegative()
});
export type BusinessNotificationReadAllDto = z.infer<typeof BusinessNotificationReadAllSchema>;

export const PaymentProviderSchema = z.enum(["stripe"]);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const PaymentStatusSchema = z.enum([
  "REQUIRES_PAYMENT_METHOD",
  "REQUIRES_CONFIRMATION",
  "AUTHORIZED",
  "CAPTURED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "FAILED",
  "CANCELLED"
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const AdminInterventionSeveritySchema = z.enum(["danger", "warning", "info"]);
export type AdminInterventionSeverity = z.infer<typeof AdminInterventionSeveritySchema>;

export const AdminInterventionEntityTypeSchema = z.enum(["job", "order", "payment", "outbox", "notification"]);
export type AdminInterventionEntityType = z.infer<typeof AdminInterventionEntityTypeSchema>;

export const AdminInterventionItemSchema = z.object({
  id: z.string().min(2),
  category: z.enum(["dispatch_failed", "stuck_job", "payment_failure", "payment_capture_pending", "notification_issue"]),
  severity: AdminInterventionSeveritySchema,
  title: z.string().min(2),
  summary: z.string().min(2),
  orgId: z.string().uuid().nullable(),
  orgName: z.string().nullable(),
  restaurantName: z.string().nullable(),
  entityType: AdminInterventionEntityTypeSchema,
  entityId: z.string().min(2),
  jobId: z.string().uuid().nullable(),
  orderId: z.string().uuid().nullable(),
  paymentId: z.string().uuid().nullable(),
  createdAt: IsoDateTimeSchema
});
export type AdminInterventionItemDto = z.infer<typeof AdminInterventionItemSchema>;

export const AdminJobSummarySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid().nullable(),
  orgName: z.string().nullable(),
  restaurantName: z.string().nullable(),
  restaurantSlug: z.string().nullable(),
  status: JobStatusSchema,
  attentionLevel: JobAttentionLevelSchema,
  attentionReason: z.string().nullable(),
  customerName: z.string().nullable(),
  driverName: z.string().nullable(),
  vehicleRequired: VehicleTypeSchema,
  paymentId: z.string().uuid().nullable(),
  paymentStatus: PaymentStatusSchema.nullable(),
  pickupAddress: z.string(),
  dropoffAddress: z.string(),
  etaMinutes: EtaMinutesSchema,
  totalCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type AdminJobSummaryDto = z.infer<typeof AdminJobSummarySchema>;

export const AdminJobListSchema = z.object({
  items: z.array(AdminJobSummarySchema)
});
export type AdminJobListDto = z.infer<typeof AdminJobListSchema>;

export const AdminOrderSummarySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  orgName: z.string().min(2),
  restaurantId: z.string().uuid(),
  restaurantName: z.string().min(2),
  restaurantSlug: RestaurantSlugSchema,
  status: CustomerOrderStatusSchema,
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(7),
  deliveryAddressSummary: z.string().min(2),
  totalCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  paymentId: z.string().uuid(),
  paymentStatus: PaymentStatusSchema,
  jobId: z.string().uuid(),
  jobStatus: JobStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type AdminOrderSummaryDto = z.infer<typeof AdminOrderSummarySchema>;

export const AdminOrderListSchema = z.object({
  items: z.array(AdminOrderSummarySchema)
});
export type AdminOrderListDto = z.infer<typeof AdminOrderListSchema>;

export const AdminOutboxItemSchema = z.object({
  id: z.string().uuid(),
  aggregateType: z.string().min(2),
  aggregateId: z.string().uuid(),
  eventType: z.string().min(2),
  retryCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  processedAt: IsoDateTimeSchema.nullable(),
  nextAttemptAt: IsoDateTimeSchema,
  createdAt: IsoDateTimeSchema
});
export type AdminOutboxItemDto = z.infer<typeof AdminOutboxItemSchema>;

export const AdminOutboxListSchema = z.object({
  items: z.array(AdminOutboxItemSchema)
});
export type AdminOutboxListDto = z.infer<typeof AdminOutboxListSchema>;

export const AdminNotificationChannelSchema = z.enum(["EMAIL", "WEBHOOK"]);
export type AdminNotificationChannel = z.infer<typeof AdminNotificationChannelSchema>;

export const AdminNotificationTestTypeSchema = z.enum(["DEMO_REQUEST_CREATED", "ORG_INVITE_CREATED"]);
export type AdminNotificationTestType = z.infer<typeof AdminNotificationTestTypeSchema>;

export const CreateNotificationTestSchema = z.object({
  channel: AdminNotificationChannelSchema,
  notificationType: AdminNotificationTestTypeSchema,
  recipientEmail: z.string().trim().email().max(254).optional()
});
export type CreateNotificationTestInput = z.infer<typeof CreateNotificationTestSchema>;

export const AdminNotificationDeliveryStatusSchema = z.enum(["pending", "sent", "skipped", "failed", "retrying"]);
export type AdminNotificationDeliveryStatus = z.infer<typeof AdminNotificationDeliveryStatusSchema>;

export const AdminNotificationDiagnosticEventSchema = z.object({
  id: z.string(),
  outboxMessageId: z.string().uuid().nullable(),
  eventType: z.string().min(2),
  notificationType: z.string().nullable(),
  channel: z.string().nullable(),
  status: AdminNotificationDeliveryStatusSchema,
  provider: z.string().nullable(),
  lastAttemptAt: IsoDateTimeSchema.nullable(),
  retryCount: z.number().int().nonnegative(),
  safeErrorSummary: z.string().nullable(),
  createdAt: IsoDateTimeSchema
});
export type AdminNotificationDiagnosticEventDto = z.infer<typeof AdminNotificationDiagnosticEventSchema>;

export const NotificationDiagnosticsSchema = z.object({
  configuration: z.object({
    emailConfigured: z.boolean(),
    webhookConfigured: z.boolean(),
    adminEmailConfigured: z.boolean(),
    fromEmailConfigured: z.boolean()
  }),
  counts: z.object({
    pending: z.number().int().nonnegative(),
    sent: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    retrying: z.number().int().nonnegative()
  }),
  recentEvents: z.array(AdminNotificationDiagnosticEventSchema),
  recentTestEvents: z.array(AdminNotificationDiagnosticEventSchema)
});
export type NotificationDiagnosticsDto = z.infer<typeof NotificationDiagnosticsSchema>;

export const NotificationTestResponseSchema = z.object({
  outboxMessageId: z.string().uuid(),
  eventType: z.literal("TEST_ADMIN_NOTIFICATION"),
  channel: AdminNotificationChannelSchema,
  notificationType: AdminNotificationTestTypeSchema,
  status: z.literal("queued"),
  message: z.string().min(2)
});
export type NotificationTestResponseDto = z.infer<typeof NotificationTestResponseSchema>;

export const AdminSystemHealthSchema = z.object({
  liveness: z.object({
    status: z.enum(["ok", "error"]),
    service: z.literal("api")
  }),
  readiness: z.object({
    status: z.enum(["ok", "error"]),
    service: z.literal("api"),
    message: z.string().nullable()
  }),
  outboxBacklogCount: z.number().int().nonnegative(),
  outboxRetryingCount: z.number().int().nonnegative(),
  outboxFailedCount: z.number().int().nonnegative(),
  paymentCapturePendingCount: z.number().int().nonnegative(),
  notificationIssueCount: z.number().int().nonnegative()
});
export type AdminSystemHealthDto = z.infer<typeof AdminSystemHealthSchema>;

export const AdminOverviewSchema = z.object({
  interventionQueue: z.array(AdminInterventionItemSchema),
  activeJobs: z.array(AdminJobSummarySchema),
  recentOrders: z.array(AdminOrderSummarySchema),
  health: AdminSystemHealthSchema
});
export type AdminOverviewDto = z.infer<typeof AdminOverviewSchema>;

export const DailyBriefingScopeSchema = z.enum(["business", "admin"]);
export type DailyBriefingScope = z.infer<typeof DailyBriefingScopeSchema>;

export const DailyBriefingItemCategorySchema = z.enum([
  "dispatch_failed",
  "payment_failed",
  "delivered_uncaptured",
  "active_without_driver",
  "stale_job",
  "support_follow_up"
]);
export type DailyBriefingItemCategory = z.infer<typeof DailyBriefingItemCategorySchema>;

export const DailyBriefingSeveritySchema = z.enum(["danger", "warning", "success"]);
export type DailyBriefingSeverity = z.infer<typeof DailyBriefingSeveritySchema>;

export const DailyBriefingEntityTypeSchema = z.enum(["order", "job", "payment"]);
export type DailyBriefingEntityType = z.infer<typeof DailyBriefingEntityTypeSchema>;

export const DailyBriefingItemSchema = z.object({
  id: z.string().min(3),
  category: DailyBriefingItemCategorySchema,
  severity: DailyBriefingSeveritySchema,
  title: z.string().min(2),
  summary: z.string().min(2),
  reason: z.string().min(2),
  entityType: DailyBriefingEntityTypeSchema,
  entityId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  jobId: z.string().uuid().nullable(),
  paymentId: z.string().uuid().nullable(),
  orgId: z.string().uuid().nullable(),
  orgName: z.string().nullable(),
  restaurantName: z.string().nullable(),
  customerName: z.string().nullable(),
  orderStatus: CustomerOrderStatusSchema.nullable(),
  jobStatus: JobStatusSchema.nullable(),
  paymentStatus: PaymentStatusSchema.nullable(),
  detectedAt: IsoDateTimeSchema,
  ageMinutes: z.number().int().nonnegative(),
  href: z.string().min(2),
  recoverySuggestion: DispatchRecoverySuggestionSchema.nullable().optional(),
  incidentSummary: OperationalIncidentSummarySchema.nullable().optional()
});
export type DailyBriefingItemDto = z.infer<typeof DailyBriefingItemSchema>;

export const DailyBriefingRecommendationSchema = z.object({
  id: z.string().min(3),
  label: z.string().min(2),
  summary: z.string().min(2),
  href: z.string().min(2),
  entityType: DailyBriefingEntityTypeSchema,
  entityId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  jobId: z.string().uuid().nullable(),
  paymentId: z.string().uuid().nullable()
});
export type DailyBriefingRecommendationDto = z.infer<typeof DailyBriefingRecommendationSchema>;

export const DailyBriefingOperatingStateSchema = z.object({
  ordersToday: z.number().int().nonnegative(),
  activeJobs: z.number().int().nonnegative(),
  fulfilledOrders: z.number().int().nonnegative(),
  paymentRisks: z.number().int().nonnegative(),
  openSupportEscalations: z.number().int().nonnegative(),
  highCriticalSupportEscalations: z.number().int().nonnegative(),
  oldestOpenSupportEscalationAgeMinutes: z.number().int().nonnegative().nullable(),
  availableDrivers: z.number().int().nonnegative().nullable()
});
export type DailyBriefingOperatingStateDto = z.infer<typeof DailyBriefingOperatingStateSchema>;

export const DailyBriefingSchema = z.object({
  scope: DailyBriefingScopeSchema,
  generatedAt: IsoDateTimeSchema,
  headline: z.string().min(2),
  summary: z.string().min(2),
  attentionCount: z.number().int().nonnegative(),
  criticalItems: z.array(DailyBriefingItemSchema),
  operatingState: DailyBriefingOperatingStateSchema,
  recommendations: z.array(DailyBriefingRecommendationSchema),
  guidance: z.string().min(2)
});
export type DailyBriefingDto = z.infer<typeof DailyBriefingSchema>;

export const EndOfDayReportScopeSchema = z.enum(["business", "admin"]);
export type EndOfDayReportScope = z.infer<typeof EndOfDayReportScopeSchema>;

export const EndOfDayReportDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type EndOfDayReportDate = z.infer<typeof EndOfDayReportDateSchema>;

export const EndOfDayActionTypeSchema = z.enum([
  "REVIEW_PAYMENT_RISK",
  "RETRY_DISPATCH",
  "ASSIGN_DRIVER",
  "CHECK_DELAYED_ORDER",
  "REVIEW_CUSTOMER_COMMUNICATION_DRAFT",
  "REVIEW_SUPPORT_ESCALATION"
]);
export type EndOfDayActionType = z.infer<typeof EndOfDayActionTypeSchema>;

export const EndOfDayActionSeveritySchema = z.enum(["danger", "warning", "info"]);
export type EndOfDayActionSeverity = z.infer<typeof EndOfDayActionSeveritySchema>;

export const EndOfDayOperatingSummarySchema = z.object({
  ordersReceived: z.number().int().nonnegative(),
  fulfilledOrders: z.number().int().nonnegative(),
  activeOrUnresolvedOrders: z.number().int().nonnegative(),
  cancelledOrPaymentFailedOrders: z.number().int().nonnegative(),
  activeJobs: z.number().int().nonnegative(),
  deliveredJobs: z.number().int().nonnegative(),
  dispatchFailures: z.number().int().nonnegative(),
  staleOrDelayedJobs: z.number().int().nonnegative()
});
export type EndOfDayOperatingSummaryDto = z.infer<typeof EndOfDayOperatingSummarySchema>;

export const EndOfDayPaymentsSummarySchema = z.object({
  authorized: z.number().int().nonnegative(),
  captured: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  deliveredNotCaptured: z.number().int().nonnegative(),
  payoutReviewCount: z.number().int().nonnegative()
});
export type EndOfDayPaymentsSummaryDto = z.infer<typeof EndOfDayPaymentsSummarySchema>;

export const EndOfDayIncidentsSummarySchema = z.object({
  dispatchFailed: z.number().int().nonnegative(),
  delayIncidents: z.number().int().nonnegative(),
  paymentRisks: z.number().int().nonnegative(),
  driverFollowUpIncidents: z.number().int().nonnegative(),
  openSupportEscalations: z.number().int().nonnegative(),
  highCriticalSupportEscalations: z.number().int().nonnegative(),
  supportClosedToday: z.number().int().nonnegative(),
  unresolvedRecommendations: z.number().int().nonnegative()
});
export type EndOfDayIncidentsSummaryDto = z.infer<typeof EndOfDayIncidentsSummarySchema>;

export const EndOfDayActionItemSchema = z.object({
  id: z.string().min(3),
  type: EndOfDayActionTypeSchema,
  severity: EndOfDayActionSeveritySchema,
  label: z.string().min(2),
  summary: z.string().min(2),
  href: z.string().min(2),
  entityType: DailyBriefingEntityTypeSchema,
  entityId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  jobId: z.string().uuid().nullable(),
  paymentId: z.string().uuid().nullable()
});
export type EndOfDayActionItemDto = z.infer<typeof EndOfDayActionItemSchema>;

export const EndOfDayEvidenceLinkSchema = z.object({
  id: z.string().min(3),
  label: z.string().min(2),
  summary: z.string().min(2),
  href: z.string().min(2),
  entityType: DailyBriefingEntityTypeSchema,
  entityId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  jobId: z.string().uuid().nullable(),
  paymentId: z.string().uuid().nullable()
});
export type EndOfDayEvidenceLinkDto = z.infer<typeof EndOfDayEvidenceLinkSchema>;

export const EndOfDayReportSchema = z.object({
  scope: EndOfDayReportScopeSchema,
  date: EndOfDayReportDateSchema,
  generatedAt: IsoDateTimeSchema,
  headline: z.string().min(2),
  summary: z.string().min(2),
  unresolvedCount: z.number().int().nonnegative(),
  operatingSummary: EndOfDayOperatingSummarySchema,
  paymentsSummary: EndOfDayPaymentsSummarySchema,
  incidentsSummary: EndOfDayIncidentsSummarySchema,
  unresolvedActions: z.array(EndOfDayActionItemSchema),
  evidenceLinks: z.array(EndOfDayEvidenceLinkSchema),
  guidance: z.string().min(2)
});
export type EndOfDayReportDto = z.infer<typeof EndOfDayReportSchema>;

export const PilotWorkspaceModeSchema = z.enum(["DEMO", "CONTROLLED_PILOT", "INTERNAL_TEST", "LIVE_READY"]);
export type PilotWorkspaceMode = z.infer<typeof PilotWorkspaceModeSchema>;

export const PilotWorkspaceStatusSchema = z.enum([
  "DRAFT",
  "ONBOARDING",
  "READY_FOR_REHEARSAL",
  "IN_REHEARSAL",
  "PAUSED",
  "ACTIVE",
  "CLOSED"
]);
export type PilotWorkspaceStatus = z.infer<typeof PilotWorkspaceStatusSchema>;

export const PilotReadinessStageSchema = z.enum([
  "NOT_STARTED",
  "MERCHANT_SETUP",
  "COURIER_SETUP",
  "PAYMENT_CHECKS",
  "SUPPORT_OWNERS_ASSIGNED",
  "REHEARSAL_READY",
  "PILOT_READY"
]);
export type PilotReadinessStage = z.infer<typeof PilotReadinessStageSchema>;

export const PilotReadinessCheckKeySchema = z.enum([
  "merchant_profile_ready",
  "menu_ready",
  "courier_pool_ready",
  "payment_flow_verified",
  "support_owner_assigned",
  "escalation_playbook_reviewed",
  "tracking_route_verified",
  "paid_delivery_proof_current",
  "browser_smoke_current",
  "known_limitations_reviewed"
]);
export type PilotReadinessCheckKey = z.infer<typeof PilotReadinessCheckKeySchema>;

export const PilotReadinessCheckStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "PASSED", "BLOCKED", "WAIVED"]);
export type PilotReadinessCheckStatus = z.infer<typeof PilotReadinessCheckStatusSchema>;

export const PilotPostureCountsSchema = z.object({
  activeJobs: z.number().int().nonnegative(),
  unresolvedSupportEscalations: z.number().int().nonnegative(),
  paymentRisks: z.number().int().nonnegative(),
  readyCouriers: z.number().int().nonnegative()
});
export type PilotPostureCountsDto = z.infer<typeof PilotPostureCountsSchema>;

export const PilotWorkspaceSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  orgName: z.string().nullable(),
  mode: PilotWorkspaceModeSchema,
  status: PilotWorkspaceStatusSchema,
  readinessStage: PilotReadinessStageSchema,
  pilotOwner: z.string().nullable(),
  supportOwner: z.string().nullable(),
  courierOwner: z.string().nullable(),
  paymentOwner: z.string().nullable(),
  goLiveTargetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string().nullable(),
  checklistTotal: z.number().int().nonnegative(),
  checklistPassed: z.number().int().nonnegative(),
  posture: PilotPostureCountsSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type PilotWorkspaceDto = z.infer<typeof PilotWorkspaceSchema>;

export const PilotWorkspaceListSchema = z.object({
  items: z.array(PilotWorkspaceSchema)
});
export type PilotWorkspaceListDto = z.infer<typeof PilotWorkspaceListSchema>;

export const CreatePilotWorkspaceSchema = z.object({
  orgId: z.string().uuid(),
  mode: PilotWorkspaceModeSchema.default("DEMO"),
  status: PilotWorkspaceStatusSchema.default("DRAFT"),
  readinessStage: PilotReadinessStageSchema.default("NOT_STARTED"),
  pilotOwner: z.string().trim().min(1).nullable().optional(),
  supportOwner: z.string().trim().min(1).nullable().optional(),
  courierOwner: z.string().trim().min(1).nullable().optional(),
  paymentOwner: z.string().trim().min(1).nullable().optional(),
  goLiveTargetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional()
});
export type CreatePilotWorkspaceInput = z.infer<typeof CreatePilotWorkspaceSchema>;

export const UpdatePilotWorkspaceSchema = CreatePilotWorkspaceSchema.omit({ orgId: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "pilot_workspace_update_requires_fields" }
);
export type UpdatePilotWorkspaceInput = z.infer<typeof UpdatePilotWorkspaceSchema>;

export const PilotReadinessCheckSchema = z.object({
  id: z.string().uuid(),
  pilotWorkspaceId: z.string().uuid(),
  key: PilotReadinessCheckKeySchema,
  label: z.string().min(2),
  status: PilotReadinessCheckStatusSchema,
  evidence: z.string().nullable(),
  updatedBy: z.string().uuid().nullable(),
  updatedAt: IsoDateTimeSchema
});
export type PilotReadinessCheckDto = z.infer<typeof PilotReadinessCheckSchema>;

export const PilotReadinessCheckListSchema = z.object({
  items: z.array(PilotReadinessCheckSchema)
});
export type PilotReadinessCheckListDto = z.infer<typeof PilotReadinessCheckListSchema>;

export const UpdatePilotReadinessCheckSchema = z
  .object({
    status: PilotReadinessCheckStatusSchema.optional(),
    evidence: z.string().trim().min(1).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "pilot_readiness_check_update_requires_fields" });
export type UpdatePilotReadinessCheckInput = z.infer<typeof UpdatePilotReadinessCheckSchema>;

export const BusinessPilotStatusSchema = z.object({
  workspace: PilotWorkspaceSchema.nullable(),
  checks: z.array(PilotReadinessCheckSchema),
  guidance: z.string().min(2)
});
export type BusinessPilotStatusDto = z.infer<typeof BusinessPilotStatusSchema>;

export const ValidationEvidenceTypeSchema = z.enum([
  "RELEASE_VERIFY",
  "PAID_DELIVERY_PROOF",
  "PLAYWRIGHT_SMOKE",
  "PLAYWRIGHT_SMOKE_REQUIRED_AUTH"
]);
export type ValidationEvidenceType = z.infer<typeof ValidationEvidenceTypeSchema>;

export const ValidationEvidenceStatusSchema = z.enum(["PASSED", "FAILED", "SKIPPED", "UNKNOWN"]);
export type ValidationEvidenceStatus = z.infer<typeof ValidationEvidenceStatusSchema>;

export const ValidationEvidenceRunSchema = z.object({
  id: z.string().uuid(),
  evidenceType: ValidationEvidenceTypeSchema,
  status: ValidationEvidenceStatusSchema,
  environment: z.string().min(2),
  source: z.string().min(2),
  command: z.string().nullable(),
  summary: z.record(z.unknown()),
  artifactPath: z.string().nullable(),
  relatedOrderId: z.string().uuid().nullable(),
  relatedJobId: z.string().uuid().nullable(),
  relatedPaymentId: z.string().uuid().nullable(),
  relatedPodId: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: IsoDateTimeSchema
});
export type ValidationEvidenceRunDto = z.infer<typeof ValidationEvidenceRunSchema>;

export const ValidationEvidenceRunListSchema = z.object({
  items: z.array(ValidationEvidenceRunSchema)
});
export type ValidationEvidenceRunListDto = z.infer<typeof ValidationEvidenceRunListSchema>;

export const ValidationEvidenceLatestSchema = z.object({
  environment: z.string().min(2),
  items: z.object({
    releaseVerify: ValidationEvidenceRunSchema.nullable(),
    paidDeliveryProof: ValidationEvidenceRunSchema.nullable(),
    playwrightSmoke: ValidationEvidenceRunSchema.nullable(),
    playwrightSmokeRequiredAuth: ValidationEvidenceRunSchema.nullable()
  })
});
export type ValidationEvidenceLatestDto = z.infer<typeof ValidationEvidenceLatestSchema>;

export const CreateValidationEvidenceRunSchema = z.object({
  evidenceType: ValidationEvidenceTypeSchema,
  status: ValidationEvidenceStatusSchema,
  environment: z.string().trim().min(2).max(80).default("staging"),
  source: z.string().trim().min(2).max(160).default("manual"),
  command: z.string().trim().min(2).nullable().optional(),
  summary: z.record(z.unknown()).default({}),
  artifactPath: z.string().trim().min(1).nullable().optional(),
  relatedOrderId: z.string().uuid().nullable().optional(),
  relatedJobId: z.string().uuid().nullable().optional(),
  relatedPaymentId: z.string().uuid().nullable().optional(),
  relatedPodId: z.string().uuid().nullable().optional(),
  createdBy: z.string().uuid().nullable().optional()
});
export type CreateValidationEvidenceRunInput = z.infer<typeof CreateValidationEvidenceRunSchema>;

export const ReleaseReadinessVerdictSchema = z.enum(["READY", "NEEDS_REVIEW", "BLOCKED"]);
export type ReleaseReadinessVerdict = z.infer<typeof ReleaseReadinessVerdictSchema>;

export const ReleaseReadinessEvidenceItemSchema = z.object({
  evidenceType: ValidationEvidenceTypeSchema,
  label: z.string().min(2),
  required: z.boolean(),
  status: ValidationEvidenceStatusSchema,
  createdAt: IsoDateTimeSchema.nullable(),
  ageMinutes: z.number().int().nonnegative().nullable(),
  isFresh: z.boolean(),
  evidenceId: z.string().uuid().nullable(),
  source: z.string().nullable(),
  command: z.string().nullable(),
  artifactPath: z.string().nullable(),
  relatedOrderId: z.string().uuid().nullable(),
  relatedJobId: z.string().uuid().nullable(),
  relatedPaymentId: z.string().uuid().nullable(),
  relatedPodId: z.string().uuid().nullable()
});
export type ReleaseReadinessEvidenceItemDto = z.infer<typeof ReleaseReadinessEvidenceItemSchema>;

export const ReleaseReadinessSummarySchema = z.object({
  verdict: ReleaseReadinessVerdictSchema,
  title: z.string().min(2),
  summary: z.string().min(2),
  environment: z.string().min(2),
  freshnessWindowHours: z.number().int().positive(),
  checkedAt: IsoDateTimeSchema,
  requiredEvidence: z.array(ReleaseReadinessEvidenceItemSchema),
  optionalEvidence: z.array(ReleaseReadinessEvidenceItemSchema),
  recommendedActions: z.array(z.string().min(2)),
  links: z.object({
    validationEvidence: z.literal("/admin/validation-evidence"),
    pilots: z.literal("/admin/pilots"),
    command: z.literal("/admin/command")
  })
});
export type ReleaseReadinessSummaryDto = z.infer<typeof ReleaseReadinessSummarySchema>;

export const PilotGuardrailLevelSchema = z.enum(["INFO", "CAUTION", "WARNING", "PAUSED", "READY"]);
export type PilotGuardrailLevel = z.infer<typeof PilotGuardrailLevelSchema>;

export const PilotRehearsalRecommendationSchema = z.enum(["READY_FOR_REHEARSAL", "NEEDS_REVIEW", "BLOCKED", "UNKNOWN"]);
export type PilotRehearsalRecommendation = z.infer<typeof PilotRehearsalRecommendationSchema>;

export const PilotRehearsalValidationStatusSchema = z.enum(["UNKNOWN", "PASSED", "FAILED", "SKIPPED"]);
export type PilotRehearsalValidationStatus = z.infer<typeof PilotRehearsalValidationStatusSchema>;

export const PilotRehearsalGuardrailSchema = z.object({
  level: PilotGuardrailLevelSchema,
  title: z.string().min(2),
  message: z.string().min(2),
  recommendedAction: z.string().min(2),
  badgeCopy: z.string().min(2)
});
export type PilotRehearsalGuardrailDto = z.infer<typeof PilotRehearsalGuardrailSchema>;

export const PilotRehearsalChecklistSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  waived: z.number().int().nonnegative(),
  notStarted: z.number().int().nonnegative()
});
export type PilotRehearsalChecklistSummaryDto = z.infer<typeof PilotRehearsalChecklistSummarySchema>;

export const PilotRehearsalOperationalPostureSchema = z.object({
  activeJobs: z.number().int().nonnegative(),
  unresolvedSupportEscalations: z.number().int().nonnegative(),
  highCriticalSupportEscalations: z.number().int().nonnegative(),
  openPaymentRisks: z.number().int().nonnegative(),
  readyCouriers: z.number().int().nonnegative()
});
export type PilotRehearsalOperationalPostureDto = z.infer<typeof PilotRehearsalOperationalPostureSchema>;

export const PilotRehearsalValidationSignalSchema = z.object({
  status: PilotRehearsalValidationStatusSchema,
  label: z.string().min(2),
  summary: z.string().min(2),
  evidenceAt: IsoDateTimeSchema.nullable(),
  freshness: z.enum(["fresh", "stale", "missing"]).default("missing"),
  evidence: ValidationEvidenceRunSchema.nullable().optional()
});
export type PilotRehearsalValidationSignalDto = z.infer<typeof PilotRehearsalValidationSignalSchema>;

export const PilotRehearsalValidationPostureSchema = z.object({
  releaseVerification: PilotRehearsalValidationSignalSchema,
  paidDeliveryProof: PilotRehearsalValidationSignalSchema,
  browserSmoke: PilotRehearsalValidationSignalSchema,
  requiredAuthSmoke: PilotRehearsalValidationSignalSchema,
  freshnessWindowHours: z.number().int().positive(),
  overallStatus: PilotRehearsalValidationStatusSchema,
  recommendedAction: z.string().min(2)
});
export type PilotRehearsalValidationPostureDto = z.infer<typeof PilotRehearsalValidationPostureSchema>;

export const PilotRehearsalSummarySchema = z.object({
  workspace: PilotWorkspaceSchema,
  guardrailState: PilotRehearsalGuardrailSchema,
  checks: z.array(PilotReadinessCheckSchema),
  checklistSummary: PilotRehearsalChecklistSummarySchema,
  operationalPosture: PilotRehearsalOperationalPostureSchema,
  validationPosture: PilotRehearsalValidationPostureSchema,
  recommendation: PilotRehearsalRecommendationSchema,
  recommendedNextActions: z.array(z.string().min(2)),
  guidance: z.string().min(2)
});
export type PilotRehearsalSummaryDto = z.infer<typeof PilotRehearsalSummarySchema>;

export const SupportEscalationCategorySchema = z.enum([
  "DISPATCH_FAILURE",
  "PAYMENT_RISK",
  "CUSTOMER_SUPPORT",
  "MERCHANT_SUPPORT",
  "COURIER_SUPPORT",
  "REFUND_REVIEW",
  "DELIVERY_DELAY",
  "GENERAL"
]);
export type SupportEscalationCategory = z.infer<typeof SupportEscalationCategorySchema>;

export const SupportEscalationStatusSchema = z.enum([
  "OPEN",
  "IN_REVIEW",
  "WAITING_ON_CUSTOMER",
  "WAITING_ON_MERCHANT",
  "WAITING_ON_COURIER",
  "RESOLVED",
  "CANCELLED"
]);
export type SupportEscalationStatus = z.infer<typeof SupportEscalationStatusSchema>;

export const SupportEscalationSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type SupportEscalationSeverity = z.infer<typeof SupportEscalationSeveritySchema>;

export const SupportEscalationResolutionActionSchema = z.enum([
  "CUSTOMER_UPDATED",
  "MERCHANT_UPDATED",
  "COURIER_UPDATED",
  "DISPATCH_RETRIED",
  "DRIVER_REASSIGNED",
  "PAYMENT_REVIEWED",
  "REFUND_REVIEWED",
  "ORDER_CANCELLED_MANUALLY",
  "NO_ACTION_REQUIRED",
  "OTHER"
]);
export type SupportEscalationResolutionAction = z.infer<typeof SupportEscalationResolutionActionSchema>;

export const SupportEscalationResolutionReasonSchema = z.enum([
  "CUSTOMER_CONFIRMED",
  "MERCHANT_CONFIRMED",
  "COURIER_CONFIRMED",
  "DELIVERY_COMPLETED",
  "PAYMENT_RISK_CLEARED",
  "DUPLICATE_ESCALATION",
  "TEST_OR_DEMO_RECORD",
  "ESCALATED_OUTSIDE_SHIPWRIGHT",
  "OTHER"
]);
export type SupportEscalationResolutionReason = z.infer<typeof SupportEscalationResolutionReasonSchema>;

export const SupportEscalationEventTypeSchema = z.enum([
  "CREATED",
  "STATUS_CHANGED",
  "NOTE_UPDATED",
  "OWNER_UPDATED",
  "CONTACT_FLAGS_UPDATED",
  "RESOLVED",
  "CANCELLED",
  "REOPENED",
  "RESOLUTION_UPDATED"
]);
export type SupportEscalationEventType = z.infer<typeof SupportEscalationEventTypeSchema>;

export const SupportEscalationEventSchema = z.object({
  id: z.string().uuid(),
  supportEscalationId: z.string().uuid(),
  orgId: z.string().uuid(),
  eventType: SupportEscalationEventTypeSchema,
  actorId: z.string().uuid().nullable(),
  actorLabel: z.string().nullable(),
  previousStatus: SupportEscalationStatusSchema.nullable(),
  newStatus: SupportEscalationStatusSchema.nullable(),
  note: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: IsoDateTimeSchema
});
export type SupportEscalationEventDto = z.infer<typeof SupportEscalationEventSchema>;

export const SupportEscalationSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  orgName: z.string().nullable().optional(),
  orderId: z.string().uuid().nullable(),
  jobId: z.string().uuid().nullable(),
  category: SupportEscalationCategorySchema,
  status: SupportEscalationStatusSchema,
  severity: SupportEscalationSeveritySchema,
  title: z.string().min(3),
  note: z.string().min(3),
  followUpOwner: z.string().nullable(),
  customerContactRequired: z.boolean(),
  merchantContactRequired: z.boolean(),
  courierContactRequired: z.boolean(),
  resolutionNote: z.string().nullable(),
  resolutionAction: SupportEscalationResolutionActionSchema.nullable(),
  resolutionReason: SupportEscalationResolutionReasonSchema.nullable(),
  resolvedBy: z.string().uuid().nullable(),
  resolvedAt: IsoDateTimeSchema.nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  restaurantName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional()
});
export type SupportEscalationDto = z.infer<typeof SupportEscalationSchema>;

export const CreateSupportEscalationSchema = z
  .object({
    orderId: z.string().uuid().nullable().optional(),
    jobId: z.string().uuid().nullable().optional(),
    category: SupportEscalationCategorySchema,
    status: SupportEscalationStatusSchema.default("OPEN"),
    severity: SupportEscalationSeveritySchema.default("MEDIUM"),
    title: z.string().trim().min(3).max(160),
    note: z.string().trim().min(3).max(2000),
    followUpOwner: z.string().trim().min(2).max(120).nullable().optional(),
    customerContactRequired: z.boolean().default(false),
    merchantContactRequired: z.boolean().default(false),
    courierContactRequired: z.boolean().default(false)
  })
  .refine((value) => Boolean(value.orderId || value.jobId), {
    message: "support_escalation_requires_order_or_job",
    path: ["orderId"]
  });
export type CreateSupportEscalationInput = z.infer<typeof CreateSupportEscalationSchema>;

export const UpdateSupportEscalationSchema = z
  .object({
    status: SupportEscalationStatusSchema.optional(),
    severity: SupportEscalationSeveritySchema.optional(),
    title: z.string().trim().min(3).max(160).optional(),
    note: z.string().trim().min(3).max(2000).optional(),
    followUpOwner: z.string().trim().min(2).max(120).nullable().optional(),
    customerContactRequired: z.boolean().optional(),
    merchantContactRequired: z.boolean().optional(),
    courierContactRequired: z.boolean().optional(),
    resolutionNote: z.string().trim().min(3).max(2000).nullable().optional(),
    resolutionAction: SupportEscalationResolutionActionSchema.nullable().optional(),
    resolutionReason: SupportEscalationResolutionReasonSchema.nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "support_escalation_update_required"
  })
  .refine((value) => {
    if (value.status !== "RESOLVED" && value.status !== "CANCELLED") {
      return true;
    }

    return typeof value.resolutionNote === "string" && value.resolutionNote.trim().length > 0;
  }, {
    message: "support_escalation_resolution_note_required",
    path: ["resolutionNote"]
  });
export type UpdateSupportEscalationInput = z.infer<typeof UpdateSupportEscalationSchema>;

export const SupportEscalationListSchema = z.object({
  items: z.array(SupportEscalationSchema)
});
export type SupportEscalationListDto = z.infer<typeof SupportEscalationListSchema>;

export const SupportEscalationEventListSchema = z.object({
  items: z.array(SupportEscalationEventSchema)
});
export type SupportEscalationEventListDto = z.infer<typeof SupportEscalationEventListSchema>;

export const DemoRequestInterestTypeSchema = z.enum([
  "PILOT_MERCHANT",
  "OPERATOR_PLATFORM",
  "INVESTOR_PARTNER",
  "OTHER"
]);
export type DemoRequestInterestType = z.infer<typeof DemoRequestInterestTypeSchema>;

export const DemoRequestStatusSchema = z.enum([
  "NEW",
  "REVIEWED",
  "CONTACTED",
  "QUALIFIED",
  "CLOSED",
  "SPAM"
]);
export type DemoRequestStatus = z.infer<typeof DemoRequestStatusSchema>;

export const DemoRequestFollowUpPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type DemoRequestFollowUpPriority = z.infer<typeof DemoRequestFollowUpPrioritySchema>;

export const DemoRequestNotificationDeliveryStatusSchema = z.enum([
  "pending",
  "sent",
  "skipped",
  "failed",
  "retrying",
  "unknown"
]);
export type DemoRequestNotificationDeliveryStatus = z.infer<typeof DemoRequestNotificationDeliveryStatusSchema>;

export const DemoRequestNotificationStatusSchema = z.object({
  status: DemoRequestNotificationDeliveryStatusSchema,
  channel: z.string().nullable(),
  provider: z.string().nullable(),
  lastAttemptAt: IsoDateTimeSchema.nullable(),
  lastEventType: z.string().nullable(),
  outboxMessageId: z.string().uuid().nullable(),
  retryCount: z.number().int().nonnegative(),
  safeErrorSummary: z.string().nullable()
});
export type DemoRequestNotificationStatusDto = z.infer<typeof DemoRequestNotificationStatusSchema>;

export const DemoRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  organisation: z.string().nullable(),
  role: z.string().nullable(),
  interestType: DemoRequestInterestTypeSchema,
  message: z.string().nullable(),
  source: z.string().nullable(),
  status: DemoRequestStatusSchema,
  adminNote: z.string().nullable(),
  assignedOwner: z.string().nullable(),
  nextFollowUpAt: IsoDateTimeSchema.nullable(),
  followUpPriority: DemoRequestFollowUpPrioritySchema.nullable(),
  lastContactedAt: IsoDateTimeSchema.nullable(),
  closeReason: z.string().nullable(),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: IsoDateTimeSchema.nullable(),
  notification: DemoRequestNotificationStatusSchema.nullable().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type DemoRequestDto = z.infer<typeof DemoRequestSchema>;

export const CreateDemoRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  organisation: z.string().trim().min(2).max(160).nullable().optional(),
  role: z.string().trim().min(2).max(120).nullable().optional(),
  interestType: DemoRequestInterestTypeSchema,
  message: z.string().trim().min(3).max(2000).nullable().optional(),
  source: z.string().trim().min(2).max(80).nullable().optional(),
  website: z.string().max(200).optional()
});
export type CreateDemoRequestInput = z.infer<typeof CreateDemoRequestSchema>;

export const UpdateDemoRequestSchema = z
  .object({
    status: DemoRequestStatusSchema.optional(),
    adminNote: z.string().trim().min(2).max(2000).nullable().optional(),
    assignedOwner: z.string().trim().min(2).max(160).nullable().optional(),
    nextFollowUpAt: IsoDateTimeSchema.nullable().optional(),
    followUpPriority: DemoRequestFollowUpPrioritySchema.nullable().optional(),
    lastContactedAt: IsoDateTimeSchema.nullable().optional(),
    closeReason: z.string().trim().min(2).max(500).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "demo_request_update_required"
  });
export type UpdateDemoRequestInput = z.infer<typeof UpdateDemoRequestSchema>;

export const DemoRequestListSchema = z.object({
  items: z.array(DemoRequestSchema)
});
export type DemoRequestListDto = z.infer<typeof DemoRequestListSchema>;

export const DemoRequestEventTypeSchema = z.enum([
  "CREATED",
  "STATUS_CHANGED",
  "NOTE_UPDATED",
  "OWNER_ASSIGNED",
  "FOLLOW_UP_SCHEDULED",
  "CONTACT_RECORDED",
  "PRIORITY_CHANGED",
  "CLOSED",
  "REOPENED"
]);
export type DemoRequestEventType = z.infer<typeof DemoRequestEventTypeSchema>;

export const DemoRequestEventSchema = z.object({
  id: z.string().uuid(),
  demoRequestId: z.string().uuid(),
  eventType: DemoRequestEventTypeSchema,
  actorId: z.string().uuid().nullable(),
  actorLabel: z.string().nullable(),
  previousStatus: DemoRequestStatusSchema.nullable(),
  newStatus: DemoRequestStatusSchema.nullable(),
  note: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: IsoDateTimeSchema
});
export type DemoRequestEventDto = z.infer<typeof DemoRequestEventSchema>;

export const DemoRequestEventListSchema = z.object({
  items: z.array(DemoRequestEventSchema)
});
export type DemoRequestEventListDto = z.infer<typeof DemoRequestEventListSchema>;

export const AnalyticsEventNameSchema = z.enum([
  "PUBLIC_PAGE_VIEW",
  "CTA_CLICKED",
  "PRICING_CTA_CLICKED",
  "DEMO_REQUEST_FORM_STARTED",
  "DEMO_REQUEST_SUBMITTED",
  "DEMO_REQUEST_FAILED",
  "MEGA_MENU_OPENED"
]);
export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;

const AnalyticsMetadataSchema = z.record(z.string(), z.unknown()).refine(
  (value) => JSON.stringify(value).length <= 4096,
  { message: "analytics_metadata_too_large" }
);

export const CreateAnalyticsEventSchema = z.object({
  eventName: AnalyticsEventNameSchema,
  source: z.string().trim().min(2).max(80).default("public_site"),
  path: z.string().trim().max(500).nullable().optional(),
  referrer: z.string().trim().max(500).nullable().optional(),
  sessionId: z.string().trim().min(6).max(120).nullable().optional(),
  visitorId: z.string().trim().min(6).max(120).nullable().optional(),
  demoRequestId: z.string().uuid().nullable().optional(),
  metadata: AnalyticsMetadataSchema.default({})
});
export type CreateAnalyticsEventInput = z.infer<typeof CreateAnalyticsEventSchema>;

export const AnalyticsEventSchema = z.object({
  id: z.string().uuid(),
  eventName: AnalyticsEventNameSchema,
  source: z.string(),
  path: z.string().nullable(),
  referrer: z.string().nullable(),
  sessionId: z.string().nullable(),
  visitorId: z.string().nullable(),
  demoRequestId: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: IsoDateTimeSchema
});
export type AnalyticsEventDto = z.infer<typeof AnalyticsEventSchema>;

export const AnalyticsMetricWindowSchema = z.object({
  pageViews: z.number().int().nonnegative(),
  ctaClicks: z.number().int().nonnegative(),
  demoFormStarts: z.number().int().nonnegative(),
  demoRequestSubmits: z.number().int().nonnegative(),
  demoRequestFailures: z.number().int().nonnegative(),
  formStartToSubmitRate: z.number().nullable(),
  ctaToDemoRequestRate: z.number().nullable()
});
export type AnalyticsMetricWindowDto = z.infer<typeof AnalyticsMetricWindowSchema>;

export const AnalyticsBreakdownRowSchema = z.object({
  label: z.string(),
  source: z.string().nullable().optional(),
  count: z.number().int().nonnegative()
});
export type AnalyticsBreakdownRowDto = z.infer<typeof AnalyticsBreakdownRowSchema>;

export const AdminAnalyticsSummarySchema = z.object({
  generatedAt: IsoDateTimeSchema,
  windows: z.object({
    last7Days: AnalyticsMetricWindowSchema,
    last30Days: AnalyticsMetricWindowSchema
  }),
  ctaPerformance: z.array(AnalyticsBreakdownRowSchema),
  pricingInterest: z.array(AnalyticsBreakdownRowSchema),
  recentEvents: z.array(AnalyticsEventSchema)
});
export type AdminAnalyticsSummaryDto = z.infer<typeof AdminAnalyticsSummarySchema>;

export const OperationalResetModeSchema = z.enum([
  "PREVIEW",
  "ARCHIVE_DEMO_REQUESTS",
  "CLOSE_TEST_ESCALATIONS",
  "MARK_STALE_PILOT_REHEARSAL",
  "FULL_DEMO_TIDY"
]);
export type OperationalResetMode = z.infer<typeof OperationalResetModeSchema>;

export const OperationalResetStatusSchema = z.enum(["COMPLETED", "FAILED"]);
export type OperationalResetStatus = z.infer<typeof OperationalResetStatusSchema>;

export const OperationalResetPreviewItemSchema = z.object({
  selectionId: z.string().min(4),
  resourceType: z.enum(["demo_request", "support_escalation", "pilot_workspace", "proof_record"]),
  resourceId: z.string().uuid(),
  label: z.string().min(2),
  proposedAction: z.string().min(2),
  action: z.string().min(2).optional(),
  reason: z.string().min(2),
  eligible: z.boolean().default(true),
  warning: z.string().nullable().default(null),
  createdAt: IsoDateTimeSchema.nullable().default(null),
  currentStatus: z.string().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({})
});
export type OperationalResetPreviewItemDto = z.infer<typeof OperationalResetPreviewItemSchema>;

export const OperationalResetSummarySchema = z.object({
  affectedCount: z.number().int().nonnegative(),
  demoRequests: z.number().int().nonnegative(),
  supportEscalations: z.number().int().nonnegative(),
  pilotRecommendations: z.number().int().nonnegative(),
  proofRecordsUntouched: z.boolean(),
  message: z.string().min(2)
});
export type OperationalResetSummaryDto = z.infer<typeof OperationalResetSummarySchema>;

export const OperationalResetPreviewSchema = z.object({
  mode: OperationalResetModeSchema,
  scope: z.string().min(2),
  reason: z.string().min(8),
  olderThan: IsoDateTimeSchema.nullable(),
  summary: OperationalResetSummarySchema,
  items: z.array(OperationalResetPreviewItemSchema)
});
export type OperationalResetPreviewDto = z.infer<typeof OperationalResetPreviewSchema>;

export const OperationalResetRunSchema = z.object({
  id: z.string().uuid(),
  createdBy: z.string().uuid().nullable(),
  scope: z.string().min(2),
  mode: OperationalResetModeSchema,
  reason: z.string().min(8),
  status: OperationalResetStatusSchema,
  summary: OperationalResetSummarySchema,
  createdAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable()
});
export type OperationalResetRunDto = z.infer<typeof OperationalResetRunSchema>;

export const OperationalResetRunListSchema = z.object({
  items: z.array(OperationalResetRunSchema)
});
export type OperationalResetRunListDto = z.infer<typeof OperationalResetRunListSchema>;

export const OperationalResetRequestSchema = z.object({
  mode: OperationalResetModeSchema.exclude(["PREVIEW"]),
  scope: z.string().trim().min(2).max(80).default("staging_demo"),
  reason: z.string().trim().min(8).max(1000),
  olderThan: IsoDateTimeSchema.nullable().optional()
});
export type OperationalResetRequestInput = z.infer<typeof OperationalResetRequestSchema>;

export const OperationalResetSelectedItemSchema = z.union([
  z.string().min(4),
  z.object({
    resourceType: OperationalResetPreviewItemSchema.shape.resourceType,
    resourceId: z.string().uuid(),
    action: z.string().min(2)
  })
]);
export type OperationalResetSelectedItemDto = z.infer<typeof OperationalResetSelectedItemSchema>;

export const ExecuteOperationalResetSchema = OperationalResetRequestSchema.extend({
  confirmation: z.literal("RESET DEMO DATA"),
  selectedItems: z.array(OperationalResetSelectedItemSchema).optional()
});
export type ExecuteOperationalResetInput = z.infer<typeof ExecuteOperationalResetSchema>;

export const RefundStatusSchema = z.enum(["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"]);
export type RefundStatus = z.infer<typeof RefundStatusSchema>;

export const PayoutLedgerStatusSchema = z.enum(["PENDING", "READY", "PAID", "FAILED", "CANCELLED"]);
export type PayoutLedgerStatus = z.infer<typeof PayoutLedgerStatusSchema>;

export const BusinessPaymentSummarySchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  jobId: z.string().uuid(),
  restaurant: z.object({
    id: z.string().uuid(),
    name: z.string().min(2),
    slug: RestaurantSlugSchema
  }),
  customerName: z.string().min(2),
  orderStatus: CustomerOrderStatusSchema,
  jobStatus: JobStatusSchema,
  paymentStatus: PaymentStatusSchema,
  customerTotalCents: CurrencyAmountSchema,
  amountAuthorizedCents: CurrencyAmountSchema,
  amountCapturedCents: CurrencyAmountSchema,
  amountRefundedCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  platformFeeCents: CurrencyAmountSchema,
  payoutGrossCents: CurrencyAmountSchema,
  payoutStatus: PayoutLedgerStatusSchema.nullable(),
  payoutHoldReason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type BusinessPaymentSummaryDto = z.infer<typeof BusinessPaymentSummarySchema>;

export const BusinessPaymentListSchema = z.object({
  items: z.array(BusinessPaymentSummarySchema)
});
export type BusinessPaymentListDto = z.infer<typeof BusinessPaymentListSchema>;

export const AdminPaymentSummarySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  orgName: z.string().min(2),
  restaurantId: z.string().uuid(),
  restaurantName: z.string().min(2),
  restaurantSlug: RestaurantSlugSchema,
  orderId: z.string().uuid(),
  jobId: z.string().uuid(),
  customerName: z.string().min(2),
  orderStatus: CustomerOrderStatusSchema,
  jobStatus: JobStatusSchema,
  paymentStatus: PaymentStatusSchema,
  customerTotalCents: CurrencyAmountSchema,
  amountAuthorizedCents: CurrencyAmountSchema,
  amountCapturedCents: CurrencyAmountSchema,
  amountRefundedCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  platformFeeCents: CurrencyAmountSchema,
  payoutGrossCents: CurrencyAmountSchema,
  payoutStatus: PayoutLedgerStatusSchema.nullable(),
  payoutHoldReason: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type AdminPaymentSummaryDto = z.infer<typeof AdminPaymentSummarySchema>;

export const AdminPaymentListSchema = z.object({
  items: z.array(AdminPaymentSummarySchema)
});
export type AdminPaymentListDto = z.infer<typeof AdminPaymentListSchema>;

export const FinanceReviewStatusSchema = z.enum(["CLEAR", "NEEDS_REVIEW", "REFUND_REVIEW"]);
export type FinanceReviewStatus = z.infer<typeof FinanceReviewStatusSchema>;

export const FinanceTransactionSchema = z.object({
  orgId: z.string().uuid().nullable(),
  orgName: z.string().min(2).nullable(),
  restaurantId: z.string().uuid(),
  restaurantName: z.string().min(2),
  orderId: z.string().uuid(),
  jobId: z.string().uuid(),
  paymentId: z.string().uuid(),
  customerReference: z.string().min(2).nullable(),
  amountCents: CurrencyAmountSchema,
  capturedAmountCents: CurrencyAmountSchema,
  pendingAmountCents: CurrencyAmountSchema,
  refundedAmountCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  paymentStatus: PaymentStatusSchema,
  orderStatus: CustomerOrderStatusSchema,
  jobStatus: JobStatusSchema,
  payoutStatus: PayoutLedgerStatusSchema.nullable(),
  capturedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  financeReviewStatus: FinanceReviewStatusSchema,
  refundReviewRequired: z.boolean(),
  refundReviewReason: z.string().nullable(),
  recommendedNextAction: z.string().min(2)
});
export type FinanceTransactionDto = z.infer<typeof FinanceTransactionSchema>;

export const FinanceTransactionListSchema = z.object({
  items: z.array(FinanceTransactionSchema)
});
export type FinanceTransactionListDto = z.infer<typeof FinanceTransactionListSchema>;

export const FinanceSummarySchema = z.object({
  scope: z.enum(["business", "admin"]),
  currency: z.string().length(3),
  totalCapturedAmountCents: CurrencyAmountSchema,
  totalPendingAmountCents: CurrencyAmountSchema,
  totalFailedAmountCents: CurrencyAmountSchema,
  capturedPaymentCount: z.number().int().nonnegative(),
  pendingPaymentCount: z.number().int().nonnegative(),
  failedPaymentCount: z.number().int().nonnegative(),
  fulfilledOrderCount: z.number().int().nonnegative(),
  deliveredJobCount: z.number().int().nonnegative(),
  ordersNeedingFinanceReview: z.number().int().nonnegative(),
  refundReviewCandidates: z.number().int().nonnegative(),
  latestFinanceEvents: z.array(FinanceTransactionSchema),
  generatedAt: IsoDateTimeSchema
});
export type FinanceSummaryDto = z.infer<typeof FinanceSummarySchema>;

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  provider: PaymentProviderSchema,
  providerPaymentIntentId: z.string().nullable(),
  status: PaymentStatusSchema,
  amountAuthorizedCents: CurrencyAmountSchema,
  amountCapturedCents: CurrencyAmountSchema,
  amountRefundedCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  customerTotalCents: CurrencyAmountSchema,
  platformFeeCents: CurrencyAmountSchema,
  payoutGrossCents: CurrencyAmountSchema,
  settlementSnapshot: z.record(z.string(), z.unknown()),
  clientSecret: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type PaymentDto = z.infer<typeof PaymentSchema>;

export const PaymentEventSchema = z.object({
  id: z.number().int().nonnegative(),
  paymentId: z.string().uuid().nullable(),
  jobId: z.string().uuid().nullable(),
  eventType: z.string().min(3),
  previousStatus: PaymentStatusSchema.nullable(),
  nextStatus: PaymentStatusSchema.nullable(),
  providerEventId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: IsoDateTimeSchema
});
export type PaymentEventDto = z.infer<typeof PaymentEventSchema>;

export const RefundSchema = z.object({
  id: z.string().uuid(),
  paymentId: z.string().uuid(),
  jobId: z.string().uuid(),
  providerRefundId: z.string().nullable(),
  status: RefundStatusSchema,
  amountCents: CurrencyAmountSchema,
  currency: z.string().length(3),
  reasonCode: z.string().min(2),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type RefundDto = z.infer<typeof RefundSchema>;

export const PayoutLedgerSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  driverId: z.string().uuid(),
  status: PayoutLedgerStatusSchema,
  grossPayoutCents: CurrencyAmountSchema,
  holdReason: z.string().nullable(),
  releasedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type PayoutLedgerDto = z.infer<typeof PayoutLedgerSchema>;

export const JobPaymentSummarySchema = z.object({
  payment: PaymentSchema,
  refunds: z.array(RefundSchema),
  payoutLedger: PayoutLedgerSchema.nullable()
});
export type JobPaymentSummaryDto = z.infer<typeof JobPaymentSummarySchema>;

export const AuthorizeJobPaymentSchema = z.object({
  paymentMethodId: z.string().min(3).max(128)
});
export type AuthorizeJobPaymentInput = z.infer<typeof AuthorizeJobPaymentSchema>;

export const StripeWebhookAckSchema = z.object({
  received: z.boolean(),
  duplicate: z.boolean().default(false),
  eventId: z.string().min(3)
});
export type StripeWebhookAck = z.infer<typeof StripeWebhookAckSchema>;

export const OutboxEventTypeSchema = z.enum([
  "FOUNDATION_WRITE_RECORDED",
  "JOB_DISPATCH_REQUESTED",
  "JOB_OFFER_EXPIRY_CHECK",
  "PAYMENT_INTENT_CREATE_REQUESTED",
  "PAYMENT_CAPTURE_REQUESTED",
  "PAYMENT_CANCELLATION_SETTLEMENT_REQUESTED",
  "NOTIFY_JOB_ASSIGNED",
  "NOTIFY_JOB_REDISPATCH_REQUESTED",
  "NOTIFY_JOB_EN_ROUTE_PICKUP",
  "NOTIFY_JOB_PICKED_UP",
  "NOTIFY_JOB_EN_ROUTE_DROP",
  "NOTIFY_JOB_DELIVERED",
  "NOTIFY_JOB_CANCELLED"
]);
export type OutboxEventType = z.infer<typeof OutboxEventTypeSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  requestId: z.string().uuid().optional()
});
