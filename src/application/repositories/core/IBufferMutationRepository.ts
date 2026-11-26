import type { Edge, EdgeSource, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { UpsertPathSelectionInput } from './IPathRepository';

export interface BufferMutation {
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly ownerAgentId: ULID;
  readonly operationId: ULID;
  readonly expectedRevision: number;
  /** The path's durable rows before the write; may be shorter than the resolved path. */
  readonly expectedSequence: readonly ULID[];
  readonly createdAt: Date;
  readonly nodeInserts: readonly Node[];
  readonly edgeInserts: readonly Edge[];
  readonly sourceAdditions: readonly { edgeId: ULID; source: EdgeSource }[];
  readonly sequence: readonly ULID[];
  readonly cursor: ULID | undefined;
  readonly selectionUpserts: readonly UpsertPathSelectionInput[];
}

export interface IBufferMutationRepository {
  apply(plan: BufferMutation): Promise<'applied' | 'already-applied' | 'stale'>;
}
