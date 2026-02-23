import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { AppScreen } from '../ui/system';
import { ChatComposer } from './chat/ChatComposer';
import { ChatMessageList } from './chat/ChatMessageList';
import { useLoomTreeChatController } from './chat/useLoomTreeChatController';

const LoomTreeChatView = () => {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const controller = useLoomTreeChatController();

  return (
    <AppScreen style={styles.container}>
      <ChatMessageList
        loading={controller.loading}
        sending={controller.sending}
        rows={controller.rows}
        error={controller.error}
        scrollRef={controller.scrollRef}
        colors={colors}
      />

      <ChatComposer
        input={controller.input}
        onChangeInput={controller.setInput}
        onSend={controller.onSend}
        canSend={controller.canSend}
        loading={controller.loading}
        sending={controller.sending}
        inputRef={controller.inputRef}
        bottomInset={insets.bottom}
        colors={colors}
      />
    </AppScreen>
  );
};

export default LoomTreeChatView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

