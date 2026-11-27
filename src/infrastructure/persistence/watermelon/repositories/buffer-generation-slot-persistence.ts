import { Q, type Database } from '@nozbe/watermelondb';
import type {
  BufferGenerationIntent,
  BufferGenerationSlotWrite,
  BufferGenerationSlotWriteResult,
} from '@application/repositories/core/IBufferMutationRepository';
import { createULID, type ULID } from '@domain/value-objects';
import LoomTree from '../model/LoomTree';
import Node from '../model/Node';
import { Edge, EdgeSource } from '../model/Edge';
import { Path } from '../model/Path';
import RawApiResponse from '../model/RawApiResponse';
import { parseBufferNodeMetadata } from './buffer-node-metadata';
import { prepareBufferGenerationSlot } from './prepare-buffer-records';

const sameIntent = (
  left: BufferGenerationIntent,
  right: BufferGenerationIntent
) => JSON.stringify(left) === JSON.stringify(right);

export const persistBufferGenerationSlot = (
  db: Database,
  write: BufferGenerationSlotWrite,
  pending: BufferGenerationIntent | null
): Promise<BufferGenerationSlotWriteResult> =>
  db.write(async () => {
    const { intent, node, edge } = write;
    const existing = await db
      .get<Node>('nodes')
      .query(Q.where('id', node.id))
      .fetch();
    if (existing.length) {
      const metadata = parseBufferNodeMetadata(existing[0].metadata).buffer;
      const raw = await db
        .get<RawApiResponse>('raw_api_responses')
        .query(Q.where('node_id', node.id))
        .fetch();
      return metadata?.drawId === intent.drawId &&
        metadata.slot === node.metadata.buffer?.slot &&
        raw.length === 1
        ? { status: 'already-applied', rawApiResponseId: raw[0].id as ULID }
        : { status: 'stale' };
    }
    const [trees, paths, nodes, edgeCollision, rawCollision] =
      await Promise.all([
        db
          .get<LoomTree>('loom_trees')
          .query(Q.where('id', intent.treeId))
          .fetch(),
        db
          .get<Path>('paths')
          .query(
            Q.where('id', intent.pathId),
            Q.where('loom_tree_id', intent.treeId)
          )
          .fetch(),
        db
          .get<Node>('nodes')
          .query(Q.where('loom_tree_id', intent.treeId))
          .fetch(),
        db.get<Edge>('edges').query(Q.where('id', edge.id)).fetchCount(),
        db
          .get<RawApiResponse>('raw_api_responses')
          .query(Q.where('node_id', node.id))
          .fetchCount(),
      ]);
    const [tree] = trees;
    const [path] = paths;
    const info = node.metadata.buffer;
    const nodeIds = new Set(nodes.map((candidate) => candidate.id));
    if (
      !pending ||
      !sameIntent(pending, intent) ||
      tree?.mode !== 'buffer' ||
      !path ||
      path.ownerAgentId !== intent.ownerAgentId ||
      node.loomTreeId !== intent.treeId ||
      edge.loomTreeId !== intent.treeId ||
      edge.targetNodeId !== node.id ||
      write.rawApiResponse.nodeId !== node.id ||
      info?.drawId !== intent.drawId ||
      info.creationParentId !== intent.sourceNodeId ||
      info.slot === undefined ||
      info.slot >= intent.count ||
      !edge.sources.some(
        (source) =>
          source.role === 'primary' && source.nodeId === info.creationParentId
      ) ||
      edge.sources.some((source) => !nodeIds.has(source.nodeId)) ||
      nodes.some((candidate) => candidate.localId === node.localId) ||
      edgeCollision > 0 ||
      rawCollision > 0
    ) {
      return { status: 'stale' };
    }

    const rawApiResponseId = createULID();
    await db.batch(
      prepareBufferGenerationSlot(db, write, rawApiResponseId, new Date())
    );
    return { status: 'applied', rawApiResponseId };
  });

export const rollbackBufferGenerationSlot = (
  db: Database,
  input: { readonly drawId: ULID; readonly slot: number; readonly nodeId: ULID }
): Promise<void> =>
  db.write(async () => {
    const nodes = await db
      .get<Node>('nodes')
      .query(Q.where('id', input.nodeId))
      .fetch();
    const node = nodes[0];
    const info = node && parseBufferNodeMetadata(node.metadata).buffer;
    if (!node || info?.drawId !== input.drawId || info.slot !== input.slot)
      return;
    const [edges, raws] = await Promise.all([
      db
        .get<Edge>('edges')
        .query(Q.where('target_node_id', input.nodeId))
        .fetch(),
      db
        .get<RawApiResponse>('raw_api_responses')
        .query(Q.where('node_id', input.nodeId))
        .fetch(),
    ]);
    const sources = edges.length
      ? await db
          .get<EdgeSource>('edge_sources')
          .query(Q.where('edge_id', Q.oneOf(edges.map((edge) => edge.id))))
          .fetch()
      : [];
    await db.batch([
      ...raws.map((raw) => raw.prepareDestroyPermanently()),
      ...sources.map((source) => source.prepareDestroyPermanently()),
      ...edges.map((edge) => edge.prepareDestroyPermanently()),
      node.prepareDestroyPermanently(),
    ]);
  });
