// apps/web/src/lib/numeric.ts

/**
 * Convert a bigint/number/nullable into a JS number for UI math (never for on-chain math).
 */
export function toNumberSafe(
  value: bigint | number | string | null | undefined,
  fallback = 0
): number {
  if (typeof value === 'bigint' || typeof value === 'number') return Number(value);
  if (typeof value === 'string') {
    const n = Number(value);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** Convert seconds (bigint|number) to milliseconds as a number. */
export function secondsToMilliseconds(value: bigint | number): number {
  return toNumberSafe(value) * 1000;
}

/** Compare two bigints; returns -1, 0, or 1. */
export function compareBigints(a: bigint, b: bigint): -1 | 0 | 1 {
  return a === b ? 0 : a > b ? 1 : -1;
}

/** Format a 18-decimals bigint (e.g., ETH/MATIC wei) into a human string. */
export function formatFixed18(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const x = value < 0n ? -value : value;
  const i = x / 1_000_000_000_000_000_000n;
  const d = (x % 1_000_000_000_000_000_000n).toString().padStart(18, '0');
  return `${sign}${i}.${d}`;
}
