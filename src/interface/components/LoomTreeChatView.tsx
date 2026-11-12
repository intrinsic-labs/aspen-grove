import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { TextEditorSheet } from '../ui/components/text-editor/TextEditorSheet';
import { TextPromptDialog } from '../ui/components/text-prompt/TextPromptDialog';
import { AppScreen } from '../ui/value-objects';
import { loomUiTokens } from '../ui/value-objects/loom-ui-tokens';
import { ChatComposer } from './chat/ChatComposer';
import { ChatMessageList } from './chat/ChatMessageList';
import { OpenLoomExportSheet } from './chat/export-sheet/OpenLoomExportSheet';
import { toMessageTextStyle } from './chat/message-list/message-text-style';
import { NodeSheet } from './chat/node-sheet/NodeSheet';
import { TreeTagsSheet } from './chat/tags/TreeTagsSheet';
import { useTreeHeaderMenu } from './chat/tree-menu/useTreeHeaderMenu';
import { useLoomTreeChatController } from './chat/useLoomTreeChatController';
import { useVoiceMode } from './voice';

const LoomTreeChatView = () => {
  const { colors } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const controller = useLoomTreeChatController();
  const { voiceModeEnabled, setVoiceModeEnabled } = useVoiceMode();
  const [composerHeight, setComposerHeight] = useState(72);
  const { messageFontFamily, messageFontSize, messageLineHeight } =
    controller.displayPreferences;
  const sheetTextStyle = useMemo(
    () =>
      toMessageTextStyle({
        messageFontFamily,
        messageFontSize,
        messageLineHeight,
      }),
    [messageFontFamily, messageFontSize, messageLineHeight]
  );

  useTreeHeaderMenu({
    bookmarks: controller.bookmarks,
    voiceModeEnabled,
    setVoiceModeEnabled,
    openModel: controller.openModelSettings,
    editTitle: controller.editTitle,
    editDescription: controller.description.open,
    openBookmark: controller.openBookmark,
    openExport: controller.exportSheet.open,
    openTags: controller.tags.open,
    exportPath: controller.exportPath,
  });

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

      <NodeSheet
        target={controller.nodeSheet.target}
        activePathNodeIds={controller.nodeSheet.activePathNodeIds}
        textStyle={sheetTextStyle}
        onClose={controller.nodeSheet.close}
        onDismissed={controller.nodeSheet.onDismissed}
        onInfoAction={controller.nodeSheet.onInfoAction}
        onContinuationAction={controller.nodeSheet.onContinuationAction}
        onBookmarkAction={controller.nodeSheet.onBookmarkAction}
      />

      <TextEditorSheet
        testID="tree-description-sheet"
        title="Loom Tree Description"
        visible={controller.description.visible}
        text={controller.description.draft}
        onChangeText={controller.description.setDraft}
        onSave={controller.description.save}
        onClose={controller.description.close}
        textStyle={sheetTextStyle}
      />

      <OpenLoomExportSheet
        visible={controller.exportSheet.visible}
        draft={controller.exportSheet.draft}
        onChange={controller.exportSheet.update}
        onBack={controller.exportSheet.close}
        onShare={controller.exportSheet.share}
        onDismissed={controller.exportSheet.onDismissed}
      />

      <TextPromptDialog pending={controller.textPrompt} />

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
