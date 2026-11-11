import { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { AppScreen } from '../ui/value-objects';
import { loomUiTokens } from '../ui/value-objects/loom-ui-tokens';
import { BookmarksSheet } from './chat/bookmarks/BookmarksSheet';
import { ChatHeaderMenu } from './chat/ChatHeaderMenu';
import { ChatComposer } from './chat/ChatComposer';
import { ChatMessageList } from './chat/ChatMessageList';
import { DialogueSettingsSheet } from './chat/dialogue-settings/DialogueSettingsSheet';
import { EditTreeTitleSheet } from './chat/EditTreeTitleSheet';
import { TreeTagsSheet } from './chat/tags/TreeTagsSheet';
import { useLoomTreeChatController } from './chat/useLoomTreeChatController';
import { useVoiceMode } from './voice';

const LoomTreeChatView = () => {
  const { colors } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const controller = useLoomTreeChatController();
  const { voiceModeEnabled, setVoiceModeEnabled } = useVoiceMode();
  const [composerHeight, setComposerHeight] = useState(72);

  const openDialogueSettings = controller.dialogueSettings.open;
  const openBookmarks = controller.bookmarks.open;
  const openTitleEditor = controller.titleEditor.open;
  const exportTree = controller.exports.exportTree;
  const exportPath = controller.exports.exportPathMarkdown;
  const openTags = controller.tags.open;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRightContainerStyle: {
        paddingRight: 14,
      },
      headerRight: () => (
        <ChatHeaderMenu
          onOpenBookmarks={openBookmarks}
          onOpenDialogueSettings={openDialogueSettings}
          voiceModeEnabled={voiceModeEnabled}
          onToggleVoiceMode={() => setVoiceModeEnabled(!voiceModeEnabled)}
          onEditTitle={openTitleEditor}
          onOpenTags={openTags}
          onExportTree={() => void exportTree()}
          onExportPath={() => void exportPath()}
        />
      ),
    });
  }, [
    colors.primary,
    navigation,
    openBookmarks,
    openDialogueSettings,
    openTitleEditor,
    openTags,
    exportTree,
    exportPath,
    voiceModeEnabled,
    setVoiceModeEnabled,
  ]);

  return (
    <AppScreen testID="chat-screen" style={styles.container}>
      <ChatMessageList
        loading={controller.loading}
        sending={controller.sending}
        rows={controller.rows}
        streamingAssistantText={controller.streamingAssistantText}
        composerHeight={composerHeight}
        headerHeight={headerHeight}
        bottomInset={insets.bottom}
        error={controller.error}
        errorAction={controller.errorAction}
        onErrorAction={controller.onErrorAction}
        scrollRef={controller.scrollRef}
        onScroll={controller.onMessageListScroll}
        onMessageAction={controller.onMessageAction}
        onNodeTap={controller.onNodeTap}
        speakingRow={controller.speakingRow}
        continuationRail={controller.continuationRail}
        displayPreferences={controller.displayPreferences}
      />

      {/* The whole screen fades to black over its last 10%
          (MessageInputView.swift:24-34). */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'transparent', colors.oppositePrimary]}
        locations={[0, loomUiTokens.bottomFade.clearUntil, 1]}
        style={StyleSheet.absoluteFill}
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
        canStop={controller.canStop}
        stopping={controller.stopping}
        onStop={controller.onStop}
        inputRef={controller.inputRef}
        onInputFocus={controller.onComposerFocus}
        onComposerLayout={setComposerHeight}
        onExpandInput={controller.onExpandComposer}
        bottomInset={insets.bottom}
        displayPreferences={controller.displayPreferences}
        needsAgent={controller.needsAgent}
        onChooseAgent={controller.onChooseAgent}
      />

      <DialogueSettingsSheet
        visible={controller.dialogueSettings.visible}
        treeId={controller.dialogueSettings.treeId}
        onClose={controller.dialogueSettings.close}
        onSessionInvalidated={controller.dialogueSettings.onSessionInvalidated}
      />

      <BookmarksSheet
        visible={controller.bookmarks.visible}
        treeId={controller.bookmarks.treeId}
        onClose={controller.bookmarks.close}
        onSelectNode={controller.bookmarks.onSelectNode}
        onShowDetail={controller.bookmarks.onShowDetail}
      />

      <EditTreeTitleSheet
        visible={controller.titleEditor.visible}
        initialTitle={controller.titleEditor.title}
        onCancel={controller.titleEditor.close}
        onSubmit={controller.titleEditor.save}
      />

      <TreeTagsSheet
        visible={controller.tags.visible}
        treeId={controller.tags.treeId}
        onClose={controller.tags.close}
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
