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
import {
  type CompletionResponse,
  type ILlmProvider,
} from '@application/services/llm';
import { verifyModelNodeProvenance } from '@application/services/provenance';
import {
  computeHumanContentHash,
  computeModelContentHash,
} from '@application/services/content-hash-service';
import type { Node } from '@domain/entities';
import {
  createLocalId,
  createULID,
  type ULID,
} from '@domain/value-objects';

export type DialogueTurnSession = {
  readonly ownerAgentId: ULID;
  readonly modelAgentId: ULID;
  readonly modelIdentifier: string;
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly activeNodeId: ULID;
};

export type SendDialogueTurnInput = {
  readonly session: DialogueTurnSession;
  readonly prompt: string;
  readonly providerApiKey: string;
  readonly providerAppName?: string;
  readonly onUserNodeCommitted?: (input: { readonly userNodeId: ULID }) => void | Promise<void>;
};

export type SendDialogueTurnResult = {
  readonly userNodeId: ULID;
  readonly assistantNodeId: ULID;
  readonly contextMessageCount: number;
  readonly systemContextLength: number;
  readonly completion: {
    readonly finishReason: CompletionResponse['finishReason'];
    readonly usage: CompletionResponse['usage'];
    readonly modelIdentifier: string;
    readonly latencyMs: number;
  };
  readonly provenance: {
    readonly rawApiResponseId?: ULID;
    readonly parentNodeCount?: number;
  };
};

export type SendDialogueTurnDependencies = {
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
  readonly pathRepository: Pick<IPathRepository, 'appendNode' | 'getNodeSequence'>;
  readonly pathStateRepository: Pick<IPathStateRepository, 'setActiveNode'>;
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'create' | 'findByNodeId' | 'deleteByNodeId'
  >;
  readonly llmProvider: ILlmProvider;
};

/**
 * Sends one dialogue turn:
 * 1) create human node and advance path
 * 2) generate model completion
 * 3) create model node + raw response evidence
 * 4) verify model-node provenance before finalizing path cursor
 */
export class SendDialogueTurnUseCase {
  private readonly agentRepository: SendDialogueTurnDependencies['agentRepository'];
  private readonly loomTreeRepository: SendDialogueTurnDependencies['loomTreeRepository'];
  private readonly nodeRepository: SendDialogueTurnDependencies['nodeRepository'];
  private readonly edgeRepository: SendDialogueTurnDependencies['edgeRepository'];
  private readonly pathRepository: SendDialogueTurnDependencies['pathRepository'];
  private readonly pathStateRepository: SendDialogueTurnDependencies['pathStateRepository'];
  private readonly rawApiResponseRepository: SendDialogueTurnDependencies['rawApiResponseRepository'];
  private readonly llmProvider: ILlmProvider;

  constructor(dependencies: SendDialogueTurnDependencies) {
    this.agentRepository = dependencies.agentRepository;
    this.loomTreeRepository = dependencies.loomTreeRepository;
    this.nodeRepository = dependencies.nodeRepository;
    this.edgeRepository = dependencies.edgeRepository;
    this.pathRepository = dependencies.pathRepository;
    this.pathStateRepository = dependencies.pathStateRepository;
    this.rawApiResponseRepository = dependencies.rawApiResponseRepository;
    this.llmProvider = dependencies.llmProvider;
  }

