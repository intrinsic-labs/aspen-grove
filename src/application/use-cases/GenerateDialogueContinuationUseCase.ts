import type {
  IAgentRepository,
  IEdgeRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import { assembleDialogueContext } from '@application/services/assemble-dialogue-context';
import { createVerifiedModelContinuationNode } from '@application/services/create-verified-model-continuation-node';
import {
  collectCompletion,
  type CompletionResponse,
  type ILlmProvider,
} from '@application/services/llm';
import { resolveContinuationPathToNode } from '@application/services/resolve-continuation-path';
import { type ULID } from '@domain/value-objects';
import type { Node } from '@domain/entities';

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
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById'>;
  readonly nodeRepository: Pick<
    INodeRepository,
    'findById' | 'create' | 'getAllLocalIds' | 'hardDelete'
  >;
  readonly edgeRepository: Pick<
    IEdgeRepository,
    'create' | 'delete' | 'findContinuationsByTargetNodeId'
  >;
  readonly pathRepository: Pick<IPathRepository, 'findById' | 'getNodeSequence' | 'replaceSuffix'>;
  readonly pathStateRepository: Pick<IPathStateRepository, 'setActiveNode'>;
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'create' | 'findByNodeId' | 'deleteByNodeId'
  >;
  readonly llmProvider: ILlmProvider;
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
  private readonly llmProvider: ILlmProvider;

  constructor(dependencies: GenerateDialogueContinuationDependencies) {
    this.agentRepository = dependencies.agentRepository;
    this.loomTreeRepository = dependencies.loomTreeRepository;
    this.nodeRepository = dependencies.nodeRepository;
    this.edgeRepository = dependencies.edgeRepository;
    this.pathRepository = dependencies.pathRepository;
    this.pathStateRepository = dependencies.pathStateRepository;
    this.rawApiResponseRepository = dependencies.rawApiResponseRepository;
    this.llmProvider = dependencies.llmProvider;
  }

  async execute(
    input: GenerateDialogueContinuationInput
  ): Promise<GenerateDialogueContinuationResult> {
    const activateGeneratedNode = input.activateGeneratedNode ?? true;

    const [path, sourceNode] = await Promise.all([
      this.pathRepository.findById(input.session.pathId),
      this.nodeRepository.findById(input.sourceNodeId, true),
    ]);

    if (!path) {
      throw new Error(`Path not found: ${input.session.pathId}`);
    }
    if (!sourceNode) {
      throw new Error(`Source node not found: ${input.sourceNodeId}`);
    }
    if (path.loomTreeId !== sourceNode.loomTreeId) {
      throw new Error('Source node does not belong to the selected path tree.');
    }
    if (path.loomTreeId !== input.session.treeId) {
      throw new Error('Session treeId does not match the selected path.');
    }

    const sourcePathNodeIds = await resolveContinuationPathToNode(sourceNode.id, {
      nodeRepository: this.nodeRepository,
      edgeRepository: this.edgeRepository,
    });

    const sourcePathNodes = await Promise.all(
      sourcePathNodeIds.map((nodeId) => this.nodeRepository.findById(nodeId, true))
    );
    const contextNodes = sourcePathNodes.filter((node): node is Node => Boolean(node));

    const modelAgent = await this.agentRepository.findById(input.session.modelAgentId);
    const tree = await this.loomTreeRepository.findById(input.session.treeId);
    const assembled = assembleDialogueContext({
      nodes: contextNodes,
      agentSystemPrompt: modelAgent?.configuration.systemPrompt,
      treeSystemContext: tree?.systemContext,
    });

    const initialized = await this.llmProvider.initialize(
      { apiKey: input.providerApiKey },
      {
        appName: input.providerAppName,
      }
    );
    if (!initialized) {
      throw new Error('Failed to initialize LLM provider.');
    }

    const completion = await collectCompletion({
      llmProvider: this.llmProvider,
      stream: input.stream ?? false,
      request: {
        model: input.session.modelIdentifier,
        messages: assembled.messages,
        systemPrompt: assembled.systemContext,
        temperature: modelAgent?.configuration.temperature,
        maxTokens: modelAgent?.configuration.maxTokens,
        stopSequences: modelAgent?.configuration.stopSequences,
      },
      onTextDelta: input.onAssistantTextDelta,
    });

    const continuationResult = await createVerifiedModelContinuationNode({
      loomTreeId: input.session.treeId,
      parentNode: sourceNode,
      modelAgentId: input.session.modelAgentId,
      requestedModelIdentifier: input.session.modelIdentifier,
      provider: this.llmProvider.provider,
      completion,
      nodeRepository: this.nodeRepository,
      edgeRepository: this.edgeRepository,
      rawApiResponseRepository: this.rawApiResponseRepository,
    });

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
      contextMessageCount: assembled.messages.length,
      systemContextLength: assembled.systemContext?.length ?? 0,
      completion: {
        finishReason: completion.finishReason,
        interruptionReason: completion.interruptionReason,
        usage: completion.usage,
        modelIdentifier:
          completion.rawResponse.modelIdentifier ?? input.session.modelIdentifier,
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
