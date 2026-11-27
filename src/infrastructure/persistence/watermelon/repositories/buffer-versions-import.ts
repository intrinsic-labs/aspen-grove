import { readFileSync } from 'fs';
import { join } from 'path';
import type { Grove } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { ImportLoomTreeUseCase } from '@application/use-cases/ImportLoomTreeUseCase';
import { OpenBufferDocumentUseCase } from '@application/use-cases/OpenBufferDocumentUseCase';
import { bufferOpenFixture } from './buffer-open-fixture';
import { WatermelonAgentRepository } from './WatermelonAgentRepository';
import { WatermelonLoomTreeRepository } from './WatermelonLoomTreeRepository';
import { WatermelonPathStateRepository } from './WatermelonPathStateRepository';
import { WatermelonBufferDraftStore } from './WatermelonBufferDraftStore';

const raw = readFileSync(
  join(__dirname, '../../../../../.maestro/fixtures/buffer-versions.openloom'),
  'utf8'
);

/**
 * Test helper: imports `.maestro/fixtures/buffer-versions.openloom` through the
 * real importer on the LokiJS database, with the buffer use cases around it.
 */
export const importBufferVersions = async () => {
  const f = await bufferOpenFixture();
  const treeRepo = new WatermelonLoomTreeRepository(f.db);
  const importer = new ImportLoomTreeUseCase({
    loomTreeRepository: treeRepo,
    nodeRepository: f.nodeRepo,
    edgeRepository: f.edgeRepo,
    agentRepository: new WatermelonAgentRepository(f.db),
    pathRepository: f.pathRepo,
    pathStateRepository: new WatermelonPathStateRepository(f.db),
    userPreferencesRepository: {
      get: async () => ({ autoTitleEnabled: false }),
      update: async () => ({}),
    },
  } as never);
  const groveId = '01KGROVE000000000000000000' as ULID;
  const result = await importer.execute({
    groveId,
    ownerAgentId: f.ownerAgentId,
    raw,
  });
  const treeId = result.trees[0].treeId;

  const open = new OpenBufferDocumentUseCase({
    treeRepo,
    groveRepo: {
      findById: async (id: ULID) =>
        ({ id, ownerAgentId: f.ownerAgentId }) as Grove,
    } as never,
    nodeRepo: f.nodeRepo,
    edgeRepo: f.edgeRepo,
    pathRepo: f.pathRepo,
    bufferDraftStore: new WatermelonBufferDraftStore(f.db),
    bufferMutationRepo: f.bufferMutationRepo,
    rawApiResponseRepo: f.rawApiResponseRepo,
  });
  return { f, open, treeId, treeRepo };
};
