/**
 * How many continuations the chat starts at once (1 to 4), remembered
 * app-wide across launches. Infrastructure implements this contract.
 */
export interface IContinuationCountPreferenceRepository {
  /** The stored count, or the default when none was ever saved. */
  get(): Promise<number>;

  /** Saves a count, clamped into range; returns what was stored. */
  set(count: number): Promise<number>;
}
