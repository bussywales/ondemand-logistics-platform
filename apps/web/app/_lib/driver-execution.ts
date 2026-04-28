import type { DriverJob } from "./product-state";

export type DriverExecutionStep = {
  key: "go_to_pickup" | "picked_up" | "go_to_drop" | "proof_of_delivery" | "delivered";
  label: string;
  description: string;
  complete: boolean;
  active: boolean;
  actionLabel: string | null;
  transition: "en-route-pickup" | "picked-up" | "en-route-drop" | "delivered" | null;
};

const statusRank: Record<DriverJob["status"], number> = {
  REQUESTED: 0,
  ASSIGNED: 1,
  EN_ROUTE_PICKUP: 2,
  PICKED_UP: 3,
  EN_ROUTE_DROP: 4,
  DELIVERED: 6,
  CANCELLED: 0,
  DISPATCH_FAILED: 0,
  IN_PROGRESS: 2,
  COMPLETED: 6
};

export function getDriverExecutionSteps(job: DriverJob | null, hasProofOfDelivery: boolean): DriverExecutionStep[] {
  const rank = job ? statusRank[job.status] : 0;

  return [
    {
      key: "go_to_pickup",
      label: "Go to pickup",
      description: "Confirm you are heading to the pickup point.",
      complete: rank >= 2,
      active: rank === 1,
      actionLabel: rank === 1 ? "Go to pickup" : null,
      transition: rank === 1 ? "en-route-pickup" : null
    },
    {
      key: "picked_up",
      label: "Picked up",
      description: "Confirm the order has been collected.",
      complete: rank >= 3,
      active: rank === 2,
      actionLabel: rank === 2 ? "Mark picked up" : null,
      transition: rank === 2 ? "picked-up" : null
    },
    {
      key: "go_to_drop",
      label: "Go to drop-off",
      description: "Confirm you are travelling to the customer.",
      complete: rank >= 4,
      active: rank === 3,
      actionLabel: rank === 3 ? "Go to drop-off" : null,
      transition: rank === 3 ? "en-route-drop" : null
    },
    {
      key: "proof_of_delivery",
      label: "Proof of delivery",
      description: "Record recipient details before completing delivery.",
      complete: hasProofOfDelivery || rank >= 6,
      active: rank === 4 && !hasProofOfDelivery,
      actionLabel: null,
      transition: null
    },
    {
      key: "delivered",
      label: "Delivered",
      description: "Complete the delivery after proof has been recorded.",
      complete: rank >= 6,
      active: rank === 4 && hasProofOfDelivery,
      actionLabel: rank === 4 && hasProofOfDelivery ? "Complete delivery" : null,
      transition: rank === 4 && hasProofOfDelivery ? "delivered" : null
    }
  ];
}

export function getDriverBlockedReason(input: { hasSession: boolean; driverError: string | null }) {
  if (!input.hasSession) {
    return "Sign in before using the driver execution app.";
  }

  if (input.driverError?.includes("driver_record_required")) {
    return "Driver profile not ready. Dispatch access requires an approved active driver profile.";
  }

  return input.driverError;
}
