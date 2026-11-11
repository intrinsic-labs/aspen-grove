import { memo, type RefObject, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputContentSizeChangeEventData,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { AppInput, AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';
import { ComposerSendButton } from './composer/ComposerSendButton';
import { NeedsAgentNotice } from './composer/NeedsAgentNotice';
import type { ChatDisplayPreferences } from './types';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { MaterialView } from '@/interface/ui/components/MaterialView';

type ChatComposerProps = {
  readonly input: string;
  readonly onChangeInput: (value: string) => void;
  readonly onSend: () => void;
  readonly canSend: boolean;
  readonly sendLabel: string;
  readonly placeholder: string;
  readonly editLabel?: string;
  readonly onCancelEdit?: () => void;
  readonly loading: boolean;
  readonly sending: boolean;
  /** A send or regenerate is streaming: the send button becomes Stop. */
  readonly canStop: boolean;
  readonly stopping: boolean;
  readonly onStop: () => void;
  readonly inputRef: RefObject<TextInput | null>;
  readonly onInputFocus: () => void;
  readonly onComposerLayout: (height: number) => void;
  readonly onExpandInput: () => void;
  readonly bottomInset: number;
  readonly displayPreferences: ChatDisplayPreferences;
  /** The tree has no agent: say so in place of the input (unless editing). */
  readonly needsAgent: boolean;
  readonly onChooseAgent: () => void;
};

export const ChatComposer = memo(
  ({
    input,
    onChangeInput,
    onSend,
    canSend,
    sendLabel,
    placeholder,
    editLabel,
    onCancelEdit,
    loading,
    sending,
    canStop,
    stopping,
    onStop,
    inputRef,
    onInputFocus,
    onComposerLayout,
    onExpandInput,
    bottomInset,
    displayPreferences,
    needsAgent,
    onChooseAgent,
  }: ChatComposerProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);

    const onLayout = (event: LayoutChangeEvent) => {
      onComposerLayout(event.nativeEvent.layout.height);
    };
    const inputVerticalPadding = loomUiTokens.composer.textPaddingVertical * 2;
    // One line plus the field's padding: 48 pt at the default size, as in
    // Latent Spaces.
    const inputMinHeight =
      displayPreferences.messageLineHeight + inputVerticalPadding;
    const collapsedInputMaxHeight =
      displayPreferences.messageLineHeight *
        loomUiTokens.composer.inputCollapsedMaxLines +
      inputVerticalPadding;
    const inputIsOverflowing =
      input.length > 0 &&
      contentHeight >
        collapsedInputMaxHeight - displayPreferences.messageLineHeight * 0.25;

    const onContentSizeChange = (
      event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
    ) => {
      setContentHeight(event.nativeEvent.contentSize.height);
    };

    const inputTextStyle = {
      fontSize: displayPreferences.messageFontSize,
      lineHeight: displayPreferences.messageLineHeight,
      ...(displayPreferences.messageFontFamily
        ? {
            fontFamily: displayPreferences.messageFontFamily,
          }
        : {}),
    };

    const { colors } = useAspenGroveTheme();

    return (
      <KeyboardStickyView
        enabled
        offset={{ closed: 0, opened: bottomInset }}
        style={[
          styles.composerSticky,
          {
            backgroundColor: 'transparent',
            backfaceVisibility: 'hidden',
          },
        ]}
      >
        <View
          testID="chat-composer"
          onLayout={onLayout}
          style={[
            styles.composerWrap,
            {
              paddingBottom: bottomInset + loomUiTokens.layout.inputBarPadding,
            },
          ]}
        >
          {editLabel ? (
            <View
              testID="chat-composer-edit-banner"
              style={[styles.editBanner, { borderColor: colors.secondary }]}
            >
              <View style={styles.editBannerTextWrap}>
                <Ionicons
                  name="create-outline"
                  size={loomUiTokens.composer.editIconSize}
                  color={colors.secondary}
                />
                <AppText
                  variant="meta"
                  tone="secondary"
                  style={styles.editBannerText}
                >
                  {editLabel}
                </AppText>
              </View>
              <Pressable
                testID="chat-composer-edit-cancel"
                onPress={onCancelEdit}
                hitSlop={loomUiTokens.composer.closeHitSlop}
              >
                <Ionicons
                  name="close"
                  size={loomUiTokens.composer.closeIconSize}
                  color={colors.secondary}
                />
              </Pressable>
            </View>
          ) : null}

          {needsAgent && !editLabel ? (
            <NeedsAgentNotice onChooseAgent={onChooseAgent} />
          ) : (
            <View style={styles.fieldShadow}>
              {isFocused ? (
                <View
                  pointerEvents="none"
                  style={[styles.focusStroke, { borderColor: colors.green }]}
                />
              ) : null}
              <MaterialView variant="systemThinDark" style={styles.field}>
                <AppInput
                  testID="chat-composer-input"
                  ref={inputRef}
                  value={input}
                  onChangeText={onChangeInput}
                  placeholder={placeholder}
                  placeholderTextColor={loomUiTokens.colors.composerPlaceholder}
                  selectionColor={colors.accentColor}
                  keyboardAppearance="dark"
                  multiline
                  editable={!sending && !loading}
                  numberOfLines={loomUiTokens.composer.inputCollapsedMaxLines}
                  scrollEnabled
                  textAlignVertical="top"
                  onContentSizeChange={onContentSizeChange}
                  onFocus={() => {
                    setIsFocused(true);
                    onInputFocus();
                  }}
                  onBlur={() => setIsFocused(false)}
                  style={[
                    styles.input,
                    inputTextStyle,
                    {
                      minHeight: inputMinHeight,
                      maxHeight: collapsedInputMaxHeight,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.inputControls,
                    inputIsOverflowing ? styles.inputControlsExpanded : null,
                  ]}
                >
                  {inputIsOverflowing ? (
                    <Pressable
                      testID="chat-composer-expand"
                      onPress={onExpandInput}
                      hitSlop={loomUiTokens.composer.closeHitSlop}
                      accessibilityLabel="Expand message input"
                      style={({ pressed }) => [
                        styles.controlButton,
                        { opacity: pressed ? 0.65 : 1 },
                      ]}
                    >
                      <MaterialIcons
                        name="open-in-full"
                        size={loomUiTokens.composer.expandIconSize}
                        color={colors.secondary}
                      />
                    </Pressable>
                  ) : null}
                  <ComposerSendButton
                    onSend={onSend}
                    canSend={canSend}
                    sending={sending}
                    hasText={input.length > 0}
                    sendLabel={sendLabel}
                    canStop={canStop}
                    stopping={stopping}
                    onStop={onStop}
                  />
                </View>
              </MaterialView>
            </View>
          )}
        </View>
      </KeyboardStickyView>
    );
  }
);

const FOCUS_STROKE_VISIBLE = loomUiTokens.composer.focusedStrokeWidth / 2;

const styles = StyleSheet.create({
  composerWrap: {
    padding: loomUiTokens.layout.inputBarPadding,
    alignItems: 'stretch',
    gap: loomUiTokens.composer.sectionGap,
  },
  editBanner: {
    minHeight: loomUiTokens.composer.editBannerMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: loomUiTokens.composer.editBannerPaddingHorizontal,
  },
  editBannerTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: loomUiTokens.composer.editBannerIconGap,
  },
  editBannerText: {
    fontSize: loomUiTokens.composer.editBannerTextSize,
    lineHeight: loomUiTokens.composer.editBannerTextLineHeight,
    flex: 1,
  },
  composerSticky: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  // The shadow sits outside the clipped material (MessageInputView.swift:51).
  fieldShadow: {
    borderRadius: loomUiTokens.composer.fieldRadius,
    shadowColor: '#000',
    shadowOpacity: loomUiTokens.composer.shadowOpacity,
    shadowRadius: loomUiTokens.composer.shadowRadius,
    shadowOffset: { width: 0, height: 0 },
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: loomUiTokens.composer.fieldRadius,
  },
  // The reference strokes a 1 pt line centered on the field's edge behind
  // the field (MessageInputView.swift:47-50), so only its outer half shows.
  focusStroke: {
    position: 'absolute',
    top: -FOCUS_STROKE_VISIBLE,
    left: -FOCUS_STROKE_VISIBLE,
    right: -FOCUS_STROKE_VISIBLE,
    bottom: -FOCUS_STROKE_VISIBLE,
    borderRadius: loomUiTokens.composer.fieldRadius + FOCUS_STROKE_VISIBLE,
    borderWidth: FOCUS_STROKE_VISIBLE,
  },
  input: {
    flex: 1,
    paddingTop: loomUiTokens.composer.textPaddingVertical,
    paddingBottom: loomUiTokens.composer.textPaddingVertical,
    paddingLeft: loomUiTokens.composer.textPaddingLeading,
    paddingRight: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  inputControls: {
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  inputControlsExpanded: {
    justifyContent: 'space-between',
  },
  controlButton: {
    padding: loomUiTokens.composer.sendButtonPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
