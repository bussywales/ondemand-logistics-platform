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

export const JobStatusSchema = z.enum([
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const CreateJobSchema = z.object({
  orgId: z.string().uuid(),
  consumerId: z.string().uuid(),
  pickupAddress: z.string().min(3),
  dropoffAddress: z.string().min(3),
  distanceMiles: z.number().positive().max(12),
  quotedPayoutCents: z.number().int().nonnegative(),
  supplyType: VehicleTypeSchema
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const IdempotencyHeaderSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_\-:.]+$/);

export const OutboxEventTypeSchema = z.enum([
  "JOB_CREATED",
  "JOB_STATUS_CHANGED",
  "AUDIT_LOGGED"
]);
export type OutboxEventType = z.infer<typeof OutboxEventTypeSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  requestId: z.string().uuid().optional()
});
