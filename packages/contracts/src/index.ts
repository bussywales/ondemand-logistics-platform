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
  consumerId: z.string().uuid(),
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

export const JobTrackingSchema = z.object({
  jobId: z.string().uuid(),
  status: JobStatusSchema,
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

export const OutboxEventTypeSchema = z.enum([
  "FOUNDATION_WRITE_RECORDED",
  "JOB_DISPATCH_REQUESTED",
  "JOB_OFFER_EXPIRY_CHECK",
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
