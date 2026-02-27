import {
  DEFAULT_OPENROUTER_MODEL_IDENTIFIER,
  ensureOpenRouterAssistantAgent,
  getOpenRouterModelIdentifier,
} from '@application/services/openrouter-assistant-agent';
import type {
  IAgentRepository,
  IGroveRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
} from '@application/repositories';
import type { Node } from '@domain/entities';
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
};

export type InitializedChatSession = {
  readonly treeId: ULID;
  readonly session: ChatSession;
};

export const initializeDialogueChatSession = async (
  treeIdParam: string,
  repositories: ChatSessionRepositories
): Promise<InitializedChatSession> => {
  const routeTreeId = parseULID(treeIdParam);

  const tree = await repositories.treeRepo.findById(routeTreeId);
  if (!tree) {
    throw new Error(`Loom Tree not found: ${routeTreeId}`);
  }

  const grove = await repositories.groveRepo.findById(tree.groveId);
  if (!grove) {
    throw new Error(`Grove not found for Loom Tree: ${tree.groveId}`);
  }

  const ownerAgentId = grove.ownerAgentId as ULID;
  const modelAgent = await ensureOpenRouterAssistantAgent(repositories.agentRepo);
  const modelIdentifier =
    getOpenRouterModelIdentifier(modelAgent) ??
    DEFAULT_OPENROUTER_MODEL_IDENTIFIER;

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
  const activeNodeId = latestNodes[latestNodes.length - 1]?.nodeId ?? tree.rootNodeId;

  await repositories.pathStateRepo.setActiveNode(
    path.id,
    ownerAgentId,
    activeNodeId,
    'dialogue'
  );

  return {
    treeId: tree.id,
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
): Promise<{ readonly rows: readonly ChatRow[]; readonly activeNodeId?: ULID }> => {
  const pathNodes = await repositories.pathRepo.getNodeSequence(pathId);
  const resolved = await Promise.all(
    pathNodes.map((pathNode) => repositories.nodeRepo.findById(pathNode.nodeId, true))
  );
  const nodes = resolved.filter((node): node is Node => Boolean(node));

  const rows: ChatRow[] = [];
  for (const node of nodes) {
    const text =
      node.content.type === 'text' ? node.content.text : `[${node.content.type}]`;
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
