import type { Edge } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { ChatRow } from '../types';

/**
 * The node a regenerated model response hangs from: the primary source of
 * the first continuation edge into it (else that edge's first source).
 * Undefined when the response has no incoming continuation.
 */
export const findRegenerateSourceNodeId = (
  incomingContinuations: readonly Pick<Edge, 'sources'>[]
): ULID | undefined => {
  const firstEdge = incomingContinuations[0];
  const primarySource =
    firstEdge?.sources.find((source) => source.role === 'primary') ??
    firstEdge?.sources[0];
  return primarySource?.nodeId;
};

/**
 * How many leading rows stay visible while a regenerate streams. A model
 * row disappears with everything after it (its sibling streams into the
 * gap); a human row stays and only what follows it goes. Null when the
 * target is not on the loaded path, so nothing is trimmed.
 */
export const countRowsKeptForRegenerate = (
  rows: readonly Pick<ChatRow, 'id' | 'authorType'>[],
  targetNodeId: ULID
): number | null => {
  const targetIndex = rows.findIndex((row) => row.id === targetNodeId);
  if (targetIndex < 0) {
    return null;
  }
  return rows[targetIndex].authorType === 'model'
    ? targetIndex
    : targetIndex + 1;
};
