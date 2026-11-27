import { Q, type Database, type Model } from '@nozbe/watermelondb';
import type {
  BufferMutation,
  IBufferMutationRepository,
} from '@application/repositories/core/IBufferMutationRepository';
import Node from '../model/Node';
import LoomTree from '../model/LoomTree';
import { Edge, EdgeSource } from '../model/Edge';
import { Path } from '../model/Path';
import { loadBufferPathRows, prepareBufferPath } from './prepare-buffer-path';
import { prepareBufferRecords } from './prepare-buffer-records';
import { WatermelonBufferGenerationRepository } from './WatermelonBufferGenerationRepository';

const same = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((id, index) => id === right[index]);
const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
export class WatermelonBufferMutationRepository implements IBufferMutationRepository {
  private readonly generation: WatermelonBufferGenerationRepository;

  constructor(private readonly db: Database) {
    this.generation = new WatermelonBufferGenerationRepository(db);
  }

  apply(plan: BufferMutation): ReturnType<IBufferMutationRepository['apply']> {
    const db = this.db;
    return db.write(async () => {
      const inTree = Q.where('loom_tree_id', plan.treeId);
      const newNodes = plan.nodeInserts.map((n) => n.id);
      const newEdges = plan.edgeInserts.map((e) => e.id);
      const [
        trees,
        paths,
        rows,
        nodes,
        edges,
        nodeCollisions,
        edgeCollisions,
        membershipCollision,
      ] = await Promise.all([
        db
          .get<LoomTree>('loom_trees')
          .query(Q.where('id', plan.treeId))
          .fetch(),
        db.get<Path>('paths').query(Q.where('id', plan.pathId), inTree).fetch(),
        loadBufferPathRows(db, plan.pathId),
        db.get<Node>('nodes').query(inTree).fetch(),
        db.get<Edge>('edges').query(inTree).fetch(),
        db
          .get('nodes')
          .query(Q.where('id', Q.oneOf(newNodes)))
          .fetchCount(),
        db
          .get('edges')
          .query(Q.where('id', Q.oneOf(newEdges)))
          .fetchCount(),
        db
          .get('path_nodes')
          .query(Q.where('id', plan.operationId))
          .fetchCount(),
      ]);
      const [tree] = trees;
      const [path] = paths;
      if (
        tree?.mode !== 'buffer' ||
        !path ||
        path.ownerAgentId !== plan.ownerAgentId
      )
        return 'stale';
      const originals = new Map(nodes.map((n) => [n.id, n]));
      const current = rows.sequence.map((n) => n.nodeId);
      const sameRevision = path.updatedAt.getTime() === plan.expectedRevision;
      if (
        same(current, plan.sequence) &&
        newNodes.every((id) => originals.has(id))
      ) {
        // A changed recovery draft can reuse reserved IDs. Never acknowledge a
        // different immutable passage just because it landed at the same ID.
        const matches = plan.nodeInserts.every((node) => {
          const row = originals.get(node.id)!;
          return (
            row.contentHash === node.contentHash &&
            row.editedFrom === (node.editedFrom ?? null) &&
            JSON.stringify(row.content) === JSON.stringify(node.content)
          );
        });
        if (!matches) return 'stale';
        if (
          newNodes.length ||
          rows.sequence[0]?.id === plan.operationId ||
          (sameRevision &&
            same(current, plan.expectedSequence) &&
            !newEdges.length &&
            !plan.sourceAdditions.length)
        )
          return 'already-applied';
      }
      if (
        !same(current, plan.expectedSequence) ||
        !sameRevision ||
        nodeCollisions ||
        edgeCollisions ||
        membershipCollision
      )
        return 'stale';

      const localIds = new Set(nodes.map((n) => n.localId));
      for (const node of plan.nodeInserts) {
        if (
          node.loomTreeId !== tree.id ||
          (node.editedFrom && !originals.has(node.editedFrom)) ||
          localIds.has(node.localId)
        )
          return 'stale';
        localIds.add(node.localId);
      }
      const nodeIds = new Set([...originals.keys(), ...newNodes]);
      const edgeIds = new Set([...edges.map((e) => e.id), ...newEdges]);
      if (
        !unique([...newNodes, ...newEdges]) ||
        !unique(plan.sequence) ||
        !plan.sequence.every((id) => nodeIds.has(id)) ||
        plan.cursor !== plan.sequence.at(-1) ||
        plan.edgeInserts.some(
          (e) =>
            e.loomTreeId !== tree.id ||
            !nodeIds.has(e.targetNodeId) ||
            e.sources.some((s) => !nodeIds.has(s.nodeId))
        ) ||
        !unique(plan.selectionUpserts.map((s) => s.targetNodeId)) ||
        plan.selectionUpserts.some(
          (s) =>
            s.pathId !== path.id ||
            !nodeIds.has(s.targetNodeId) ||
            (s.selectedEdgeId && !edgeIds.has(s.selectedEdgeId)) ||
            (s.selectedSourceNodeId && !nodeIds.has(s.selectedSourceNodeId))
        )
      )
        return 'stale';

      const additions = plan.sourceAdditions;
      if (additions.length) {
        const sources = await db
          .get<EdgeSource>('edge_sources')
          .query(
            Q.where(
              'edge_id',
              Q.oneOf([...new Set(additions.map((a) => a.edgeId))])
            )
          )
          .fetch();
        const families = new Map(
          nodes.map((n) => [n.id, n.versionGroupId ?? n.id])
        );
        const inserts = new Map(plan.nodeInserts.map((n) => [n.id, n]));
        const existingEdges = new Set(
          edges.filter((e) => e.edgeType === 'continuation').map((e) => e.id)
        );
        const keys = additions.map((a) => a.edgeId + '/' + a.source.nodeId);
        if (
          !unique(keys) ||
          additions.some(({ edgeId, source }) => {
            const original = inserts.get(source.nodeId)?.editedFrom;
            return (
              !existingEdges.has(edgeId) ||
              source.role !== 'primary' ||
              !original ||
              !sources.some(
                (s) =>
                  s.edgeId === edgeId &&
                  s.role === 'primary' &&
                  families.get(s.sourceNodeId) === families.get(original)
              )
            );
          })
        )
          return 'stale';
      }

      // Preparing an update mutates Watermelon's cached Model before the adapter
      // acknowledges the transaction. Restore those instances if the batch fails.
      const existing: Model[] = [
        tree,
        path,
        ...rows.sequence,
        ...rows.states,
        ...rows.selections,
      ];
      const snapshots = existing.map((record) => ({
        record,
        raw: { ...record._raw },
      }));
      try {
        const creates = prepareBufferRecords(db, plan, originals);
        await db.batch([
          ...creates,
          ...prepareBufferPath(db, plan, tree, path, rows),
        ]);
      } catch (error) {
        for (const { record, raw } of snapshots) {
          record._raw = raw;
          record._preparedState = null;
          record._isEditing = false;
        }
        throw error;
      }
      return 'applied';
    });
  }

  beginGeneration: IBufferMutationRepository['beginGeneration'] = (intent) =>
    this.generation.beginGeneration(intent);

  findPendingGeneration: IBufferMutationRepository['findPendingGeneration'] = (
    treeId,
    pathId
  ) => this.generation.findPendingGeneration(treeId, pathId);

  persistGenerationSlot: IBufferMutationRepository['persistGenerationSlot'] = (
    write
  ) => this.generation.persistGenerationSlot(write);

  rollbackGenerationSlot: IBufferMutationRepository['rollbackGenerationSlot'] =
    (input) => this.generation.rollbackGenerationSlot(input);

  completeGeneration: IBufferMutationRepository['completeGeneration'] = (
    intent,
    slots
  ) => this.generation.completeGeneration(intent, slots);
}
