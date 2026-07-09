import { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { AppScreen } from '../ui/value-objects';
import { BookmarksSheet } from './chat/bookmarks/BookmarksSheet';
import { ChatHeaderMenu } from './chat/ChatHeaderMenu';
import { ChatComposer } from './chat/ChatComposer';
import { ChatMessageList } from './chat/ChatMessageList';
import { DialogueSettingsSheet } from './chat/dialogue-settings/DialogueSettingsSheet';
import { EditTreeTitleSheet } from './chat/EditTreeTitleSheet';
import { TreeTagsSheet } from './chat/tags/TreeTagsSheet';
import { useLoomTreeChatController } from './chat/useLoomTreeChatController';

const LoomTreeChatView = () => {
  const { colors } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const controller = useLoomTreeChatController();
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
  ]);

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
        onNodeTap={controller.onNodeTap}
        continuationRail={controller.continuationRail}
        displayPreferences={controller.displayPreferences}
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
        onExpandInput={controller.onExpandComposer}
        bottomInset={insets.bottom}
        displayPreferences={controller.displayPreferences}
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
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
