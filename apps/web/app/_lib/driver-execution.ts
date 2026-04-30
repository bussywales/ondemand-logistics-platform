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

export type DriverHeroState = {
  title: string;
  message: string;
  readinessLabel: string;
  readinessCopy: string;
  tone: "online" | "offline" | "active";
};

export type DriverBlockedStateView = {
  title: string;
  message: string;
  supporting: string;
};

export type DriverEmptyStateView = {
  title: string;
  copy: string;
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

export function getDriverActiveStep(steps: DriverExecutionStep[]) {
  return steps.find((step) => step.active) ?? steps.find((step) => !step.complete) ?? steps.at(-1) ?? null;
}

export function getDriverHeroState(input: {
  availability: "ONLINE" | "OFFLINE";
  hasCurrentJob: boolean;
  offerCount: number;
}): DriverHeroState {
  if (input.hasCurrentJob) {
    return {
      title: "Delivery in progress",
      message: "Work the active job step by step and keep proof of delivery complete before finishing.",
      readinessLabel: "Live job",
      readinessCopy: "The next execution action is ready below.",
      tone: "active"
    };
  }

  if (input.availability === "ONLINE") {
    return {
      title: "Ready to receive offers",
      message: "Stay online to receive staged dispatch offers for nearby delivery work.",
      readinessLabel: input.offerCount > 0 ? "Offer waiting" : "Listening for dispatch",
      readinessCopy:
        input.offerCount > 0
          ? `${input.offerCount} offer${input.offerCount === 1 ? "" : "s"} ready for review.`
          : "No offer is waiting right now, but dispatch can route new work here.",
      tone: "online"
    };
  }

  return {
    title: "Offline",
    message: "Go online when you are ready to receive offers and start delivery work.",
    readinessLabel: "Dispatch paused",
    readinessCopy: "No offers will reach this device until the driver is online.",
    tone: "offline"
  };
}

export function getDriverBlockedState(input: { hasSession: boolean; driverError: string | null }): DriverBlockedStateView {
  if (!input.hasSession) {
    return {
      title: "Sign in to continue",
      message: "Driver execution is only available after authenticating the staged driver account.",
      supporting: "Use the driver account issued for staging, then return here to receive offers and progress jobs."
    };
  }

  if (input.driverError?.includes("driver_record_required")) {
    return {
      title: "Driver profile not ready",
      message: "Driver profile not ready. Dispatch access requires an approved active driver profile before this route can receive offers.",
      supporting: "Check driver onboarding, verification approval, vehicle setup, and activation before retrying."
    };
  }

  return {
    title: "Driver access blocked",
    message: input.driverError ?? "Driver execution is not available right now.",
    supporting: "Refresh the workspace after the driver profile and approval state are corrected."
  };
}

export function getDriverOfferEmptyState(input: {
  availability: "ONLINE" | "OFFLINE";
  hasCurrentJob: boolean;
}): DriverEmptyStateView {
  if (input.hasCurrentJob) {
    return {
      title: "Focus on the active delivery",
      copy: "New offers stay out of the way while the current job is still in motion."
    };
  }

  if (input.availability === "OFFLINE") {
    return {
      title: "Go online to receive offers",
      copy: "Dispatch only sends staged work to drivers who are online and ready."
    };
  }

  return {
    title: "No offers available",
    copy: "Dispatch offers will appear here while you are online, approved, and close enough for the job."
  };
}

export function getDriverBlockedReason(input: { hasSession: boolean; driverError: string | null }) {
  return getDriverBlockedState(input).message;
}
