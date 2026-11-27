import type {
  IEdgeRepository,
  INodeRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import type {
  BufferSavedGenerationSlot,
  IBufferMutationRepository,
} from '@application/repositories/core/IBufferMutationRepository';
import {
  isValidContinuationCount,
  MAX_PARALLEL_CONTINUATIONS,
  MIN_PARALLEL_CONTINUATIONS,
  runContinuationSlots,
  type ContinuationSlotListener,
  type ContinuationSlotOutcome,
  type PersistedContinuation,
} from '@application/services/dialogue-continuation';
import type {
  CompletionResponse,
  RetryOptions,
} from '@application/services/llm';
import {
  prepareBufferGeneration,
  type PrepareBufferGenerationDependencies,
  type PreparedBufferGeneration,
} from '@application/services/buffer/prepare-buffer-generation';
import { prepareModelContinuationEvidence } from '@application/services/prepare-model-continuation-evidence';
import { verifyModelNodeProvenance } from '@application/services/provenance';
import type { BufferDraft } from '@application/services/buffer/buffer-draft';
import type { ActiveBufferDraws } from '@application/services/buffer/active-buffer-draws';
import { createULID, type ULID } from '@domain/value-objects';

export type GenerateBufferContinuationsInput = {
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly ownerAgentId: ULID;
  readonly draft: BufferDraft;
  readonly count: number;
  readonly maxTokens: number;
  readonly signal?: AbortSignal;
  readonly onSlotEvent?: ContinuationSlotListener;
};

export type GenerateBufferContinuationsResult = {
  readonly sourceNodeId: ULID;
  readonly slots: readonly ContinuationSlotOutcome[];
};

export type GenerateBufferContinuationsDependencies =
  PrepareBufferGenerationDependencies & {
    readonly activeBufferDraws: ActiveBufferDraws;
    readonly bufferMutationRepository: IBufferMutationRepository;
    readonly nodeRepository: PrepareBufferGenerationDependencies['nodeRepository'] &
      Pick<INodeRepository, 'getAllLocalIds' | 'findById'>;
    readonly edgeRepository: PrepareBufferGenerationDependencies['edgeRepository'] &
      Pick<IEdgeRepository, 'findContinuationsByTargetNodeId'>;
    readonly rawApiResponseRepository: Pick<
      IRawApiResponseRepository,
      'findByNodeId'
    >;
    readonly retry?: RetryOptions;
  };

const assertInput = (count: number, maxTokens: number): void => {
  if (!isValidContinuationCount(count)) {
    throw new Error(
      `Parallel continuation count must be an integer from ${MIN_PARALLEL_CONTINUATIONS} to ${MAX_PARALLEL_CONTINUATIONS}; got ${count}.`
    );
  }
  if (!Number.isSafeInteger(maxTokens) || maxTokens <= 0) {
    throw new Error('Buffer maxTokens must be a positive integer.');
  }
};

export class GenerateBufferContinuationsUseCase {
  private readonly activeByTree = new Map<
    ULID,
    Promise<GenerateBufferContinuationsResult>
  >();

  constructor(private readonly deps: GenerateBufferContinuationsDependencies) {}

  execute(
    input: GenerateBufferContinuationsInput
  ): Promise<GenerateBufferContinuationsResult> {
    const active = this.activeByTree.get(input.treeId);
    if (active) return active;
    const operation = this.run(input);
    this.activeByTree.set(input.treeId, operation);
    return operation.finally(() => {
      if (this.activeByTree.get(input.treeId) === operation) {
        this.activeByTree.delete(input.treeId);
      }
    });
  }

  private async run(
    input: GenerateBufferContinuationsInput
  ): Promise<GenerateBufferContinuationsResult> {
    assertInput(input.count, input.maxTokens);
    if (input.signal?.aborted) throw new Error('Buffer generation cancelled.');
    const prepared = await prepareBufferGeneration(input, this.deps);
    this.deps.activeBufferDraws.begin(prepared.intent.drawId);
    try {
      const begun = await this.deps.bufferMutationRepository.beginGeneration(
        prepared.intent
      );
      if (begun !== 'started') {
        throw new Error(
          'A buffer generation is already active or became stale.'
        );
      }

      const slots = await runContinuationSlots({
        count: input.count,
        llmProvider: prepared.llmProvider,
        request: prepared.request,
        signal: input.signal,
        retry: this.deps.retry,
        onSlotEvent: input.onSlotEvent,
        persist: (slot, completion) =>
          this.persistSlot(prepared, slot, completion),
      });
      const saved = slots.flatMap<BufferSavedGenerationSlot>((outcome) => {
        if (
          outcome.type !== 'done' &&
          outcome.type !== 'interrupted' &&
          !(outcome.type === 'cancelled' && outcome.saved)
        ) {
          return [];
        }
        const value = outcome.type === 'cancelled' ? outcome.saved : outcome;
        return value
          ? [
              {
                slot: outcome.slot,
                nodeId: value.nodeId,
                edgeId: value.edgeId!,
              },
            ]
          : [];
      });
      await this.deps.bufferMutationRepository.completeGeneration(
        prepared.intent,
        saved
      );
      return { sourceNodeId: prepared.sourceNode.id, slots };
    } finally {
      this.deps.activeBufferDraws.end(prepared.intent.drawId);
    }
  }

  private async persistSlot(
    prepared: PreparedBufferGeneration,
    slot: number,
    completion: CompletionResponse
  ): Promise<PersistedContinuation> {
    const evidence = await prepareModelContinuationEvidence({
      loomTreeId: prepared.intent.treeId,
      parentHashes: [prepared.sourceNode.contentHash],
      modelAgentId: prepared.agent.id,
      requestedModelIdentifier: prepared.request.model,
      provider: prepared.llmProvider.provider,
      completion,
      textPolicy: 'literal',
      buffer: {
        creationParentId: prepared.sourceNode.id,
        drawId: prepared.intent.drawId,
        slot,
        ...(completion.interruptionReason
          ? { interruption: completion.interruptionReason }
          : {}),
      },
      nodeRepository: this.deps.nodeRepository,
    });
    const edgeId = createULID();
    const result =
      await this.deps.bufferMutationRepository.persistGenerationSlot({
        intent: prepared.intent,
        node: evidence.node,
        edge: {
          id: edgeId,
          loomTreeId: prepared.intent.treeId,
          targetNodeId: evidence.node.id,
          edgeType: 'continuation',
          createdAt: evidence.node.createdAt,
          sources: prepared.equivalentParents.map((parent) => ({
            nodeId: parent.id,
            role: 'primary' as const,
          })),
        },
        rawApiResponse: evidence.rawApiResponse,
      });
    if (result.status === 'stale' || !result.rawApiResponseId) {
      throw new Error(
        'Buffer generation slot became stale before persistence.'
      );
    }
    const verified = await verifyModelNodeProvenance({
      nodeId: evidence.node.id,
      nodeRepository: this.deps.nodeRepository,
      edgeRepository: this.deps.edgeRepository,
      rawApiResponseRepository: this.deps.rawApiResponseRepository,
    });
    if (!verified.isValid) {
      await this.deps.bufferMutationRepository.rollbackGenerationSlot({
        drawId: prepared.intent.drawId,
        slot,
        nodeId: evidence.node.id,
      });
      throw new Error(
        `Provenance verification failed for buffer node ${evidence.node.id} (${verified.status}).`
      );
    }
    return {
      nodeId: evidence.node.id,
      edgeId,
      rawApiResponseId: result.rawApiResponseId,
      finishReason: completion.finishReason,
      usage: completion.usage,
      modelIdentifier:
        completion.rawResponse.modelIdentifier ?? prepared.request.model,
      latencyMs: completion.rawResponse.latencyMs,
    };
  }
}
