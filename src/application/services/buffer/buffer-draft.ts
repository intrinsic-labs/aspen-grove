import type { ULID } from '@domain/value-objects';
import type { computeHumanContentHash } from '../content-hash-service';

export interface BufferDraft {
  /** The single path whose sequence, cursor and selections may change. */
  readonly pathId: ULID;
  /** Tree that owns the graph snapshot. */
  readonly treeId: ULID;
  /** The editing human who owns this path and its buffer cursor. */
  readonly ownerAgentId: ULID;
  /** Exact versions present when the editor opened this revision. */
  readonly expectedSequence: readonly ULID[];
  /** Optimistic concurrency token for the writer. */
  readonly expectedRevision: number;
  /** Stable identity of this commit, retained across retries. */
  readonly operationId: ULID;
  /** Reserved operation time in epoch milliseconds, suitable for a recovery draft. */
  readonly createdAtMs?: number;
  /** Reserved node ids in allocation order (tail first, then path order). */
  readonly nodeIds: readonly ULID[];
  /** Reserved edge ids in allocation order (tail first, then incoming edges in graph order). */
  readonly edgeIds: readonly ULID[];
  /** Final literal text of each touched passage, keyed by its original version. */
  readonly edits: readonly { readonly nodeId: ULID; readonly text: string }[];
  /** Literal uncommitted text following the old leaf. */
  readonly workingTail: string;
}

/** Fallback reservations must return the same value for the same operation/key on replay. */
export interface BufferEditPorts {
  now(operationId: ULID): Date;
  nextId(operationId: ULID, kind: 'node' | 'edge', index: number): ULID;
  hashHuman: typeof computeHumanContentHash;
}