  async execute(input: SendDialogueTurnInput): Promise<SendDialogueTurnResult> {
    const prompt = input.prompt.trim();
    if (!prompt) {
      throw new Error('Prompt must not be empty.');
    }

    const previousNode = await this.nodeRepository.findById(
      input.session.activeNodeId,
      true
    );
    if (!previousNode) {
      throw new Error(`Active node not found: ${input.session.activeNodeId}`);
    }

    const userNodeId = createULID();
    const userCreatedAt = new Date();
    const userLocalIds = await this.nodeRepository.getAllLocalIds(input.session.treeId);
    const userLocalId = createLocalId(userNodeId, userLocalIds);
    const userContent = { type: 'text' as const, text: prompt };
    const userContentHash = await computeHumanContentHash(
      userContent,
      [previousNode.contentHash],
      userCreatedAt,
      input.session.ownerAgentId
    );

    const userNode = await this.nodeRepository.create({
      id: userNodeId,
      createdAt: userCreatedAt,
      loomTreeId: input.session.treeId,
      localId: userLocalId,
      content: userContent,
      authorAgentId: input.session.ownerAgentId,
      authorType: 'human',
      contentHash: userContentHash,
    });

    await this.edgeRepository.create({
      loomTreeId: input.session.treeId,
      sources: [{ nodeId: previousNode.id, role: 'primary' }],
      targetNodeId: userNode.id,
      edgeType: 'continuation',
    });

    await this.pathRepository.appendNode(input.session.pathId, userNode.id);
    await this.pathStateRepository.setActiveNode(
      input.session.pathId,
      input.session.ownerAgentId,
      userNode.id,
      'dialogue'
    );

    await input.onUserNodeCommitted?.({ userNodeId: userNode.id });

    const contextNodes = await this.loadPathNodes(input.session.pathId);
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

    const completion = await this.llmProvider.generateCompletion({
      model: input.session.modelIdentifier,
      messages: assembled.messages,
      systemPrompt: assembled.systemContext,
      temperature: modelAgent?.configuration.temperature,
      maxTokens: modelAgent?.configuration.maxTokens,
      stopSequences: modelAgent?.configuration.stopSequences,
    });

    const assistantText = completion.content.trim();
    if (!assistantText) {
      throw new Error('Model provider returned empty completion content.');
    }

    const assistantNodeId = createULID();
    const assistantCreatedAt = new Date();
    const assistantLocalIds = await this.nodeRepository.getAllLocalIds(
      input.session.treeId
    );
    const assistantLocalId = createLocalId(assistantNodeId, assistantLocalIds);
    const assistantContent = { type: 'text' as const, text: assistantText };
    const assistantContentHash = await computeModelContentHash(
      assistantContent,
      [userNode.contentHash],
      assistantCreatedAt,
      input.session.modelAgentId,
      completion.rawResponse.rawBytesHash
    );

    const assistantNode = await this.nodeRepository.create({
      id: assistantNodeId,
      createdAt: assistantCreatedAt,
      loomTreeId: input.session.treeId,
      localId: assistantLocalId,
      content: assistantContent,
      authorAgentId: input.session.modelAgentId,
      authorType: 'model',
      contentHash: assistantContentHash,
    });

    try {
      await this.rawApiResponseRepository.create({
        nodeId: assistantNode.id,
        provider: this.llmProvider.provider,
        requestId: completion.rawResponse.requestId,
        modelIdentifier:
          completion.rawResponse.modelIdentifier ?? input.session.modelIdentifier,
        responseBody: completion.rawResponse.responseBody,
        responseHeaders: completion.rawResponse.responseHeaders,
        requestTimestamp: completion.rawResponse.requestTimestamp,
        responseTimestamp: completion.rawResponse.responseTimestamp,
        latencyMs: completion.rawResponse.latencyMs,
        tokenUsage: completion.usage,
      });
    } catch (rawApiResponseError) {
      await this.nodeRepository.hardDelete(assistantNode.id).catch(() => {
        // Best effort cleanup only.
      });
      throw rawApiResponseError;
    }

    const continuationEdge = await this.edgeRepository.create({
      loomTreeId: input.session.treeId,
      sources: [{ nodeId: userNode.id, role: 'primary' }],
      targetNodeId: assistantNode.id,
      edgeType: 'continuation',
    });

    const provenanceVerification = await verifyModelNodeProvenance({
      nodeId: assistantNode.id,
      nodeRepository: this.nodeRepository,
      edgeRepository: this.edgeRepository,
      rawApiResponseRepository: this.rawApiResponseRepository,
    });

    if (!provenanceVerification.isValid) {
      await this.edgeRepository.delete(continuationEdge.id).catch(() => {
        // Best effort cleanup only.
      });
      await this.rawApiResponseRepository
        .deleteByNodeId(assistantNode.id)
        .catch(() => {
          // Best effort cleanup only.
        });
      await this.nodeRepository.hardDelete(assistantNode.id).catch(() => {
        // Best effort cleanup only.
      });
      throw new Error(
        `Provenance verification failed for model node ${assistantNode.id} (${provenanceVerification.status})`
      );
    }

    await this.pathRepository.appendNode(input.session.pathId, assistantNode.id);
    await this.pathStateRepository.setActiveNode(
      input.session.pathId,
      input.session.ownerAgentId,
      assistantNode.id,
      'dialogue'
    );

    return {
      userNodeId: userNode.id,
      assistantNodeId: assistantNode.id,
      contextMessageCount: assembled.messages.length,
      systemContextLength: assembled.systemContext?.length ?? 0,
      completion: {
        finishReason: completion.finishReason,
        usage: completion.usage,
        modelIdentifier:
          completion.rawResponse.modelIdentifier ?? input.session.modelIdentifier,
        latencyMs: completion.rawResponse.latencyMs,
      },
      provenance: {
        rawApiResponseId: provenanceVerification.rawApiResponseId,
        parentNodeCount: provenanceVerification.parentNodeCount,
      },
    };
  }

  private async loadPathNodes(pathId: ULID): Promise<Node[]> {
    const pathNodes = await this.pathRepository.getNodeSequence(pathId);
    const resolvedNodes = await Promise.all(
      pathNodes.map((pathNode) => this.nodeRepository.findById(pathNode.nodeId, true))
    );
    return resolvedNodes.filter((node): node is Node => Boolean(node));
  }
}

