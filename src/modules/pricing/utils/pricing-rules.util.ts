export function normalizeCode(x: string) {
  return x.trim();
}
export function normalizeName(x: string) {
  return x.trim();
}

export function ensureDateOrder(from?: string | null, to?: string | null) {
  if (from && to && from > to) {
    throw new Error(`effective_from (${from}) cannot be after effective_to (${to})`);
  }
}

/**
 * Check overlap for effective ranges (inclusive).
 * Null means open-ended.
 */
export function rangesOverlap(aFrom: string | null, aTo: string | null, bFrom: string | null, bTo: string | null) {
  const leftFrom = aFrom ?? '0000-01-01';
  const leftTo = aTo ?? '9999-12-31';
  const rightFrom = bFrom ?? '0000-01-01';
  const rightTo = bTo ?? '9999-12-31';
  return leftFrom <= rightTo && rightFrom <= leftTo;
}
