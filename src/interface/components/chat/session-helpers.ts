import { selectableProviderFromModelRef } from '@application/services/llm';
import {
  resolveTreeModelAgent,
  type UsableModelAgent,
} from '@application/services/resolve-tree-model-agent';
import type {
  IAgentRepository,
  IEdgeRepository,
  IGroveRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
  IUserPreferencesRepository,
} from '@application/repositories';
import type { Node } from '@domain/entities';
import { parseULID, type ULID } from '@domain/value-objects';
import type { ChatRow, ChatSession, ChatSessionModel } from './types';

type ChatSessionRepositories = {
  readonly treeRepo: Pick<ILoomTreeRepository, 'findById' | 'update'>;
  readonly groveRepo: Pick<IGroveRepository, 'findById'>;
  readonly agentRepo: Pick<IAgentRepository, 'findById' | 'findSharedModels'>;
  readonly pathRepo: Pick<
    IPathRepository,
    'findByTreeAndOwner' | 'create' | 'getNodeSequence' | 'appendNode'
  >;
  readonly pathStateRepo: Pick<IPathStateRepository, 'setActiveNode'>;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
  /** The user's default model agent, adopted by a tree without one. */
  readonly userPreferencesRepo: Pick<
    IUserPreferencesRepository,
    'get' | 'update'
  >;
};

export type InitializedChatSession = {
  readonly treeId: ULID;
  readonly treeTitle: string;
  readonly session: ChatSession;
};

const toSessionModel = (agent: UsableModelAgent): ChatSessionModel => ({
  modelAgentId: agent.id,
  modelIdentifier: modelRefIdentifier(agent.modelRef),
  provider: selectableProviderFromModelRef(agent.modelRef),
});

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

  // The model agent this tree generates from; its modelRef determines the
  // provider (there is no global "active provider"). A tree without a usable
  // one adopts the user's default, or opens without a model.
  const modelAgent = await resolveTreeModelAgent(tree, {
    agentRepository: repositories.agentRepo,
    userPreferencesRepository: repositories.userPreferencesRepo,
    loomTreeRepository: repositories.treeRepo,
  });

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
      model:
        modelAgent.status === 'missing'
          ? null
          : toSessionModel(modelAgent.agent),
      treeId: tree.id,
      pathId: path.id,
      activeNodeId,
    },
  };
};

/**
 * Strip the `{provider}:` prefix from a modelRef to get the raw identifier
 * the provider's API expects (e.g., `anthropic/claude-sonnet-4` for
 * OpenRouter, or the bare model id for LM Studio).
 */
const modelRefIdentifier = (modelRef: string | undefined): string => {
  if (!modelRef) {
    throw new Error('Cannot extract identifier from empty modelRef.');
  }
  const colonIndex = modelRef.indexOf(':');
  return colonIndex === -1 ? modelRef : modelRef.slice(colonIndex + 1);
};

export const loadDialogueRowsForPath = async (
  pathId: ULID,
  repositories: Pick<ChatSessionRepositories, 'pathRepo' | 'nodeRepo'> & {
    readonly edgeRepo: Pick<IEdgeRepository, 'findBySourceNodeId'>;
  }
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

  const continuationCounts = await Promise.all(
    nodes.map(async (node) => {
      const outgoing = await repositories.edgeRepo.findBySourceNodeId(node.id);
      return outgoing.filter((edge) => edge.edgeType === 'continuation').length;
    })
  );

  const rows: ChatRow[] = [];
  for (const [index, node] of nodes.entries()) {
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
      pruned: node.metadata.pruned,
      continuationCount: continuationCounts[index] ?? 0,
    });
  }

  return {
    rows,
    activeNodeId: nodes[nodes.length - 1]?.id,
  };
};
