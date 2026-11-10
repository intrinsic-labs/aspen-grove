import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ChatRow } from '../types';

/**
 * Inline affordance line under a node: a filled bookmark glyph (when
 * bookmarked), branch count, and pruned indicator. Rendered only when there is
 * something to say.
 */
export const NodeCaption = ({
  row,
  iconColor,
  textColor,
}: {
  readonly row: ChatRow;
  readonly iconColor: string;
  readonly textColor: string;
}) => {
  const parts = [
    row.continuationCount > 1
      ? `Continuations: ${row.continuationCount}`
      : null,
    row.pruned ? 'Pruned' : null,
  ].filter(Boolean);

  if (parts.length === 0 && !row.bookmarked) {
    return null;
  }

  return (
    <View style={styles.nodeCaption}>
      {row.bookmarked ? (
        <Ionicons name="bookmark" size={11} color={iconColor} />
      ) : null}
      {parts.length > 0 ? (
        <Text style={[styles.nodeCaptionText, { color: textColor }]}>
          {parts.join('  ·  ')}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  nodeCaption: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodeCaptionText: {
    fontStyle: 'italic',
    fontSize: 11,
    letterSpacing: 0,
  },
});
