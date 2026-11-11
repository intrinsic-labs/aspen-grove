import type {
  IAgentRepository,
  IEdgeRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import { createVerifiedModelContinuationNode } from '@application/services/create-verified-model-continuation-node';
import {
  collectCompletion,
  type CompletionResponse,
  type IProviderRegistry,
} from '@application/services/llm';
import { prepareDialogueContinuation } from '@application/services/dialogue-continuation';
import { type ULID } from '@domain/value-objects';

export type GenerateDialogueContinuationSession = {
  readonly ownerAgentId: ULID;
  readonly modelAgentId: ULID;
  readonly modelIdentifier: string;
  readonly treeId: ULID;
  readonly pathId: ULID;
};

export type GenerateDialogueContinuationInput = {
  readonly session: GenerateDialogueContinuationSession;
  readonly sourceNodeId: ULID;
  readonly providerApiKey: string;
  readonly providerAppName?: string;
  readonly stream?: boolean;
  readonly activateGeneratedNode?: boolean;
  /**
   * Stops the generation (regenerate's stop button). Streamed text is saved
   * and marked `[stream interrupted: cancelled]`, as for a send; a stop
   * before any text saves nothing, leaves the path as it was and rejects
   * with a `cancelled` `LlmProviderError`.
   */
  readonly signal?: AbortSignal;
  readonly onAssistantTextDelta?: (input: {
    readonly delta: string;
    readonly content: string;
  }) => void | Promise<void>;
};

export type GenerateDialogueContinuationResult = {
  readonly assistantNodeId: ULID;
  readonly sourceNodeId: ULID;
  readonly contextMessageCount: number;
  readonly systemContextLength: number;
  readonly completion: {
    readonly finishReason: CompletionResponse['finishReason'];
    readonly interruptionReason?: CompletionResponse['interruptionReason'];
    readonly usage: CompletionResponse['usage'];
    readonly modelIdentifier: string;
    readonly latencyMs: number;
  };
  readonly provenance: {
    readonly rawApiResponseId?: ULID;
    readonly parentNodeCount?: number;
  };
  readonly activatedPath: boolean;
};

export type GenerateDialogueContinuationDependencies = {
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
  readonly loomTreeRepository: Pick<
    ILoomTreeRepository,
    'findById' | 'touchLastMessage'
  >;
  readonly nodeRepository: Pick<
    INodeRepository,
    'findById' | 'create' | 'getAllLocalIds' | 'hardDelete'
  >;
  readonly edgeRepository: Pick<
    IEdgeRepository,
    'create' | 'delete' | 'findContinuationsByTargetNodeId'
  >;
  readonly pathRepository: Pick<
    IPathRepository,
    'findById' | 'getNodeSequence' | 'replaceSuffix'
  >;
  readonly pathStateRepository: Pick<IPathStateRepository, 'setActiveNode'>;
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'create' | 'findByNodeId' | 'deleteByNodeId'
  >;
  readonly providerRegistry: IProviderRegistry;
};

/**
 * Generates a model continuation from any selected dialogue node.
 *
 * This is the backend primitive for branch generation:
 * - Context is assembled from root -> selected source node
 * - Resulting model node becomes a continuation child of `sourceNodeId`
 * - Optionally activates path to the generated node
 */
export class GenerateDialogueContinuationUseCase {
  private readonly agentRepository: GenerateDialogueContinuationDependencies['agentRepository'];
  private readonly loomTreeRepository: GenerateDialogueContinuationDependencies['loomTreeRepository'];
  private readonly nodeRepository: GenerateDialogueContinuationDependencies['nodeRepository'];
  private readonly edgeRepository: GenerateDialogueContinuationDependencies['edgeRepository'];
  private readonly pathRepository: GenerateDialogueContinuationDependencies['pathRepository'];
  private readonly pathStateRepository: GenerateDialogueContinuationDependencies['pathStateRepository'];
  private readonly rawApiResponseRepository: GenerateDialogueContinuationDependencies['rawApiResponseRepository'];
  private readonly providerRegistry: IProviderRegistry;

  constructor(dependencies: GenerateDialogueContinuationDependencies) {
    this.agentRepository = dependencies.agentRepository;
    this.loomTreeRepository = dependencies.loomTreeRepository;
    this.nodeRepository = dependencies.nodeRepository;
    this.edgeRepository = dependencies.edgeRepository;
    this.pathRepository = dependencies.pathRepository;
    this.pathStateRepository = dependencies.pathStateRepository;
    this.rawApiResponseRepository = dependencies.rawApiResponseRepository;
    this.providerRegistry = dependencies.providerRegistry;
  }

  async execute(
    input: GenerateDialogueContinuationInput
  ): Promise<GenerateDialogueContinuationResult> {
    const activateGeneratedNode = input.activateGeneratedNode ?? true;

    const {
      path,
      sourceNode,
      sourcePathNodeIds,
      llmProvider,
      request,
      contextMessageCount,
      systemContextLength,
    } = await prepareDialogueContinuation(
      {
        modelAgentId: input.session.modelAgentId,
        modelIdentifier: input.session.modelIdentifier,
        treeId: input.session.treeId,
        pathId: input.session.pathId,
        sourceNodeId: input.sourceNodeId,
        providerApiKey: input.providerApiKey,
        providerAppName: input.providerAppName,
      },
      {
        agentRepository: this.agentRepository,
        loomTreeRepository: this.loomTreeRepository,
        nodeRepository: this.nodeRepository,
        edgeRepository: this.edgeRepository,
        pathRepository: this.pathRepository,
        providerRegistry: this.providerRegistry,
      }
    );

    const completion = await collectCompletion({
      llmProvider,
      stream: input.stream ?? false,
      request: { ...request, signal: input.signal },
      onTextDelta: input.onAssistantTextDelta,
    });

    const continuationResult = await createVerifiedModelContinuationNode({
      loomTreeId: input.session.treeId,
      parentNode: sourceNode,
      modelAgentId: input.session.modelAgentId,
      requestedModelIdentifier: input.session.modelIdentifier,
      provider: llmProvider.provider,
      completion,
      nodeRepository: this.nodeRepository,
      edgeRepository: this.edgeRepository,
      rawApiResponseRepository: this.rawApiResponseRepository,
    });

    await this.loomTreeRepository.touchLastMessage(
      input.session.treeId,
      new Date()
    );

    if (activateGeneratedNode) {
      await this.activatePathAtNode(
        path.id,
        input.session.ownerAgentId,
        sourcePathNodeIds,
        continuationResult.assistantNodeId
      );
    }

    return {
      assistantNodeId: continuationResult.assistantNodeId,
      sourceNodeId: sourceNode.id,
      contextMessageCount,
      systemContextLength,
      completion: {
        finishReason: completion.finishReason,
        interruptionReason: completion.interruptionReason,
        usage: completion.usage,
        modelIdentifier:
          completion.rawResponse.modelIdentifier ??
          input.session.modelIdentifier,
        latencyMs: completion.rawResponse.latencyMs,
      },
      provenance: {
        rawApiResponseId: continuationResult.rawApiResponseId,
        parentNodeCount: continuationResult.parentNodeCount,
      },
      activatedPath: activateGeneratedNode,
    };
  }

  private async activatePathAtNode(
    pathId: ULID,
    ownerAgentId: ULID,
    sourcePathNodeIds: readonly ULID[],
    assistantNodeId: ULID
  ): Promise<void> {
    const currentSequence = await this.pathRepository.getNodeSequence(pathId);
    const currentNodeIds = currentSequence.map((node) => node.nodeId);
    const nextNodeIds = [...sourcePathNodeIds, assistantNodeId];

    let replacedFromPosition = 0;
    const minimum = Math.min(currentNodeIds.length, nextNodeIds.length);
    while (
      replacedFromPosition < minimum &&
      currentNodeIds[replacedFromPosition] === nextNodeIds[replacedFromPosition]
    ) {
      replacedFromPosition += 1;
    }

    await this.pathRepository.replaceSuffix(
      pathId,
      replacedFromPosition,
      nextNodeIds.slice(replacedFromPosition)
    );

    await this.pathStateRepository.setActiveNode(
      pathId,
      ownerAgentId,
      assistantNodeId,
      'dialogue'
    );
  }
}
