import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

type ComposerSendButtonProps = {
  readonly onSend: () => void;
  readonly canSend: boolean;
  readonly sending: boolean;
  readonly hasText: boolean;
  readonly sendLabel: string;
};

/**
 * Latent Spaces' send control (MessageField.swift:31-37,62-69): a green
 * filled arrow circle (`arrowshape.up.circle.fill`; Material Community's
 * bold arrow circle is the nearest glyph without SF Symbols), hidden while the field is empty. While a reply is
 * coming it shows in the primary color; Aspen Grove has no stop action, so
 * it is a non-actionable "thinking" circle there.
 */
export const ComposerSendButton = ({
  onSend,
  canSend,
  sending,
  hasText,
  sendLabel,
}: ComposerSendButtonProps) => {
  const { colors } = useAspenGroveTheme();
  const visible = hasText || sending;

  return (
    <Pressable
      testID="chat-composer-send"
      onPress={onSend}
      disabled={!canSend || !visible}
      accessibilityLabel={sendLabel}
      accessibilityElementsHidden={!visible}
      style={({ pressed }) => [
        styles.button,
        { opacity: visible ? (pressed ? 0.65 : 1) : 0 },
      ]}
    >
      <MaterialCommunityIcons
        name={
          sending
            ? 'dots-horizontal-circle'
            : sendLabel === 'Save'
              ? 'check-circle'
              : 'arrow-up-bold-circle'
        }
        size={loomUiTokens.composer.sendIconSize}
        color={sending ? colors.primary : colors.green}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: loomUiTokens.composer.sendButtonPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
