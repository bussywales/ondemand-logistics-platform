import type { EligibleDriver, EligibleDriverSuitabilityFlag } from "./product-state";

export type DriverAssignmentFailureModel = {
  title: string;
  suitabilityReason: string;
  suitabilityFlags: EligibleDriverSuitabilityFlag[];
  nextSteps: string[];
  keepPickerOpen: true;
};

export function getEligibleDriverFlagLabel(flag: EligibleDriverSuitabilityFlag) {
  switch (flag) {
    case "READY":
      return "Ready";
    case "OFFLINE":
      return "Offline";
    case "ACTIVE_JOB":
      return "Active job";
    case "VEHICLE_MISMATCH":
      return "Vehicle mismatch";
    case "VERIFICATION_NOT_APPROVED":
      return "Verification not approved";
    case "NO_LIVE_LOCATION":
      return "No live location";
    case "EXISTING_OPEN_OFFER":
      return "Offer already open";
  }
}

export function getDriverAssignmentNextSteps(flags: EligibleDriverSuitabilityFlag[]) {
  const steps = new Set<string>();

  if (flags.includes("OFFLINE")) {
    steps.add("Choose another driver or ask this driver to go online.");
  }

  if (flags.includes("ACTIVE_JOB")) {
    steps.add("Choose a driver who is not already on an active delivery.");
  }

  if (flags.includes("VEHICLE_MISMATCH")) {
    steps.add("Pick a driver with the required vehicle type for this delivery.");
  }

  if (flags.includes("VERIFICATION_NOT_APPROVED")) {
    steps.add("Verify driver approval before assigning this job.");
  }

  if (flags.includes("EXISTING_OPEN_OFFER")) {
    steps.add("Choose another driver or wait for the current open offer to resolve.");
  }

  if (flags.includes("NO_LIVE_LOCATION")) {
    steps.add("Confirm the driver app is sending live location before assigning.");
  }

  if (steps.size === 0) {
    steps.add("Choose another driver from the current eligible pool.");
  }

  return [...steps];
}

export function getBlockedDriverLabel(driver: EligibleDriver) {
  if (driver.eligible) {
    return "Assignable now";
  }

  if (driver.suitabilityFlags.includes("ACTIVE_JOB")) {
    return "Blocked: already on a job";
  }

  if (driver.suitabilityFlags.includes("OFFLINE")) {
    return "Blocked: offline";
  }

  if (driver.suitabilityFlags.includes("VEHICLE_MISMATCH")) {
    return "Blocked: wrong vehicle";
  }

  if (driver.suitabilityFlags.includes("VERIFICATION_NOT_APPROVED")) {
    return "Blocked: verification pending";
  }

  if (driver.suitabilityFlags.includes("EXISTING_OPEN_OFFER")) {
    return "Blocked: offer already open";
  }

  return "Blocked";
}

export function toDriverAssignmentFailureModel(input: {
  suitabilityReason: string;
  suitabilityFlags: EligibleDriverSuitabilityFlag[];
}): DriverAssignmentFailureModel {
  return {
    title: "Driver cannot be assigned",
    suitabilityReason: input.suitabilityReason,
    suitabilityFlags: input.suitabilityFlags,
    nextSteps: getDriverAssignmentNextSteps(input.suitabilityFlags),
    keepPickerOpen: true
  };
}

export function getEligibleDriverTone(flag: EligibleDriverSuitabilityFlag) {
  switch (flag) {
    case "READY":
      return "sw-badge--success";
    case "NO_LIVE_LOCATION":
      return "sw-badge--warning";
    default:
      return "sw-badge--danger";
  }
}

export function getEligibleDriverEmptyState(drivers: EligibleDriver[]) {
  if (drivers.some((driver) => driver.suitabilityFlags.includes("OFFLINE"))) {
    return "No online drivers are currently available for this job.";
  }

  if (drivers.some((driver) => driver.suitabilityFlags.includes("VEHICLE_MISMATCH"))) {
    return "Available drivers do not match the required vehicle type.";
  }

  if (drivers.some((driver) => driver.suitabilityFlags.includes("ACTIVE_JOB"))) {
    return "Available drivers are already on another active delivery.";
  }

  if (drivers.some((driver) => driver.suitabilityFlags.includes("VERIFICATION_NOT_APPROVED"))) {
    return "Driver verification is not approved for the current pool.";
  }

  return "No eligible drivers are available in the current staged driver pool.";
}

export function filterEligibleDrivers(drivers: EligibleDriver[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return drivers;
  }

  return drivers.filter((driver) => {
    const haystack = [
      driver.displayName,
      driver.vehicleType ?? "",
      driver.verificationStatus,
      driver.suitabilityReason
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
