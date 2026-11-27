import { Q, type Database } from '@nozbe/watermelondb';
import type {
  BufferGenerationIntent,
  BufferGenerationSlotWrite,
  BufferSavedGenerationSlot,
  IBufferMutationRepository,
} from '@application/repositories/core/IBufferMutationRepository';
import type { ULID } from '@domain/value-objects';
import LoomTree from '../model/LoomTree';
import { Path } from '../model/Path';
import { loadBufferPathRows, prepareBufferPath } from './prepare-buffer-path';
import {
  persistBufferGenerationSlot,
  rollbackBufferGenerationSlot,
} from './buffer-generation-slot-persistence';

export const bufferGenerationKey = (treeId: string, pathId: string) =>
  `buffer.generation.${treeId}.${pathId}`;
const same = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((id, index) => id === right[index]);
const sameIntent = (
  left: BufferGenerationIntent,
  right: BufferGenerationIntent
) => JSON.stringify(left) === JSON.stringify(right);

/** Persistence concern composed into the buffer mutation repository. */
export class WatermelonBufferGenerationRepository {
  constructor(private readonly db: Database) {}

  beginGeneration(
    intent: BufferGenerationIntent
  ): ReturnType<IBufferMutationRepository['beginGeneration']> {
    return this.db.write(async () => {
      const [tree, path, rows, pending] = await Promise.all([
        this.findTree(intent.treeId),
        this.findPath(intent.treeId, intent.pathId),
        loadBufferPathRows(this.db, intent.pathId),
        this.findPendingGeneration(intent.treeId, intent.pathId),
      ]);
      if (pending)
        return sameIntent(pending, intent) ? 'already-started' : 'stale';
      if (
        tree?.mode !== 'buffer' ||
        !path ||
        path.ownerAgentId !== intent.ownerAgentId ||
        path.updatedAt.getTime() !== intent.expectedRevision ||
        !same(
          rows.sequence.map((row) => row.nodeId),
          intent.expectedSequence
        ) ||
        intent.expectedSequence.at(-1) !== intent.sourceNodeId
      ) {
        return 'stale';
      }
      await this.db.localStorage.set(
        bufferGenerationKey(intent.treeId, intent.pathId),
        intent
      );
      return 'started';
    });
  }

  async findPendingGeneration(treeId: ULID, pathId: ULID) {
    return (
      (await this.db.localStorage.get<BufferGenerationIntent>(
        bufferGenerationKey(treeId, pathId)
      )) ?? null
    );
  }

  async persistGenerationSlot(write: BufferGenerationSlotWrite) {
    const pending = await this.findPendingGeneration(
      write.intent.treeId,
      write.intent.pathId
    );
    return persistBufferGenerationSlot(this.db, write, pending);
  }

  rollbackGenerationSlot(input: {
    readonly drawId: ULID;
    readonly slot: number;
    readonly nodeId: ULID;
  }) {
    return rollbackBufferGenerationSlot(this.db, input);
  }

  completeGeneration(
    intent: BufferGenerationIntent,
    slots: readonly BufferSavedGenerationSlot[]
  ): ReturnType<IBufferMutationRepository['completeGeneration']> {
    return this.db.write(async () => {
      const pending = await this.findPendingGeneration(
        intent.treeId,
        intent.pathId
      );
      if (!pending || !sameIntent(pending, intent)) return 'stale';
      const [tree, path, rows] = await Promise.all([
        this.findTree(intent.treeId),
        this.findPath(intent.treeId, intent.pathId),
        loadBufferPathRows(this.db, intent.pathId),
      ]);
      const current = rows.sequence.map((row) => row.nodeId);
      const chosen = [...slots].sort((a, b) => a.slot - b.slot)[0];
      const activated = chosen
        ? [...intent.expectedSequence, chosen.nodeId]
        : intent.expectedSequence;
      if (tree?.mode !== 'buffer' || !path) return 'stale';
      if (same(current, activated)) {
        await this.clear(intent);
        return 'already-applied';
      }
      if (
        path.ownerAgentId !== intent.ownerAgentId ||
        path.updatedAt.getTime() !== intent.expectedRevision ||
        !same(current, intent.expectedSequence)
      ) {
        await this.clear(intent);
        return 'stale';
      }
      if (chosen) {
        await this.db.batch(
          prepareBufferPath(
            this.db,
            {
              operationId: intent.drawId,
              treeId: intent.treeId,
              pathId: intent.pathId,
              ownerAgentId: intent.ownerAgentId,
              expectedRevision: intent.expectedRevision,
              expectedSequence: intent.expectedSequence,
              createdAt: new Date(intent.createdAtMs),
              nodeInserts: [],
              edgeInserts: [],
              sourceAdditions: [],
              sequence: activated,
              cursor: chosen.nodeId,
              selectionUpserts: [
                {
                  pathId: intent.pathId,
                  targetNodeId: chosen.nodeId,
                  selectedEdgeId: chosen.edgeId,
                  selectedSourceNodeId: intent.sourceNodeId,
                },
              ],
            },
            tree,
            path,
            rows
          )
        );
      }
      await this.clear(intent);
      return 'applied';
    });
  }

  private async clear(intent: BufferGenerationIntent) {
    const current = await this.findPendingGeneration(
      intent.treeId,
      intent.pathId
    );
    if (current && sameIntent(current, intent)) {
      await this.db.localStorage.remove(
        bufferGenerationKey(intent.treeId, intent.pathId)
      );
    }
  }

  private async findTree(treeId: ULID) {
    return (
      await this.db
        .get<LoomTree>('loom_trees')
        .query(Q.where('id', treeId))
        .fetch()
    )[0];
  }

  private async findPath(treeId: ULID, pathId: ULID) {
    return (
      await this.db
        .get<Path>('paths')
        .query(Q.where('id', pathId), Q.where('loom_tree_id', treeId))
        .fetch()
    )[0];
  }
}
