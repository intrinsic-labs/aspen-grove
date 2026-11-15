import type { TextStyle } from 'react-native';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import { ContinuationCardCaption } from './ContinuationCardCaption';
import { ContinuationCardShell } from './ContinuationCardShell';
import type { ContinuationMenuAction } from './continuation-menu';
import { continuationCardStyles } from './continuation-card-styles';
import type { ContinuationPreview } from './types';

type SavedContinuationCardProps = {
  readonly item: ContinuationPreview;
  /** The message text's font and size (Latent Spaces' loom font). */
  readonly textStyle: TextStyle;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
};

/** A continuation that already exists: its model, branch length and text. */
export const SavedContinuationCard = ({
  item,
  textStyle,
  onSelect,
  onMenuAction,
}: SavedContinuationCardProps) => (
  <ContinuationCardShell
    nodeId={item.nodeId}
    isBookmarked={item.isBookmarked}
    caption={
      <ContinuationCardCaption
        label={item.modelLabel}
        detail={`[${item.onBranchCount}]`}
        checked={item.isOnActivePath}
      />
    }
    onSelect={onSelect}
    onMenuAction={onMenuAction}
  >
    <AppText
      variant="body"
      numberOfLines={loomUiTokens.continuationRail.previewTextMaxLines}
      style={[textStyle, continuationCardStyles.cardText]}
    >
      {item.previewText}
    </AppText>
  </ContinuationCardShell>
);
