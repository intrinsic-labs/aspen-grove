import {
  createLocalId,
  createULID,
  type ContentHash,
} from '@domain/value-objects';
import {
  BufferCommands,
  CommitBufferChangesUseCase,
} from '@application/use-cases/CommitBufferChangesUseCase';
import { SwitchBufferPathUseCase } from '@application/use-cases/SwitchBufferPathUseCase';
import { indexBufferGraph } from '@application/services/buffer/buffer-graph';
import {
  planBufferEdit,
  type BufferDraft,
} from '@application/services/buffer/plan-buffer-edit';
import { resolveBufferPath } from '@application/services/buffer/resolve-buffer-path';
import { computeHumanContentHash } from '@application/services/content-hash-service';
import { bufferTestDatabase } from './buffer-test-database';
import { WatermelonEdgeRepository } from './WatermelonEdgeRepository';
import { WatermelonLoomTreeRepository } from './WatermelonLoomTreeRepository';
import { WatermelonNodeRepository } from './WatermelonNodeRepository';
import { WatermelonPathRepository } from './WatermelonPathRepository';
import { WatermelonBufferDraftStore } from './WatermelonBufferDraftStore';
import { WatermelonBufferMutationRepository } from './WatermelonBufferMutationRepository';

export async function bufferFixture() {
  const db = bufferTestDatabase();
  const treeId = createULID(),
    ownerAgentId = createULID(),
    root = createULID(),
    child = createULID();
  const nodeRepo = new WatermelonNodeRepository(db);
  const edgeRepo = new WatermelonEdgeRepository(db);
  const treeRepo = new WatermelonLoomTreeRepository(db);
  const pathRepo = new WatermelonPathRepository(db);
  const bufferDraftStore = new WatermelonBufferDraftStore(db);
  const bufferMutationRepo = new WatermelonBufferMutationRepository(db);
  const commands = new BufferCommands({
    nodeRepo,
    edgeRepo,
    pathRepo,
    bufferDraftStore,
    bufferMutationRepo,
  });
  const commit = new CommitBufferChangesUseCase(commands);
  const switchPath = new SwitchBufferPathUseCase(commands);
  await treeRepo.create({
    id: treeId,
    rootNodeId: root,
    mode: 'buffer',
    groveId: createULID(),
  });
  for (const [id, text] of [
    [root, 'first'],
    [child, 'second'],
  ] as const) {
    await nodeRepo.create({
      id,
      content: { type: 'text', text },
      authorType: 'human',
      authorAgentId: ownerAgentId,
      loomTreeId: treeId,
      contentHash: 'seed' as ContentHash,
      localId: createLocalId(id, new Set()),
    });
  }
  const edge = await edgeRepo.create({
    loomTreeId: treeId,
    sources: [
      { nodeId: root, role: 'primary' },
      { nodeId: child, role: 'context' },
    ],
    targetNodeId: child,
    edgeType: 'continuation',
  });
  async function makePath() {
    const path = await pathRepo.create({ loomTreeId: treeId, ownerAgentId });
    for (const id of [root, child]) await pathRepo.appendNode(path.id, id);
    return path.id;
  }
  const pathId = await makePath();
  const sequence = async (id = pathId) =>
    (await pathRepo.getNodeSequence(id)).map((row) => row.nodeId);
  const draft = async (
    overrides: Partial<BufferDraft> = {}
  ): Promise<BufferDraft> => ({
    treeId,
    pathId,
    ownerAgentId,
    operationId: createULID(),
    createdAtMs: Date.now(),
    expectedSequence: await sequence(),
    expectedRevision: (await pathRepo.findById(pathId))!.updatedAt.getTime(),
    nodeIds: [createULID(), createULID()],
    edgeIds: [createULID(), createULID()],
    edits: [{ nodeId: root, text: 'edited' }],
    workingTail: '',
    ...overrides,
  });
  const graph = async () =>
    indexBufferGraph(
      await nodeRepo.findByLoomTreeId(treeId, true),
      await edgeRepo.findByLoomTreeId(treeId)
    );
  const reopen = async () =>
    resolveBufferPath(
      await graph(),
      await sequence(),
      await pathRepo.getSelections(pathId),
      { kind: 'open' }
    );
  const plan = async (value: BufferDraft) =>
    planBufferEdit(await graph(), await reopen(), value, {
      nextId: createULID,
      now: () => new Date(),
      hashHuman: computeHumanContentHash,
    });
  const counts = () =>
    Promise.all(
      [
        'nodes',
        'edges',
        'edge_sources',
        'paths',
        'path_nodes',
        'path_states',
        'path_selections',
        'raw_api_responses',
      ].map((t) => db.get(t).query().fetchCount())
    );
  return {
    db,
    treeId,
    pathId,
    root,
    child,
    edge,
    treeRepo,
    nodeRepo,
    pathRepo,
    edgeRepo,
    bufferDraftStore,
    bufferMutationRepo,
    commit,
    switchPath,
    draft,
    plan,
    counts,
    sequence,
    reopen,
    makePath,
  };
}
