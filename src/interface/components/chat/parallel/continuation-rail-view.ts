import type { useContinuationGestures } from '../node-actions/useContinuationGestures';
import type { useNodeContinuations } from '../useNodeContinuations';
import type { useParallelRail } from './useParallelRail';

type Gestures = ReturnType<typeof useContinuationGestures>;

type ContinuationRailViewInput = {
  readonly continuations: Pick<
    ReturnType<typeof useNodeContinuations>,
    'visible' | 'loading' | 'sourceNodeId' | 'error'
  >;
  readonly parallelRail: ReturnType<typeof useParallelRail>;
  /** The tree's model id, shown on cards that are still streaming. */
  readonly streamingModelLabel: string;
  readonly onSelect: Gestures['onContinuationSelect'];
  readonly onMenuAction: Gestures['onContinuationMenuAction'];
};

/**
 * The continuation rail's props, from the rail's sibling state and the
 * parallel generation running in it.
 */
export const toContinuationRailView = ({
  continuations,
  parallelRail,
  streamingModelLabel,
  onSelect,
  onMenuAction,
}: ContinuationRailViewInput) => ({
  visible: continuations.visible,
  loading: continuations.loading,
  sourceNodeId: continuations.sourceNodeId,
  cards: parallelRail.cards,
  streamingModelLabel,
  generation: {
    count: parallelRail.count,
    onChangeCount: parallelRail.setCount,
    canGenerate: parallelRail.canGenerate,
    running: parallelRail.runIsInRail,
    onGenerate: () => void parallelRail.generate(),
    onStopAll: parallelRail.stopAll,
  },
  onSelect,
  onMenuAction,
  onStopSlot: parallelRail.stop,
  error: continuations.error,
});
