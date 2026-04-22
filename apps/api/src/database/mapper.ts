export function toIsoDateTime(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

export function toNullableIsoDateTime(value: string | Date | null) {
  if (value === null) {
    return null;
  }

  return toIsoDateTime(value);
}

export function toFiniteNumber(value: string | number, fieldName: string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${fieldName} must be a finite number`);
  }

  return parsed;
}

export function toInteger(value: string | number, fieldName: string) {
  const parsed = toFiniteNumber(value, fieldName);

  if (!Number.isInteger(parsed)) {
    throw new TypeError(`${fieldName} must be an integer`);
  }

  return parsed;
}
