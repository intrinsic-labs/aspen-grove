import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { ContinuationCardShell } from '../ContinuationCardShell';
import { continuationCardStyles } from '../continuation-card-styles';
import type { ContinuationMenuAction } from '../continuation-menu';
import type { ContinuationPreview } from '../types';
import type { ParallelSlotView } from './parallel-slots-state';
import { toSlotCardState } from './slot-card-state';

type StreamingContinuationCardProps = {
  readonly view: ParallelSlotView;
  /** The saved node's preview, once the rail has reloaded it. */
  readonly preview?: ContinuationPreview;
  readonly previewFontFamily?: string;
  readonly onStop: (slot: number) => void;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
};

/**
 * One of N continuations started together, in the same tan card as a saved
 * sibling. Its meta line names the slot (or the saved node's local id) and
 * its state; while it can be stopped, a stop button sits at the right. Once
 * saved it takes the sibling gestures, so double tap makes it current.
 */
export const StreamingContinuationCard = ({
  view,
  preview,
  previewFontFamily,
  onStop,
  onSelect,
  onMenuAction,
}: StreamingContinuationCardProps) => {
  const state = toSlotCardState(view);
  const name = preview?.localId ?? `#${view.slot + 1}`;
  const progress =
    state.key === 'streaming' ? ` · ${view.text.length} chars` : '';

  return (
    <ContinuationCardShell
      testID={`chat-continuation-slot-${view.slot}`}
      nodeId={view.nodeId}
      menuTitle={preview?.localId}
      isBookmarked={preview?.isBookmarked}
      style={state.key === 'failed' ? styles.failedCard : null}
      onSelect={onSelect}
      onMenuAction={onMenuAction}
    >
      <View style={continuationCardStyles.metaRow}>
        <AppText
          testID={`chat-continuation-slot-state-${view.slot}-${state.key}`}
          variant="meta"
          numberOfLines={1}
          style={[
            styles.metaText,
            continuationCardStyles.metaLine,
            continuationCardStyles.cardText,
          ]}
        >
          {name} · {state.label}
          {progress}
        </AppText>
        {state.key === 'pending' || state.key === 'stopping' ? (
          <ActivityIndicator size="small" color="#000" />
        ) : null}
        {state.canStop ? (
          <Pressable
            testID={`chat-continuation-slot-stop-${view.slot}`}
            accessibilityLabel={`Stop continuation ${view.slot + 1}`}
            hitSlop={loomUiTokens.continuationRail.closeHitSlop}
            onPress={() => onStop(view.slot)}
          >
            <Ionicons name="stop-circle-outline" size={20} color="#000" />
          </Pressable>
        ) : null}
      </View>
      <AppText
        testID={
          state.key === 'failed'
            ? `chat-continuation-slot-error-${view.slot}`
            : undefined
        }
        variant={state.key === 'failed' ? 'meta' : 'ui'}
        numberOfLines={loomUiTokens.continuationRail.previewTextMaxLines}
        style={[
          state.key === 'failed' ? null : continuationCardStyles.previewText,
          previewFontFamily && state.key !== 'failed'
            ? { fontFamily: previewFontFamily }
            : null,
          continuationCardStyles.cardText,
          state.key === 'pending' || (state.key === 'stopped' && !view.nodeId)
            ? styles.quietText
            : null,
        ]}
      >
        {state.key === 'pending' ? 'Waiting for the model…' : state.body}
      </AppText>
    </ContinuationCardShell>
  );
};

const styles = StyleSheet.create({
  metaText: {
    flex: 1,
  },
  failedCard: {
    opacity: 0.75,
  },
  quietText: {
    opacity: 0.6,
  },
});
