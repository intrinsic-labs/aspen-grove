import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { MaterialView } from '@/interface/ui/components/MaterialView';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

type NeedsAgentNoticeProps = {
  /** Opens the tree's dialogue settings, where an agent can be picked. */
  readonly onChooseAgent: () => void;
};

/**
 * Stands in for the message input when the tree has no usable model agent
 * (imported before one existed, or its agent was deleted or archived): the
 * conversation reads normally, but continuing it needs an agent.
 */
export const NeedsAgentNotice = ({ onChooseAgent }: NeedsAgentNoticeProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <MaterialView
      variant="systemThinDark"
      style={[styles.notice, { borderColor: colors.secondary }]}
    >
      <AppText
        testID="chat-needs-agent"
        variant="meta"
        tone="secondary"
        style={styles.message}
      >
        This tree needs an agent to continue.
      </AppText>
      <Pressable
        testID="chat-needs-agent-choose"
        onPress={onChooseAgent}
        accessibilityRole="button"
        hitSlop={loomUiTokens.composer.closeHitSlop}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.green, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons
          name="person-circle-outline"
          size={loomUiTokens.composer.sendIconSize}
          color={colors.primary}
        />
        <AppText variant="meta" style={{ color: colors.primary }}>
          Choose agent
        </AppText>
      </Pressable>
    </MaterialView>
  );
};

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: loomUiTokens.composer.sectionGap,
    minHeight: loomUiTokens.composer.inputMinHeight,
    borderWidth: 1,
    borderRadius: loomUiTokens.composer.fieldRadius,
    paddingLeft: loomUiTokens.composer.inputControlEdgePadding * 1.6,
    paddingRight: loomUiTokens.composer.inputControlEdgePadding,
    paddingVertical: loomUiTokens.composer.inputControlEdgePadding,
  },
  message: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: loomUiTokens.composer.editBannerIconGap,
    borderRadius: loomUiTokens.composer.fieldRadius,
    paddingHorizontal: loomUiTokens.composer.inputControlEdgePadding * 1.2,
    paddingVertical: loomUiTokens.composer.editBannerIconGap,
  },
});
