import type {
  IAgentRepository,
  IEdgeRepository,
  ILoomTreeRepository,
  INodeRepository,
  IPathRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import { createVerifiedModelContinuationNode } from '@application/services/create-verified-model-continuation-node';
import {
  createSerialQueue,
  isValidContinuationCount,
  linkAbortSignals,
  MAX_PARALLEL_CONTINUATIONS,
  MIN_PARALLEL_CONTINUATIONS,
  prepareDialogueContinuation,
  runContinuationSlot,
  type ContinuationSlotEvent,
  type ContinuationSlotListener,
  type ContinuationSlotOutcome,
  type DialogueContinuationTarget,
  type PersistedContinuation,
  type PreparedDialogueContinuation,
} from '@application/services/dialogue-continuation';
import type {
  CompletionResponse,
  IProviderRegistry,
  RetryOptions,
} from '@application/services/llm';
import type { ULID } from '@domain/value-objects';

export type GenerateParallelContinuationsInput = DialogueContinuationTarget & {
  /** How many continuations to start at once (1 to 4). */
  readonly count: number;
  /** Stops every slot. */
  readonly signal?: AbortSignal;
  /** Stops one slot: `slotSignals[i]` stops slot `i` only. */
  readonly slotSignals?: readonly (AbortSignal | undefined)[];
  /**
   * Progress per slot: streamed text, then exactly one outcome. Called
   * synchronously; keep it cheap (buffer deltas before rendering).
   */
  readonly onSlotEvent?: ContinuationSlotListener;
};

export type GenerateParallelContinuationsResult = {
  readonly sourceNodeId: ULID;
  /** One outcome per slot, in slot order. */
  readonly slots: readonly ContinuationSlotOutcome[];
  readonly contextMessageCount: number;
};

export type GenerateParallelContinuationsDependencies = {
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
  readonly pathRepository: Pick<IPathRepository, 'findById'>;
  readonly rawApiResponseRepository: Pick<
    IRawApiResponseRepository,
    'create' | 'findByNodeId' | 'deleteByNodeId'
  >;
  readonly providerRegistry: IProviderRegistry;
  /** Retry policy per slot; tests inject a no-op sleep. */
  readonly retry?: RetryOptions;
};

const assertCount = (count: number): void => {
  if (!isValidContinuationCount(count)) {
    throw new Error(
      `Parallel continuation count must be an integer from ${MIN_PARALLEL_CONTINUATIONS} to ${MAX_PARALLEL_CONTINUATIONS}; got ${count}.`
    );
  }
};

/** A listener that throws must not break the slot that called it. */
const toSafeListener =
  (listener?: ContinuationSlotListener): ContinuationSlotListener =>
  (event: ContinuationSlotEvent) => {
    try {
      listener?.(event);
    } catch {
      // Rendering problems belong to the caller, not to generation.
    }
  };

/**
 * Starts N continuations from one dialogue node at once and saves each as a
 * sibling model node under it.
 *
 * Each slot is its own streaming request (not the provider's `n`), so each
 * node has its own raw response and hash chain. Slots stream concurrently,
 * settle independently and can be stopped one at a time; a failing slot never
 * rejects the others. Only setup failures (bad path, missing agent, provider
 * initialization) reject, before any request is sent.
 *
 * Nothing changes the active path: choosing a result is a separate path
 * switch.
 */
export class GenerateParallelContinuationsUseCase {
  private readonly deps: GenerateParallelContinuationsDependencies;

  constructor(dependencies: GenerateParallelContinuationsDependencies) {
    this.deps = dependencies;
  }

  async execute(
    input: GenerateParallelContinuationsInput
  ): Promise<GenerateParallelContinuationsResult> {
    assertCount(input.count);
    const prepared = await prepareDialogueContinuation(input, this.deps);
    const emit = toSafeListener(input.onSlotEvent);
    const persistInTurn = createSerialQueue();

    const slots = await Promise.all(
      Array.from({ length: input.count }, async (_, slot) => {
        const linked = linkAbortSignals([
          input.signal,
          input.slotSignals?.[slot],
        ]);
        try {
          const outcome = await runContinuationSlot({
            slot,
            llmProvider: prepared.llmProvider,
            request: { ...prepared.request, signal: linked.signal },
            retry: this.deps.retry,
            persist: (completion) =>
              persistInTurn(() => this.persist(input, prepared, completion)),
            emit,
          });
          emit(outcome);
          return outcome;
        } finally {
          linked.dispose();
        }
      })
    );

    if (slots.some(hasSavedNode)) {
      await this.deps.loomTreeRepository.touchLastMessage(
        input.treeId,
        new Date()
      );
    }

    return {
      sourceNodeId: prepared.sourceNode.id,
      slots,
      contextMessageCount: prepared.contextMessageCount,
    };
  }

  private async persist(
    input: GenerateParallelContinuationsInput,
    prepared: PreparedDialogueContinuation,
    completion: CompletionResponse
  ): Promise<PersistedContinuation> {
    const saved = await createVerifiedModelContinuationNode({
      loomTreeId: input.treeId,
      parentNode: prepared.sourceNode,
      modelAgentId: input.modelAgentId,
      requestedModelIdentifier: input.modelIdentifier,
      provider: prepared.llmProvider.provider,
      completion,
      nodeRepository: this.deps.nodeRepository,
      edgeRepository: this.deps.edgeRepository,
      rawApiResponseRepository: this.deps.rawApiResponseRepository,
    });
    return {
      nodeId: saved.assistantNodeId,
      rawApiResponseId: saved.rawApiResponseId,
      finishReason: completion.finishReason,
      usage: completion.usage,
      modelIdentifier:
        completion.rawResponse.modelIdentifier ?? input.modelIdentifier,
      latencyMs: completion.rawResponse.latencyMs,
    };
  }
}

const hasSavedNode = (outcome: ContinuationSlotOutcome): boolean =>
  outcome.type === 'done' ||
  outcome.type === 'interrupted' ||
  (outcome.type === 'cancelled' && Boolean(outcome.saved));
