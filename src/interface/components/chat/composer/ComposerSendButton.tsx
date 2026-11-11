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
  /** A reply is streaming and can be stopped: the button becomes Stop. */
  readonly canStop: boolean;
  /** Stop was pressed; the partial reply is being saved. */
  readonly stopping: boolean;
  readonly onStop: () => void;
};

/**
 * Latent Spaces' send control (MessageField.swift:31-37,62-69): a green
 * filled arrow circle (`arrowshape.up.circle.fill`; Material Community's
 * bold arrow circle is the nearest glyph without SF Symbols), hidden while
 * the field is empty. While a reply streams it is a stop circle in the
 * primary color (`stop.circle.fill`, MessageField.swift:63-66) that cancels
 * it (MessageField.swift:77-81). Saving an edit, which streams nothing,
 * shows a non-actionable `···` circle.
 */
export const ComposerSendButton = ({
  onSend,
  canSend,
  sending,
  hasText,
  sendLabel,
  canStop,
  stopping,
  onStop,
}: ComposerSendButtonProps) => {
  const { colors } = useAspenGroveTheme();
  const visible = hasText || sending || canStop;

  if (canStop) {
    return (
      <Pressable
        testID="chat-composer-stop"
        onPress={onStop}
        disabled={stopping}
        accessibilityRole="button"
        accessibilityLabel="Stop"
        accessibilityState={{ disabled: stopping }}
        style={({ pressed }) => [
          styles.button,
          { opacity: stopping ? 0.4 : pressed ? 0.65 : 1 },
        ]}
      >
        <MaterialCommunityIcons
          name="stop-circle"
          size={loomUiTokens.composer.sendIconSize}
          color={colors.primary}
        />
      </Pressable>
    );
  }

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
