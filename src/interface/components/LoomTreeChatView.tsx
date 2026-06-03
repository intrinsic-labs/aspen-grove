import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { AppScreen } from '../ui/value-objects';
import { ChatComposer } from './chat/ChatComposer';
import { ChatMessageList } from './chat/ChatMessageList';
import { ContinuationRail } from './chat/ContinuationRail';
import { useLoomTreeChatController } from './chat/useLoomTreeChatController';

const LoomTreeChatView = () => {
  const { colors } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
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
        headerHeight={headerHeight}
        error={controller.error}
        scrollRef={controller.scrollRef}
        onScroll={controller.onMessageListScroll}
        onMessageAction={controller.onMessageAction}
        displayPreferences={controller.displayPreferences}
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

      <View
        style={[styles.bottomFade, { height: composerHeight * 0.8, bottom: 0 }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', colors.oppositePrimary]}
          style={StyleSheet.absoluteFill}
        />
      </View>

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
        displayPreferences={controller.displayPreferences}
        //colors={colors}
      />
    </AppScreen>
  );
};

export default LoomTreeChatView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
