import type { Database } from '@nozbe/watermelondb';
import { CreateDialogueLoomTreeUseCase } from '@application/use-cases';
import { initializeAppDefaults } from '@infrastructure/bootstrap/initialize-app-defaults';
import {
  WatermelonAgentRepository,
  WatermelonGroveRepository,
  WatermelonLoomTreeRepository,
  WatermelonNodeRepository,
  WatermelonPathRepository,
  WatermelonPathStateRepository,
} from '@infrastructure/persistence/watermelon/repositories';

type StartupLogger = (message: string, details?: Record<string, unknown>) => void;

export type RunStartupOrchestratorOptions = {
  readonly ensureDialogueSmokeTreeIfEmpty?: boolean;
  readonly logger?: StartupLogger;
};

export type RunStartupOrchestratorResult = {
  readonly userPreferencesId: string;
  readonly ownerAgentId: string;
  readonly groveId: string;
  readonly createdSmokeTreeId?: string;
  readonly existingTreeCount?: number;
};

const defaultLogger: StartupLogger = (message, details) => {
  if (details) {
    console.info(`[startup] ${message}`, details);
    return;
  }
  console.info(`[startup] ${message}`);
};

/**
 * App startup orchestration:
 * 1) Ensure app defaults (preferences, owner agent, grove)
 * 2) Optionally create one dialogue smoke tree when grove is empty (dev helper)
 */
export const runStartupOrchestrator = async (
  database: Database,
  options: RunStartupOrchestratorOptions = {}
): Promise<RunStartupOrchestratorResult> => {
  const log = options.logger ?? defaultLogger;

  log('initializing defaults');
  const defaults = await initializeAppDefaults(database);
  log('defaults ready', {
    userPreferencesId: defaults.userPreferences.id,
    ownerAgentId: defaults.ownerAgent.id,
    groveId: defaults.grove.id,
  });

  if (!options.ensureDialogueSmokeTreeIfEmpty) {
    return {
      userPreferencesId: defaults.userPreferences.id,
      ownerAgentId: defaults.ownerAgent.id,
      groveId: defaults.grove.id,
    };
  }

  const loomTreeRepository = new WatermelonLoomTreeRepository(database);
  const existingTrees = await loomTreeRepository.findByMode(
    defaults.grove.id,
    'dialogue',
    true
  );

  log('checked existing dialogue trees', {
    existingTreeCount: existingTrees.length,
  });

  if (existingTrees.length > 0) {
    return {
      userPreferencesId: defaults.userPreferences.id,
      ownerAgentId: defaults.ownerAgent.id,
      groveId: defaults.grove.id,
      existingTreeCount: existingTrees.length,
    };
  }

  log('creating smoke dialogue tree');
  const createDialogueLoomTreeUseCase = new CreateDialogueLoomTreeUseCase({
    groveRepository: new WatermelonGroveRepository(database),
    agentRepository: new WatermelonAgentRepository(database),
    nodeRepository: new WatermelonNodeRepository(database),
    loomTreeRepository: new WatermelonLoomTreeRepository(database),
    pathRepository: new WatermelonPathRepository(database),
    pathStateRepository: new WatermelonPathStateRepository(database),
  });

  const created = await createDialogueLoomTreeUseCase.execute({
    groveId: defaults.grove.id,
    ownerAgentId: defaults.ownerAgent.id,
    title: 'First Loom Tree',
    initialContent: {
      type: 'text',
      text: 'Hello Aspen Grove.',
    },
    pathName: 'Main',
  });

  log('created smoke dialogue tree', {
    treeId: created.tree.id,
    rootNodeId: created.rootNode.id,
    pathId: created.path.id,
    activeNodeId: created.pathState.activeNodeId,
  });

  return {
    userPreferencesId: defaults.userPreferences.id,
    ownerAgentId: defaults.ownerAgent.id,
    groveId: defaults.grove.id,
    createdSmokeTreeId: created.tree.id,
    existingTreeCount: 0,
  };
};
