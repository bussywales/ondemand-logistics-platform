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
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
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
  createdAt: z.string()
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
  quoteId: z.string().uuid(),
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
  createdAt: z.string()
});
export type JobDto = z.infer<typeof JobSchema>;

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
  availableSince: z.string().nullable(),
  lastLocationAt: z.string().nullable()
});
export type DriverStateDto = z.infer<typeof DriverStateSchema>;

export const DriverOfferSchema = z.object({
  offerId: z.string().uuid(),
  jobId: z.string().uuid(),
  status: JobOfferStatusSchema,
  expiresAt: z.string(),
  distanceMiles: DistanceMilesSchema,
  etaMinutes: EtaMinutesSchema,
  payoutGrossCents: CurrencyAmountSchema,
  pickupAddress: z.string(),
  dropoffAddress: z.string()
});
export type DriverOfferDto = z.infer<typeof DriverOfferSchema>;

export const AcceptDriverOfferSchema = z.object({
  offerId: z.string().uuid()
});
export type AcceptDriverOfferInput = z.infer<typeof AcceptDriverOfferSchema>;

export const AcceptDriverOfferResponseSchema = z.object({
  offerId: z.string().uuid(),
  jobId: z.string().uuid(),
  status: z.literal("ASSIGNED"),
  distanceMiles: DistanceMilesSchema,
  etaMinutes: EtaMinutesSchema,
  payoutGrossCents: CurrencyAmountSchema
});
export type AcceptDriverOfferResponse = z.infer<typeof AcceptDriverOfferResponseSchema>;

export const OutboxEventTypeSchema = z.enum([
  "FOUNDATION_WRITE_RECORDED",
  "JOB_DISPATCH_REQUESTED",
  "JOB_OFFER_EXPIRY_CHECK"
]);
export type OutboxEventType = z.infer<typeof OutboxEventTypeSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  requestId: z.string().uuid().optional()
});
