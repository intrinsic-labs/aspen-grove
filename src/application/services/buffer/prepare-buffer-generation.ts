import type {
  IAgentRepository,
  IEdgeRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
} from '@application/repositories';
import type { BufferGenerationIntent } from '@application/repositories/core/IBufferMutationRepository';
import {
  DEFAULT_MAX_CONTEXT_TOKENS,
  resolveAgentMaxContextTokens,
} from '@application/services/context';
import {
  isEligibleBaseModel,
  requestMaxTokens,
  selectableProviderFromModelRef,
  type BaseModelCatalogEntry,
  type ILlmProvider,
  type IModelOutputLimits,
  type IProviderRegistry,
  type TextCompletionRequest,
} from '@application/services/llm';
import type { BufferDraft } from './buffer-draft';
import { assembleBufferContext } from './assemble-buffer-context';
import { indexBufferGraph } from './buffer-graph';
import { bufferContinuationParents } from './buffer-provenance-parents';
import type { Agent, Node, RoutableProvider } from '@domain/entities';
import { createULID, type ULID } from '@domain/value-objects';
import type { CommitBufferChangesUseCase } from '@application/use-cases/CommitBufferChangesUseCase';

export type ProviderConnection = {
  readonly apiKey: string;
  readonly endpoint?: string;
  readonly appName?: string;
};

export type PrepareBufferGenerationDependencies = {
  readonly commitBufferChangesUseCase: Pick<
    CommitBufferChangesUseCase,
    'execute'
  >;
  readonly treeRepository: Pick<ILoomTreeRepository, 'findById'>;
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
  readonly nodeRepository: Pick<INodeRepository, 'findByLoomTreeId'>;
  readonly edgeRepository: Pick<IEdgeRepository, 'findByLoomTreeId'>;
  readonly pathRepository: Pick<
    IPathRepository,
    'findById' | 'getNodeSequence'
  >;
  readonly providerRegistry: IProviderRegistry;
  readonly modelOutputLimits: IModelOutputLimits;
  readonly findBaseModel: (
    provider: RoutableProvider,
    modelIdentifier: string
  ) => Promise<BaseModelCatalogEntry | null>;
  readonly resolveProviderConnection: (
    provider: RoutableProvider
  ) => Promise<ProviderConnection>;
};

export type PreparedBufferGeneration = {
  readonly intent: BufferGenerationIntent;
  readonly agent: Agent;
  readonly sourceNode: Node;
  readonly equivalentParents: readonly Node[];
  readonly llmProvider: ILlmProvider;
  readonly request: TextCompletionRequest;
};

const modelIdentifier = (agent: Agent): string => {
  if (!agent.modelRef) throw new Error('Buffer model agent has no modelRef.');
  return agent.modelRef.slice(agent.modelRef.indexOf(':') + 1);
};

/** Commits the draft, freezes one path snapshot, and builds its literal prompt. */
export const prepareBufferGeneration = async (
  input: {
    readonly treeId: ULID;
    readonly pathId: ULID;
    readonly ownerAgentId: ULID;
    readonly draft: BufferDraft;
    readonly count: number;
    readonly maxTokens: number;
  },
  deps: PrepareBufferGenerationDependencies
): Promise<PreparedBufferGeneration> => {
  if (input.draft.ownerAgentId !== input.ownerAgentId) {
    throw new Error('Buffer generation owner does not match the draft.');
  }
  await deps.commitBufferChangesUseCase.execute({
    treeId: input.treeId,
    pathId: input.pathId,
    draft: input.draft,
  });

  const [tree, path, rows, allNodes, allEdges] = await Promise.all([
    deps.treeRepository.findById(input.treeId),
    deps.pathRepository.findById(input.pathId),
    deps.pathRepository.getNodeSequence(input.pathId),
    deps.nodeRepository.findByLoomTreeId(input.treeId, true),
    deps.edgeRepository.findByLoomTreeId(input.treeId),
  ]);
  if (!tree || tree.mode !== 'buffer') throw new Error('Not a buffer tree.');
  if (
    !path ||
    path.loomTreeId !== tree.id ||
    path.ownerAgentId !== input.ownerAgentId
  ) {
    throw new Error('Missing buffer path.');
  }
  if (!tree.defaultModelAgentId) {
    throw new Error('Choose a base model before generating.');
  }
  const agent = await deps.agentRepository.findById(tree.defaultModelAgentId);
  if (!agent || agent.type !== 'model' || !agent.modelRef) {
    throw new Error('Selected buffer model agent is unavailable.');
  }
  const provider = selectableProviderFromModelRef(agent.modelRef);
  const identifier = modelIdentifier(agent);
  const llmProvider = deps.providerRegistry.getProviderForAgent(agent);
  const connection = await deps.resolveProviderConnection(provider);
  const initialized = await llmProvider.initialize(
    { apiKey: connection.apiKey },
    { endpoint: connection.endpoint, appName: connection.appName }
  );
  if (!initialized) throw new Error('Failed to initialize LLM provider.');
  const catalogEntry = await deps.findBaseModel(provider, identifier);
  if (!catalogEntry || !isEligibleBaseModel(provider, catalogEntry)) {
    throw new Error('The selected model is not an eligible base model.');
  }

  const sequence = rows.map((row) => row.nodeId);
  const nodesById = new Map(allNodes.map((node) => [node.id, node]));
  const resolvedNodes = sequence.map((id) => nodesById.get(id));
  if (resolvedNodes.some((node) => !node)) {
    throw new Error('Buffer path contains a missing node.');
  }
  const sourceNode = resolvedNodes.at(-1);
  if (!sourceNode) throw new Error('Buffer path has no generation source.');
  const requestedMaxTokens =
    (await requestMaxTokens(
      input.maxTokens,
      { provider, model: identifier },
      deps.modelOutputLimits
    )) ?? input.maxTokens;
  const prompt = assembleBufferContext({
    resolvedNodes: resolvedNodes as Node[],
    tail: '',
    maxContextTokens:
      resolveAgentMaxContextTokens(agent) ?? DEFAULT_MAX_CONTEXT_TOKENS,
    maxTokens: requestedMaxTokens,
  }).prompt;
  const graph = indexBufferGraph(allNodes, allEdges);
  return {
    intent: {
      drawId: createULID(),
      treeId: tree.id,
      pathId: path.id,
      ownerAgentId: input.ownerAgentId,
      sourceNodeId: sourceNode.id,
      expectedRevision: path.updatedAt.getTime(),
      expectedSequence: sequence,
      count: input.count,
      createdAtMs: Date.now(),
    },
    agent,
    sourceNode,
    equivalentParents: bufferContinuationParents(graph, sourceNode.id),
    llmProvider,
    request: {
      kind: 'text',
      prompt,
      model: identifier,
      temperature: agent.configuration.temperature,
      maxTokens: requestedMaxTokens,
      stopSequences: agent.configuration.stopSequences,
    },
  };
};
