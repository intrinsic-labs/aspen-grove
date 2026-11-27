import type { Agent, Grove } from '@domain/entities';
import {
  createLocalId,
  createULID,
  type ContentHash,
  type ULID,
} from '@domain/value-objects';
import {
  BufferCommands,
  CommitBufferChangesUseCase,
} from '@application/use-cases/CommitBufferChangesUseCase';
import { CreateBufferLoomTreeUseCase } from '@application/use-cases/CreateBufferLoomTreeUseCase';
import { OpenBufferDocumentUseCase } from '@application/use-cases/OpenBufferDocumentUseCase';
import { SwitchBufferPathUseCase } from '@application/use-cases/SwitchBufferPathUseCase';
import { bufferTestDatabase } from './buffer-test-database';
import { WatermelonBufferDraftStore } from './WatermelonBufferDraftStore';
import { WatermelonBufferMutationRepository } from './WatermelonBufferMutationRepository';
import { WatermelonEdgeRepository } from './WatermelonEdgeRepository';
import { WatermelonLoomTreeRepository } from './WatermelonLoomTreeRepository';
import { WatermelonNodeRepository } from './WatermelonNodeRepository';
import { WatermelonPathRepository } from './WatermelonPathRepository';
import { WatermelonPathStateRepository } from './WatermelonPathStateRepository';
import { WatermelonRawApiResponseRepository } from './WatermelonRawApiResponseRepository';

/**
 * Test helper: a buffer tree made by the real `CreateBufferLoomTreeUseCase`
 * on the LokiJS test database, with every buffer use case wired as in the app.
 * The grove and agent are stubs (only their ids are read). Seeded nodes get
 * explicit creation times in the past so version order is never a tie.
 */
export async function bufferOpenFixture() {
  const db = bufferTestDatabase();
  const ownerAgentId = createULID();
  const modelAgentId = createULID();
  const groveId = createULID();
  const nodeRepo = new WatermelonNodeRepository(db);
  const edgeRepo = new WatermelonEdgeRepository(db);
  const treeRepo = new WatermelonLoomTreeRepository(db);
  const pathRepo = new WatermelonPathRepository(db);
  const bufferDraftStore = new WatermelonBufferDraftStore(db);
  const bufferMutationRepo = new WatermelonBufferMutationRepository(db);
  const rawApiResponseRepo = new WatermelonRawApiResponseRepository(db);
  const groveRepo = {
    findById: async (id: ULID) =>
      id === groveId ? ({ id, ownerAgentId } as Grove) : null,
  };
  const agentRepo = {
    findById: async (id: ULID) => ({ id, type: 'human' }) as Agent,
  };
  const created = await new CreateBufferLoomTreeUseCase({
    groveRepository: groveRepo,
    agentRepository: agentRepo,
    loomTreeRepository: treeRepo,
    nodeRepository: nodeRepo,
    pathRepository: pathRepo,
    pathStateRepository: new WatermelonPathStateRepository(db),
  } as never).execute({ groveId, ownerAgentId });
  const treeId = created.tree.id;
  const pathId = created.path.id;
  const root = created.rootNode.id;
  const commands = new BufferCommands({
    nodeRepo,
    edgeRepo,
    pathRepo,
    bufferDraftStore,
    bufferMutationRepo,
  });
  const open = new OpenBufferDocumentUseCase({
    treeRepo,
    groveRepo: groveRepo as never,
    nodeRepo,
    edgeRepo,
    pathRepo,
    bufferDraftStore,
    bufferMutationRepo,
    rawApiResponseRepo,
  });
  let clock = Date.now() - 100_000;

  /** Adds a node (model by default) and a continuation from `parents`. */
  async function addNode(
    text: string,
    options: {
      parents?: readonly ULID[];
      author?: 'human' | 'model';
      editedFrom?: ULID;
      onPath?: boolean;
    } = {}
  ): Promise<ULID> {
    const id = createULID();
    const author = options.author ?? 'model';
    clock += 1000;
    await nodeRepo.create({
      id,
      createdAt: new Date(clock),
      content: { type: 'text', text },
      authorType: author,
      authorAgentId: author === 'model' ? modelAgentId : ownerAgentId,
      loomTreeId: treeId,
      contentHash: 'seed' as ContentHash,
      localId: createLocalId(id, await nodeRepo.getAllLocalIds(treeId)),
      editedFrom: options.editedFrom,
    });
    const parents = options.parents ?? [];
    if (parents.length) {
      await edgeRepo.create({
        loomTreeId: treeId,
        sources: parents.map((nodeId) => ({ nodeId, role: 'primary' })),
        targetNodeId: id,
        edgeType: 'continuation',
      });
    }
    if (options.onPath) await pathRepo.appendNode(pathId, id);
    return id;
  }

  const sequence = async () =>
    (await pathRepo.getNodeSequence(pathId)).map((row) => row.nodeId);
  const counts = () =>
    Promise.all(
      ['nodes', 'edges', 'edge_sources', 'path_nodes', 'path_selections'].map(
        (table) => db.get(table).query().fetchCount()
      )
    );
  return {
    db,
    treeId,
    pathId,
    root,
    ownerAgentId,
    nodeRepo,
    edgeRepo,
    treeRepo,
    pathRepo,
    bufferDraftStore,
    bufferMutationRepo,
    rawApiResponseRepo,
    commit: new CommitBufferChangesUseCase(commands),
    switchPath: new SwitchBufferPathUseCase(commands),
    open,
    addNode,
    sequence,
    counts,
  };
}
