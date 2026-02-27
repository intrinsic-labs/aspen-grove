import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { AppScreen } from '../ui/system';
import { ChatComposer } from './chat/ChatComposer';
import { ChatMessageList } from './chat/ChatMessageList';
import { ContinuationRail } from './chat/ContinuationRail';
import { useLoomTreeChatController } from './chat/useLoomTreeChatController';

const LoomTreeChatView = () => {
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const controller = useLoomTreeChatController();
  const [composerHeight, setComposerHeight] = useState(72);

  return (
    <AppScreen style={styles.container}>
      <ChatMessageList
        loading={controller.loading}
        sending={controller.sending}
        rows={controller.rows}
        streamingAssistantText={controller.streamingAssistantText}
        composerHeight={composerHeight}
        error={controller.error}
        scrollRef={controller.scrollRef}
        onScroll={controller.onMessageListScroll}
        onMessageAction={controller.onMessageAction}
        colors={colors}
      />

      <ContinuationRail
        visible={controller.continuationRail.visible}
        loading={controller.continuationRail.loading}
        sourceLocalId={controller.continuationRail.sourceLocalId}
        selectedNodeId={controller.continuationRail.selectedNodeId}
        continuations={controller.continuationRail.items}
        error={controller.continuationRail.error}
        onSelect={controller.continuationRail.onSelect}
        onMakeCurrent={controller.continuationRail.onMakeCurrent}
        onMenuAction={controller.continuationRail.onMenuAction}
        onClose={controller.continuationRail.onClose}
        colors={colors}
      />

      <ChatComposer
        input={controller.input}
        onChangeInput={controller.setInput}
        onSend={controller.onSend}
        canSend={controller.canSend}
        sendLabel={controller.sendLabel}
        placeholder={controller.composerPlaceholder}
        editLabel={controller.editLabel}
        onCancelEdit={controller.onCancelEdit}
        loading={controller.loading}
        sending={controller.sending}
        inputRef={controller.inputRef}
        onInputFocus={controller.onComposerFocus}
        onComposerLayout={setComposerHeight}
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
