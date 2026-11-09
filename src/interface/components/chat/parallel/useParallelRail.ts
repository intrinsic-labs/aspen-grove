import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { IContinuationCountPreferenceRepository } from '@application/repositories';
import type { ICredentialStore } from '@application/services/security';
import type { ContinuationSlotOutcome } from '@application/services/dialogue-continuation';
import type { GenerateParallelContinuationsUseCase } from '@application/use-cases';
import type { ULID } from '@domain/value-objects';
import type { ChatSession } from '../types';
import type { useNodeContinuations } from '../useNodeContinuations';
import { toRailCards } from './rail-cards';
import { useContinuationCount } from './useContinuationCount';
import { useParallelContinuations } from './useParallelContinuations';

type UseParallelRailInput = {
  readonly session: ChatSession | null;
  /** A single generation (send, regenerate, rewind) is in flight. */
  readonly sending: boolean;
  readonly continuations: Pick<
    ReturnType<typeof useNodeContinuations>,
    'visible' | 'sourceNodeId' | 'items' | 'showForNode'
  >;
  readonly refreshRows: (session: ChatSession) => Promise<void>;
  readonly credentialStore: ICredentialStore;
  readonly continuationCountRepo: Pick<
    IContinuationCountPreferenceRepository,
    'get' | 'set'
  >;
  readonly generateParallelContinuationsUseCase: Pick<
    GenerateParallelContinuationsUseCase,
    'execute'
  >;
};

const hasSavedNode = (outcome: ContinuationSlotOutcome): boolean =>
  outcome.type === 'done' ||
  outcome.type === 'interrupted' ||
  (outcome.type === 'cancelled' && Boolean(outcome.saved));

/**
 * Generating from the continuation rail: "Generate" starts the remembered
 * count (1-4) of continuations from the rail's node, and they stream as cards
 * into that same rail beside its existing siblings. As each one saves, the
 * rail reloads so its card can be used like any sibling; when all have
 * settled, the rows reload so the node's continuation count is current.
 *
 * The run outlives the rail: closing it (or making a card current, which
 * closes it) leaves the other streams running, and reopening the node shows
 * their cards again. A settled run's cards are cleared once the rail moves
 * off its node.
 */
export const useParallelRail = (input: UseParallelRailInput) => {
  const { session, sending, continuations, refreshRows } = input;
  const { count, setCount } = useContinuationCount(input.continuationCountRepo);

  const railSourceRef = useRef(continuations.sourceNodeId);
  railSourceRef.current = continuations.sourceNodeId;
  const showForNodeRef = useRef(continuations.showForNode);
  showForNodeRef.current = continuations.showForNode;
  const runSourceRef = useRef<ULID | null>(null);

  const onSlotSettled = useCallback((outcome: ContinuationSlotOutcome) => {
    const runSource = runSourceRef.current;
    if (
      hasSavedNode(outcome) &&
      runSource &&
      railSourceRef.current === runSource
    ) {
      void showForNodeRef.current(runSource);
    }
  }, []);

  const parallel = useParallelContinuations({
    session,
    generateParallelContinuationsUseCase:
      input.generateParallelContinuationsUseCase,
    credentialStore: input.credentialStore,
    onSlotSettled,
  });
  const { running, phase, start, reset } = parallel;

  const canGenerate =
    Boolean(session) &&
    Boolean(continuations.sourceNodeId) &&
    !sending &&
    !running;

  const generate = useCallback(async () => {
    const sourceNodeId = continuations.sourceNodeId;
    if (!session || !sourceNodeId || sending || running) {
      return;
    }
    runSourceRef.current = sourceNodeId;
    const result = await start(sourceNodeId, count);
    if (result) {
      await refreshRows(session);
    }
  }, [
    continuations.sourceNodeId,
    count,
    refreshRows,
    running,
    sending,
    session,
    start,
  ]);

  // A settled run's cards stay while the rail shows its node, then clear.
  useEffect(() => {
    if (
      phase === 'settled' &&
      parallel.sourceNodeId !== continuations.sourceNodeId
    ) {
      reset();
    }
  }, [continuations.sourceNodeId, parallel.sourceNodeId, phase, reset]);

  const cards = useMemo(
    () =>
      toRailCards(continuations.sourceNodeId, continuations.items, {
        sourceNodeId: parallel.sourceNodeId,
        slots: parallel.slots,
      }),
    [
      continuations.items,
      continuations.sourceNodeId,
      parallel.slots,
      parallel.sourceNodeId,
    ]
  );

  const runIsInRail =
    running && parallel.sourceNodeId === continuations.sourceNodeId;

  return {
    cards,
    count,
    setCount,
    canGenerate,
    /** The rail's own node is generating: its control shows Stop all. */
    runIsInRail,
    /** Some run is streaming (blocks send and regenerate meanwhile). */
    running,
    generate,
    stop: parallel.stop,
    stopAll: parallel.stopAll,
  };
};
