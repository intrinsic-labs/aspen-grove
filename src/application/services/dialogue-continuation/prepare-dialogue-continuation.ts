import type {
  IAgentRepository,
  IEdgeRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
} from '@application/repositories';
import {
  assembleDialogueContext,
  resolveAgentMaxContextTokens,
} from '@application/services/context';
import type {
  CompletionRequest,
  ILlmProvider,
  IProviderRegistry,
} from '@application/services/llm';
import { resolveContinuationPathToNode } from '@application/services/resolve-continuation-path';
import type { Node, Path } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type DialogueContinuationTarget = {
  readonly modelAgentId: ULID;
  readonly modelIdentifier: string;
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly sourceNodeId: ULID;
  readonly providerApiKey: string;
  readonly providerAppName?: string;
};

export type PrepareDialogueContinuationDependencies = {
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById'>;
  readonly nodeRepository: Pick<INodeRepository, 'findById'>;
  readonly edgeRepository: Pick<
    IEdgeRepository,
    'findContinuationsByTargetNodeId'
  >;
  readonly pathRepository: Pick<IPathRepository, 'findById'>;
  readonly providerRegistry: IProviderRegistry;
};

export type PreparedDialogueContinuation = {
  readonly path: Path;
  readonly sourceNode: Node;
  /** Root -> source, the context the continuation is generated from. */
  readonly sourcePathNodeIds: readonly ULID[];
  readonly llmProvider: ILlmProvider;
  readonly request: CompletionRequest;
  readonly contextMessageCount: number;
  readonly systemContextLength: number;
};

/**
 * Everything a dialogue continuation needs before any request is sent:
 * validates the path and source node, assembles context from root to the
 * source, and initializes the provider bound to the model agent.
 */
export const prepareDialogueContinuation = async (
  target: DialogueContinuationTarget,
  deps: PrepareDialogueContinuationDependencies
): Promise<PreparedDialogueContinuation> => {
  const [path, sourceNode] = await Promise.all([
    deps.pathRepository.findById(target.pathId),
    deps.nodeRepository.findById(target.sourceNodeId, true),
  ]);

  if (!path) {
    throw new Error(`Path not found: ${target.pathId}`);
  }
  if (!sourceNode) {
    throw new Error(`Source node not found: ${target.sourceNodeId}`);
  }
  if (path.loomTreeId !== sourceNode.loomTreeId) {
    throw new Error('Source node does not belong to the selected path tree.');
  }
  if (path.loomTreeId !== target.treeId) {
    throw new Error('Session treeId does not match the selected path.');
  }

  const sourcePathNodeIds = await resolveContinuationPathToNode(sourceNode.id, {
    nodeRepository: deps.nodeRepository,
    edgeRepository: deps.edgeRepository,
  });
  const sourcePathNodes = await Promise.all(
    sourcePathNodeIds.map((nodeId) => deps.nodeRepository.findById(nodeId, true))
  );
  const contextNodes = sourcePathNodes.filter((node): node is Node =>
    Boolean(node)
  );

  const modelAgent = await deps.agentRepository.findById(target.modelAgentId);
  if (!modelAgent) {
    throw new Error(`Model agent not found: ${target.modelAgentId}`);
  }
  const tree = await deps.loomTreeRepository.findById(target.treeId);
  const assembled = assembleDialogueContext({
    nodes: contextNodes,
    agentSystemPrompt: modelAgent.configuration.systemPrompt,
    treeSystemContext: tree?.systemContext,
    truncation: {
      maxContextTokens: resolveAgentMaxContextTokens(modelAgent),
    },
  });

  // Provider is determined by the agent's modelRef, never a global setting.
  const llmProvider = deps.providerRegistry.getProviderForAgent(modelAgent);
  const initialized = await llmProvider.initialize(
    { apiKey: target.providerApiKey },
    { appName: target.providerAppName }
  );
  if (!initialized) {
    throw new Error('Failed to initialize LLM provider.');
  }

  return {
    path,
    sourceNode,
    sourcePathNodeIds,
    llmProvider,
    request: {
      model: target.modelIdentifier,
      messages: assembled.messages,
      systemPrompt: assembled.systemContext,
      temperature: modelAgent.configuration.temperature,
      maxTokens: modelAgent.configuration.maxTokens,
      stopSequences: modelAgent.configuration.stopSequences,
    },
    contextMessageCount: assembled.messages.length,
    systemContextLength: assembled.systemContext?.length ?? 0,
  };
};
