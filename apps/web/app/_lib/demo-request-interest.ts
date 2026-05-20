import type { DemoRequestInterestType } from "./product-state";

export function normalizeDemoRequestInterest(value: string | null | undefined): DemoRequestInterestType {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["pilot", "pilot_merchant", "merchant", "restaurant", "retailer"].includes(normalized)) {
    return "PILOT_MERCHANT";
  }

  if (["operator", "operator_platform", "platform", "dispatch"].includes(normalized)) {
    return "OPERATOR_PLATFORM";
  }

  if (["investor", "partner", "investor_partner"].includes(normalized)) {
    return "INVESTOR_PARTNER";
  }

  if (normalized === "other") {
    return "OTHER";
  }

  return "PILOT_MERCHANT";
}
