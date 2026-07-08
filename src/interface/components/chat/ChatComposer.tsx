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
  readonly inputRef: RefObject<TextInput | null>;
  readonly onInputFocus: () => void;
  readonly onComposerLayout: (height: number) => void;
  readonly onExpandInput: () => void;
  readonly bottomInset: number;
  readonly displayPreferences: ChatDisplayPreferences;
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
    inputRef,
    onInputFocus,
    onComposerLayout,
    onExpandInput,
    bottomInset,
    displayPreferences,
  }: ChatComposerProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);

    const onLayout = (event: LayoutChangeEvent) => {
      onComposerLayout(event.nativeEvent.layout.height);
    };
    const collapsedInputMaxHeight =
      displayPreferences.messageLineHeight *
        loomUiTokens.composer.inputCollapsedMaxLines +
      loomUiTokens.composer.inputVerticalPadding * 2;
    const inputIsOverflowing =
      input.length > 0 &&
      contentHeight >
        collapsedInputMaxHeight -
          displayPreferences.messageLineHeight * 0.25;

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
          onLayout={onLayout}
          style={[
            styles.composerWrap,
            {
              paddingBottom: bottomInset + loomUiTokens.composer.bottomPadding,
            },
          ]}
        >
          {editLabel ? (
            <View
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

          <MaterialView
            variant="regular"
            style={[
              styles.inputRow,
              {
                borderWidth: 1,
                borderColor: isFocused ? colors.green : 'dark-grey',
                borderRadius: loomUiTokens.composer.inputRowRadius,
              },
            ]}
          >
            <AppInput
              ref={inputRef}
              value={input}
              onChangeText={onChangeInput}
              placeholder={placeholder}
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
                  onPress={onExpandInput}
                  hitSlop={loomUiTokens.composer.closeHitSlop}
                  accessibilityLabel="Expand message input"
                  style={({ pressed }) => [
                    styles.expandButton,
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
              <Pressable
                onPress={onSend}
                disabled={!canSend}
                accessibilityLabel={sendLabel}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: canSend ? colors.green : colors.secondary,
                    opacity: pressed ? 0.8 : 1,
                    width: loomUiTokens.composer.buttonSize,
                    height: loomUiTokens.composer.buttonSize,
                  },
                ]}
              >
                <Ionicons
                  name={
                    sending
                      ? 'ellipsis-horizontal'
                      : sendLabel === 'Save'
                        ? 'checkmark'
                        : 'arrow-up'
                  }
                  size={loomUiTokens.composer.sendIconSize}
                  color={colors.primary}
                />
              </Pressable>
            </View>
          </MaterialView>
        </View>
      </KeyboardStickyView>
    );
  }
);

const styles = StyleSheet.create({
  composerWrap: {
    // borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: loomUiTokens.layout.inputBarPadding,
    paddingTop: loomUiTokens.composer.topPadding,
    alignItems: 'stretch',
    gap: loomUiTokens.composer.sectionGap,
  },
  editBanner: {
    // borderWidth: StyleSheet.hairlineWidth,
    // borderRadius: loomUiTokens.composer.editBannerRadius,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // gap: loomUiTokens.composer.inputRowGap,
  },
  input: {
    flex: 1,
    minHeight: loomUiTokens.composer.inputMinHeight,
    // borderRadius: 20,
    fontSize: loomUiTokens.composer.inputTextSize,
    lineHeight: loomUiTokens.composer.inputTextLineHeight,
    paddingTop: loomUiTokens.composer.inputVerticalPadding,
    paddingBottom: loomUiTokens.composer.inputVerticalPadding,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputControls: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingTop: loomUiTokens.composer.inputControlEdgePadding,
    paddingRight: loomUiTokens.composer.inputControlEdgePadding,
    paddingBottom: loomUiTokens.composer.inputControlEdgePadding,
    width:
      loomUiTokens.composer.buttonSize +
      loomUiTokens.composer.inputControlEdgePadding * 2,
  },
  inputControlsExpanded: {
    justifyContent: 'space-between',
  },
  expandButton: {
    width: loomUiTokens.composer.buttonSize,
    height: loomUiTokens.composer.buttonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
});
