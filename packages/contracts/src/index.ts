import { z } from "zod";

export const OrgRoleSchema = z.enum([
  "CONSUMER",
  "DRIVER",
  "BUSINESS_OPERATOR",
  "ADMIN"
]);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

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
  timeline: z.array(JobTimelineEventSchema)
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

export const RefundStatusSchema = z.enum(["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"]);
export type RefundStatus = z.infer<typeof RefundStatusSchema>;

export const PayoutLedgerStatusSchema = z.enum(["PENDING", "READY", "PAID", "FAILED", "CANCELLED"]);
export type PayoutLedgerStatus = z.infer<typeof PayoutLedgerStatusSchema>;

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
