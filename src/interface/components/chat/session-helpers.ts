import {
  DEFAULT_OPENROUTER_MODEL_IDENTIFIER,
  ensureOpenRouterAssistantAgent,
  getOpenRouterModelIdentifier,
} from '@application/services/openrouter-assistant-agent';
import {
  ensureLMStudioAssistantAgent,
  getLMStudioModelIdentifier,
} from '@application/services/lmstudio-assistant-agent';
import type {
  IAgentRepository,
  IGroveRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
  IUserPreferencesRepository,
} from '@application/repositories';
import type { Agent, Node, SelectableProvider } from '@domain/entities';
import { parseULID, type ULID } from '@domain/value-objects';
import type { ChatRow, ChatSession } from './types';

type ChatSessionRepositories = {
  readonly treeRepo: Pick<ILoomTreeRepository, 'findById'>;
  readonly groveRepo: Pick<IGroveRepository, 'findById'>;
  readonly agentRepo: IAgentRepository;
  readonly pathRepo: Pick<
    IPathRepository,
    'findByTreeAndOwner' | 'create' | 'getNodeSequence' | 'appendNode'
  >;
  readonly pathStateRepo: Pick<IPathStateRepository, 'setActiveNode'>;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
  readonly userPreferencesRepo: Pick<IUserPreferencesRepository, 'get'>;
};

export type InitializedChatSession = {
  readonly treeId: ULID;
  readonly treeTitle: string;
  readonly session: ChatSession;
};

type ResolvedModelAgent = {
  readonly agent: Agent;
  readonly modelIdentifier: string;
  readonly provider: SelectableProvider;
};

const resolveModelAgentForProvider = async (
  provider: SelectableProvider,
  agentRepo: IAgentRepository,
  lmstudioSelectedModel?: string
): Promise<ResolvedModelAgent> => {
  if (provider === 'lmstudio') {
    const agent = await ensureLMStudioAssistantAgent(agentRepo, {
      preferredModelIdentifier: lmstudioSelectedModel,
    });

    if (!agent) {
      throw new Error(
        'LM Studio is selected but no model is configured. Please select a model in Settings.'
      );
    }

    const modelIdentifier = getLMStudioModelIdentifier(agent);
    if (!modelIdentifier) {
      throw new Error(
        'LM Studio agent exists but has no model identifier. Please reconfigure in Settings.'
      );
    }

    return { agent, modelIdentifier, provider: 'lmstudio' };
  }

  // Default to OpenRouter
  const agent = await ensureOpenRouterAssistantAgent(agentRepo);
  const modelIdentifier =
    getOpenRouterModelIdentifier(agent) ?? DEFAULT_OPENROUTER_MODEL_IDENTIFIER;

  return { agent, modelIdentifier, provider: 'openrouter' };
};

export const initializeDialogueChatSession = async (
  treeIdParam: string,
  repositories: ChatSessionRepositories
): Promise<InitializedChatSession> => {
  const routeTreeId = parseULID(treeIdParam);

  const [tree, userPreferences] = await Promise.all([
    repositories.treeRepo.findById(routeTreeId),
    repositories.userPreferencesRepo.get(),
  ]);

  if (!tree) {
    throw new Error(`Loom Tree not found: ${routeTreeId}`);
  }

  const grove = await repositories.groveRepo.findById(tree.groveId);
  if (!grove) {
    throw new Error(`Grove not found for Loom Tree: ${tree.groveId}`);
  }

  const ownerAgentId = grove.ownerAgentId as ULID;
  const activeProvider = userPreferences.selectedProvider;
  const lmstudioSelectedModel = userPreferences.lmstudioSettings?.selectedModel;

  const { agent: modelAgent, modelIdentifier } =
    await resolveModelAgentForProvider(
      activeProvider,
      repositories.agentRepo,
      lmstudioSelectedModel
    );

  const path =
    (await repositories.pathRepo.findByTreeAndOwner(tree.id, ownerAgentId)) ??
    (await repositories.pathRepo.create({
      loomTreeId: tree.id,
      ownerAgentId,
      name: 'Main',
    }));

  const pathNodes = await repositories.pathRepo.getNodeSequence(path.id);
  if (pathNodes.length === 0) {
    await repositories.pathRepo.appendNode(path.id, tree.rootNodeId);
  }

  const latestNodes = await repositories.pathRepo.getNodeSequence(path.id);
  const activeNodeId =
    latestNodes[latestNodes.length - 1]?.nodeId ?? tree.rootNodeId;

  await repositories.pathStateRepo.setActiveNode(
    path.id,
    ownerAgentId,
    activeNodeId,
    'dialogue'
  );

  return {
    treeId: tree.id,
    treeTitle: tree.title,
    session: {
      ownerAgentId,
      modelAgentId: modelAgent.id,
      modelIdentifier,
      treeId: tree.id,
      pathId: path.id,
      activeNodeId,
    },
  };
};

export const loadDialogueRowsForPath = async (
  pathId: ULID,
  repositories: Pick<ChatSessionRepositories, 'pathRepo' | 'nodeRepo'>
): Promise<{
  readonly rows: readonly ChatRow[];
  readonly activeNodeId?: ULID;
}> => {
  const pathNodes = await repositories.pathRepo.getNodeSequence(pathId);
  const resolved = await Promise.all(
    pathNodes.map((pathNode) =>
      repositories.nodeRepo.findById(pathNode.nodeId, true)
    )
  );
  const nodes = resolved.filter((node): node is Node => Boolean(node));

  const rows: ChatRow[] = [];
  for (const node of nodes) {
    const text =
      node.content.type === 'text'
        ? node.content.text
        : `[${node.content.type}]`;
    if (text.trim().length === 0) {
      continue;
    }
    rows.push({
      id: node.id,
      localId: node.localId,
      editedFrom: node.editedFrom,
      authorType: node.authorType,
      text,
      bookmarked: node.metadata.bookmarked,
    });
  }

  return {
    rows,
    activeNodeId: nodes[nodes.length - 1]?.id,
  };
};
