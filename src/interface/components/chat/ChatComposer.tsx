import { memo, type RefObject, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
    bottomInset,
    displayPreferences,
  }: ChatComposerProps) => {
    const [isFocused, setIsFocused] = useState(false);

    const onLayout = (event: LayoutChangeEvent) => {
      onComposerLayout(event.nativeEvent.layout.height);
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

    const theme = useAspenGroveTheme();
    const { colors } = theme;

    return (
      <KeyboardStickyView
        enabled
        offset={{ closed: 0, opened: 0 }}
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
                borderRadius: theme.styles.composer.borderRadius,
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
              numberOfLines={5}
              textAlignVertical="top"
              onFocus={() => {
                setIsFocused(true);
                onInputFocus();
              }}
              onBlur={() => setIsFocused(false)}
              style={[styles.input, inputTextStyle]}
            />
            <Pressable
              onPress={onSend}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: canSend ? colors.green : colors.secondary,
                  opacity: pressed ? 0.8 : 1,
                  width: theme.styles.composer.buttonSize,
                  height: theme.styles.composer.buttonSize,
                  margin: 10,
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
    alignItems: 'center',
    // gap: loomUiTokens.composer.inputRowGap,
  },
  input: {
    flex: 1,
    minHeight: loomUiTokens.composer.inputMinHeight,
    maxHeight: loomUiTokens.composer.inputMaxHeight,
    // borderRadius: 20,
    fontSize: loomUiTokens.composer.inputTextSize,
    lineHeight: loomUiTokens.composer.inputTextLineHeight,
    paddingTop: loomUiTokens.composer.inputVerticalPadding,
    paddingBottom: loomUiTokens.composer.inputVerticalPadding,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  sendButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
});
