import { selectableProviderFromModelRef } from '@application/services/llm';
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
import type { Agent, Node, SelectableProvider } from '@domain/entities';
import { parseULID, type ULID } from '@domain/value-objects';
import type { ChatRow, ChatSession } from './types';

type ChatSessionRepositories = {
  readonly treeRepo: Pick<ILoomTreeRepository, 'findById'>;
  readonly groveRepo: Pick<IGroveRepository, 'findById'>;
  readonly agentRepo: Pick<IAgentRepository, 'findById'>;
  readonly pathRepo: Pick<
    IPathRepository,
    'findByTreeAndOwner' | 'create' | 'getNodeSequence' | 'appendNode'
  >;
  readonly pathStateRepo: Pick<IPathStateRepository, 'setActiveNode'>;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
  /**
   * Reserved for future use (display preferences, defaults). Kept on the
   * dependency surface so the chat controller doesn't need to re-thread this
   * for upcoming Phase 4 work.
   */
  readonly userPreferencesRepo: Pick<IUserPreferencesRepository, 'get'>;
};

export type InitializedChatSession = {
  readonly treeId: ULID;
  readonly treeTitle: string;
  readonly session: ChatSession;
};

const resolveModelAgent = async (
  treeId: ULID,
  defaultModelAgentId: ULID | undefined,
  agentRepo: Pick<IAgentRepository, 'findById'>
): Promise<{ agent: Agent; provider: SelectableProvider }> => {
  if (!defaultModelAgentId) {
    throw new Error(
      `Loom Tree ${treeId} has no default model agent configured. ` +
        `Configure an agent in Settings before opening this tree.`
    );
  }

  const agent = await agentRepo.findById(defaultModelAgentId);
  if (!agent) {
    throw new Error(
      `Loom Tree ${treeId} references a model agent that no longer exists ` +
        `(${defaultModelAgentId}). Re-select an agent in this tree's settings.`
    );
  }
  if (agent.type !== 'model') {
    throw new Error(
      `Loom Tree ${treeId}'s default agent must be a model agent (got ${agent.type}).`
    );
  }
  if (!agent.modelRef) {
    throw new Error(
      `Model agent ${agent.id} has no modelRef. Re-configure it in Settings.`
    );
  }
  if (agent.archivedAt) {
    throw new Error(
      `Model agent ${agent.id} is archived. Restore it or switch to another agent.`
    );
  }

  const provider = selectableProviderFromModelRef(agent.modelRef);
  return { agent, provider };
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

  // Resolve the model agent this tree generates from. The agent's modelRef
  // determines the provider — there is no global "active provider".
  const { agent: modelAgent, provider } = await resolveModelAgent(
    tree.id,
    tree.defaultModelAgentId,
    repositories.agentRepo
  );
  const modelIdentifier = modelRefIdentifier(modelAgent.modelRef);

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
      provider,
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
      return outgoing.filter((edge) => edge.edgeType === 'continuation')
        .length;
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
