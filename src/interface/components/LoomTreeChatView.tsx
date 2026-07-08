import { useLayoutEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { AppScreen } from '../ui/value-objects';
import { BookmarksSheet } from './chat/bookmarks/BookmarksSheet';
import { ChatComposer } from './chat/ChatComposer';
import { ChatMessageList } from './chat/ChatMessageList';
import { DialogueSettingsSheet } from './chat/dialogue-settings/DialogueSettingsSheet';
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
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRightContainerStyle: {
        paddingRight: 14,
      },
      headerRight: () => (
        <View style={styles.headerButtons}>
          <Pressable
            onPress={openBookmarks}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerSettingsButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons
              name="bookmark-outline"
              size={20}
              color={colors.primary}
            />
          </Pressable>
          <Pressable
            onPress={openDialogueSettings}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerSettingsButton,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      ),
    });
  }, [colors.primary, navigation, openBookmarks, openDialogueSettings]);

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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSettingsButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
