import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  MAX_PARALLEL_CONTINUATIONS,
  MIN_PARALLEL_CONTINUATIONS,
} from '@application/services/dialogue-continuation';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';

export type ContinuationGenerateControlProps = {
  readonly count: number;
  readonly onChangeCount: (count: number) => void;
  readonly canGenerate: boolean;
  /** This rail's node is generating: the action becomes Stop all. */
  readonly running: boolean;
  readonly onGenerate: () => void;
  readonly onStopAll: () => void;
};

/**
 * The rail's generate action with its count beside it: − N + then
 * "Generate N" (or "Stop all" while those N stream). Latent Spaces has no
 * several-at-once control, so this is Aspen Grove's; it borrows the green
 * Latent Spaces reserves for action.
 */
export const ContinuationGenerateControl = ({
  count,
  onChangeCount,
  canGenerate,
  running,
  onGenerate,
  onStopAll,
}: ContinuationGenerateControlProps) => {
  const { colors } = useAspenGroveTheme();
  const canDecrease = !running && count > MIN_PARALLEL_CONTINUATIONS;
  const canIncrease = !running && count < MAX_PARALLEL_CONTINUATIONS;
  const hitSlop = loomUiTokens.continuationRail.stopHitSlop;

  return (
    <View testID="chat-continuation-generate" style={styles.row}>
      <Pressable
        testID="chat-continuation-count-decrease"
        accessibilityLabel="Fewer continuations"
        disabled={!canDecrease}
        hitSlop={hitSlop}
        onPress={() => onChangeCount(count - 1)}
      >
        <Ionicons
          name="remove"
          size={16}
          color={canDecrease ? colors.secondary : colors.line}
        />
      </Pressable>
      <AppText
        testID="chat-continuation-count-value"
        variant="meta"
        tone="secondary"
        style={styles.count}
      >
        {count}
      </AppText>
      <Pressable
        testID="chat-continuation-count-increase"
        accessibilityLabel="More continuations"
        disabled={!canIncrease}
        hitSlop={hitSlop}
        onPress={() => onChangeCount(count + 1)}
      >
        <Ionicons
          name="add"
          size={16}
          color={canIncrease ? colors.secondary : colors.line}
        />
      </Pressable>
      {running ? (
        <Pressable
          testID="chat-continuation-stop-all"
          accessibilityLabel="Stop all continuations"
          hitSlop={hitSlop}
          onPress={onStopAll}
          style={styles.action}
        >
          <Ionicons name="stop-circle-outline" size={16} color={colors.green} />
          <AppText variant="meta" style={{ color: colors.green }}>
            Stop all
          </AppText>
        </Pressable>
      ) : (
        <Pressable
          testID="chat-continuation-generate-button"
          accessibilityLabel={`Generate ${count} continuations`}
          disabled={!canGenerate}
          hitSlop={hitSlop}
          onPress={onGenerate}
          style={[styles.action, { opacity: canGenerate ? 1 : 0.4 }]}
        >
          <Ionicons name="sparkles-outline" size={14} color={colors.green} />
          <AppText variant="meta" style={{ color: colors.green }}>
            Generate {count}
          </AppText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingTop: loomUiTokens.continuationRail.hintPadding / 2,
  },
  count: {
    minWidth: 12,
    textAlign: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
});
