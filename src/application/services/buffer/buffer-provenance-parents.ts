import type { Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { BufferGraph } from './buffer-graph';

/** Every version of the generation parent's family may continue to this child. */
export const bufferContinuationParents = (
  graph: BufferGraph,
  actualParentId: ULID
): readonly Node[] => {
  const family = graph.familyOf.get(actualParentId);
  const parents = family ? graph.versionsOf.get(family) : undefined;
  if (!parents?.some((node) => node.id === actualParentId)) {
    throw new Error(
      'Buffer generation parent is missing from its version family.'
    );
  }
  return parents;
};

/** Parent ids committed to by a model node's immutable provenance hash. */
export const modelProvenanceParentIds = (
  node: Node,
  continuationParentIds: readonly ULID[]
): readonly ULID[] => {
  const creationParentId = node.metadata.buffer?.creationParentId;
  return creationParentId ? [creationParentId] : continuationParentIds;
};
