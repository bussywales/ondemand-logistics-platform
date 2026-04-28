export function normalizeBillingPostcode(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

