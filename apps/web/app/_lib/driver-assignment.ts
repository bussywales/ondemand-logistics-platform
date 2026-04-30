import type { EligibleDriver, EligibleDriverSuitabilityFlag } from "./product-state";

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

export function getEligibleDriverTone(flag: EligibleDriverSuitabilityFlag) {
  switch (flag) {
    case "READY":
      return "status-positive";
    case "NO_LIVE_LOCATION":
      return "status-live";
    default:
      return "status-negative";
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
