function normalizeArrayValues(values: unknown[]): string[] {
  return values
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function splitLooseStringArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.includes("\n")) {
    return normalizeArrayValues(trimmed.split(/\r?\n/));
  }

  if (/[•▪◦·]/.test(trimmed)) {
    return normalizeArrayValues(trimmed.split(/[•▪◦·]/g));
  }

  if (trimmed.includes(";")) {
    return normalizeArrayValues(trimmed.split(";"));
  }

  if (trimmed.includes(",")) {
    return normalizeArrayValues(trimmed.split(","));
  }

  return [trimmed];
}

export function parseStoredStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return normalizeArrayValues(value);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return normalizeArrayValues(parsed);
    }

    if (typeof parsed === "string") {
      return splitLooseStringArray(parsed);
    }
  } catch {
    // Fall back to a tolerant plain-text parser for legacy seeded rows.
  }

  return splitLooseStringArray(trimmed);
}

export function stringifyStoredStringArray(value: unknown): string | null {
  const normalized = parseStoredStringArray(value);
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}
