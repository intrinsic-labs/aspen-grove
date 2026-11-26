import type { ULID } from '../value-objects';

export type StreamInterruptionReasonValue =
  'timeout' | 'network' | 'provider_error' | 'cancelled';

/** Immutable creation evidence for a buffer passage. */
export interface BufferNodeInfo {
  readonly creationParentId?: ULID;
  readonly drawId?: ULID;
  readonly slot?: number;
  readonly interruption?: StreamInterruptionReasonValue;
}
