import { ActivityIndicator, Pressable, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { ContinuationCardCaption } from '../ContinuationCardCaption';
import { ContinuationCardShell } from '../ContinuationCardShell';
import { continuationCardStyles } from '../continuation-card-styles';
import type { ContinuationMenuAction } from '../continuation-menu';
import type { ContinuationPreview } from '../types';
import type { ParallelSlotView } from './parallel-slots-state';
import { toSlotCardState } from './slot-card-state';

const rail = loomUiTokens.continuationRail;

type StreamingContinuationCardProps = {
  readonly view: ParallelSlotView;
  /** The saved node's preview, once the rail has reloaded it. */
  readonly preview?: ContinuationPreview;
  /** The model the run streams from, until the saved node names its own. */
  readonly modelLabel: string;
  readonly textStyle: TextStyle;
  readonly onStop: (slot: number) => void;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
};

/**
 * One of N continuations started together, in the same caption and tan card
 * as a saved one. The caption carries its state where a saved card has its
 * `[n]`, and a stop button while it can be stopped. Once saved it takes the
 * card gestures, so a tap expands it and a double tap makes it current.
 */
export const StreamingContinuationCard = ({
  view,
  preview,
  modelLabel,
  textStyle,
  onStop,
  onSelect,
  onMenuAction,
}: StreamingContinuationCardProps) => {
  const state = toSlotCardState(view);
  const failed = state.key === 'failed';
  const detail =
    state.key === 'done' && preview
      ? `[${preview.onBranchCount}]`
      : `[${state.label}]`;

  return (
    <ContinuationCardShell
      testID={`chat-continuation-slot-${view.slot}`}
      nodeId={view.nodeId}
      isBookmarked={preview?.isBookmarked}
      cardStyle={failed ? continuationCardStyles.failedCard : null}
      caption={
        <ContinuationCardCaption
          label={preview?.modelLabel ?? modelLabel}
          detail={detail}
          checked={preview?.isOnActivePath}
          detailTestID={`chat-continuation-slot-state-${view.slot}-${state.key}`}
          accessory={
            state.key === 'stopping' ? (
              <ActivityIndicator size="small" color={rail.gray} />
            ) : state.canStop ? (
              <Pressable
                testID={`chat-continuation-slot-stop-${view.slot}`}
                accessibilityLabel={`Stop continuation ${view.slot + 1}`}
                hitSlop={rail.stopHitSlop}
                onPress={() => onStop(view.slot)}
              >
                <Ionicons
                  name="stop-circle-outline"
                  size={rail.stopIconSize}
                  color={rail.gray}
                />
              </Pressable>
            ) : null
          }
        />
      }
      onSelect={onSelect}
      onMenuAction={onMenuAction}
    >
      <AppText
        testID={
          failed ? `chat-continuation-slot-error-${view.slot}` : undefined
        }
        variant={failed ? 'meta' : 'body'}
        numberOfLines={rail.previewTextMaxLines}
        style={[
          failed ? null : textStyle,
          continuationCardStyles.cardText,
          state.key === 'pending' || (state.key === 'stopped' && !view.nodeId)
            ? continuationCardStyles.quietText
            : null,
        ]}
      >
        {state.key === 'pending' ? 'Waiting for the model…' : state.body}
      </AppText>
    </ContinuationCardShell>
  );
};
