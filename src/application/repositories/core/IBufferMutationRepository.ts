import type { Edge, EdgeSource, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { CreateRawApiResponseInput } from '../supporting/IRawApiResponseRepository';
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
  beginGeneration(
    intent: BufferGenerationIntent
  ): Promise<'started' | 'already-started' | 'stale'>;
  findPendingGeneration(
    treeId: ULID,
    pathId: ULID
  ): Promise<BufferGenerationIntent | null>;
  persistGenerationSlot(
    write: BufferGenerationSlotWrite
  ): Promise<BufferGenerationSlotWriteResult>;
  rollbackGenerationSlot(input: {
    readonly drawId: ULID;
    readonly slot: number;
    readonly nodeId: ULID;
  }): Promise<void>;
  completeGeneration(
    intent: BufferGenerationIntent,
    slots: readonly BufferSavedGenerationSlot[]
  ): Promise<'applied' | 'already-applied' | 'stale'>;
}

/** Durable recovery marker written before any generation request starts. */
export interface BufferGenerationIntent {
  readonly drawId: ULID;
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly ownerAgentId: ULID;
  readonly sourceNodeId: ULID;
  readonly expectedRevision: number;
  readonly expectedSequence: readonly ULID[];
  readonly count: number;
  readonly createdAtMs: number;
}

export interface BufferGenerationSlotWrite {
  readonly intent: BufferGenerationIntent;
  readonly node: Node;
  readonly edge: Edge;
  readonly rawApiResponse: CreateRawApiResponseInput;
}

export type BufferGenerationSlotWriteResult = {
  readonly status: 'applied' | 'already-applied' | 'stale';
  readonly rawApiResponseId?: ULID;
};

export interface BufferSavedGenerationSlot {
  readonly slot: number;
  readonly nodeId: ULID;
  readonly edgeId: ULID;
}
