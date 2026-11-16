import { ActivityIndicator, Pressable, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ULID } from '@domain/value-objects';
import {
  useErrorDetailDisclosure,
  useErrorDetailsExpandedByDefault,
} from '../../error-details';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { ContinuationCardCaption } from '../ContinuationCardCaption';
import { ContinuationCardShell } from '../ContinuationCardShell';
import { continuationCardStyles } from '../continuation-card-styles';
import type { ContinuationMenuAction } from '../continuation-menu';
import type { ContinuationPreview } from '../types';
import type { ParallelSlotView } from './parallel-slots-state';
import { FailedCardBody } from './FailedCardBody';
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
 * card gestures, so a tap expands it and a double tap makes it current. A
 * failed card says what went wrong in a plain line; a tap shows (and hides)
 * the provider's own words, shown from the start with Verbose Error Alerts.
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
  // A slot's card stays mounted across runs: reset the choice when it
  // stops being failed, so each new failure opens at the default.
  const detailDisclosure = useErrorDetailDisclosure(
    useErrorDetailsExpandedByDefault(),
    failed ? `failed:${state.detail ?? ''}` : view.status
  );
  const canExpand = failed && Boolean(state.detail);
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
      onPressWithoutNode={canExpand ? detailDisclosure.toggle : undefined}
      pressTestID={`chat-continuation-slot-error-toggle-${view.slot}`}
      onSelect={onSelect}
      onMenuAction={onMenuAction}
    >
      {failed ? (
        <FailedCardBody
          slot={view.slot}
          message={state.body}
          detail={state.detail}
          showDetail={detailDisclosure.shown}
          textStyle={textStyle}
        />
      ) : (
        <AppText
          variant="body"
          numberOfLines={rail.previewTextMaxLines}
          style={[
            textStyle,
            continuationCardStyles.cardText,
            state.key === 'pending' || (state.key === 'stopped' && !view.nodeId)
              ? continuationCardStyles.quietText
              : null,
          ]}
        >
          {state.key === 'pending' ? 'Waiting for the model…' : state.body}
        </AppText>
      )}
    </ContinuationCardShell>
  );
};
