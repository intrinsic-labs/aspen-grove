/** Fewest and most continuations one action may start at once. */
export const MIN_PARALLEL_CONTINUATIONS = 1;
export const MAX_PARALLEL_CONTINUATIONS = 4;

/** What a new install draws: one, as before several-at-once existed. */
export const DEFAULT_PARALLEL_CONTINUATIONS = 1;

export const isValidContinuationCount = (count: number): boolean =>
  Number.isInteger(count) &&
  count >= MIN_PARALLEL_CONTINUATIONS &&
  count <= MAX_PARALLEL_CONTINUATIONS;

/**
 * Brings any stored or requested value into range: rounds, clamps to 1-4,
 * and falls back to the default for anything that isn't a number.
 */
export const clampContinuationCount = (count: unknown): number => {
  if (typeof count !== 'number' || !Number.isFinite(count)) {
    return DEFAULT_PARALLEL_CONTINUATIONS;
  }
  return Math.min(
    MAX_PARALLEL_CONTINUATIONS,
    Math.max(MIN_PARALLEL_CONTINUATIONS, Math.round(count))
  );
};
