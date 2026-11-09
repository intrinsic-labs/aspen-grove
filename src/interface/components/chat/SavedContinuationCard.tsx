import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ULID } from '@domain/value-objects';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import { ContinuationCardShell } from './ContinuationCardShell';
import type { ContinuationMenuAction } from './continuation-menu';
import { continuationCardStyles } from './continuation-card-styles';
import type { ContinuationPreview } from './types';

type SavedContinuationCardProps = {
  readonly item: ContinuationPreview;
  readonly previewFontFamily?: string;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
};

/** A sibling that already exists: local id, branch length and its text. */
export const SavedContinuationCard = ({
  item,
  previewFontFamily,
  onSelect,
  onMenuAction,
}: SavedContinuationCardProps) => (
  <ContinuationCardShell
    nodeId={item.nodeId}
    menuTitle={item.localId}
    isBookmarked={item.isBookmarked}
    onSelect={onSelect}
    onMenuAction={onMenuAction}
  >
    <View style={continuationCardStyles.metaRow}>
      <AppText
        variant="meta"
        style={[
          continuationCardStyles.metaLine,
          continuationCardStyles.cardText,
        ]}
      >
        {item.localId} [{item.onBranchCount}]{item.isOnActivePath ? '  ●' : ''}
      </AppText>
      {item.isBookmarked ? (
        <Ionicons name="bookmark" size={11} color="#000" />
      ) : null}
    </View>
    <AppText
      variant="ui"
      numberOfLines={loomUiTokens.continuationRail.previewTextMaxLines}
      style={[
        continuationCardStyles.previewText,
        previewFontFamily ? { fontFamily: previewFontFamily } : null,
        continuationCardStyles.cardText,
      ]}
    >
      {item.previewText}
    </AppText>
  </ContinuationCardShell>
);
