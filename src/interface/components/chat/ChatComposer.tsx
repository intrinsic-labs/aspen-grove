import { memo, type RefObject } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { AppInput, AppText } from '@interface/ui/system';
import { loomUiTokens } from './loom-ui-tokens';

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
  readonly colors: {
    readonly line: string;
    readonly background: string;
    readonly tertiary: string;
    readonly red: string;
    readonly onSurface: string;
    readonly secondary: string;
  };
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
    colors,
  }: ChatComposerProps) => {
    const onLayout = (event: LayoutChangeEvent) => {
      onComposerLayout(event.nativeEvent.layout.height);
    };

    return (
      <KeyboardStickyView
        enabled
        offset={{ closed: 0, opened: 0 }}
        style={styles.composerSticky}
      >
        <View
          onLayout={onLayout}
          style={[
            styles.composerWrap,
            {
              borderTopColor: colors.line,
              backgroundColor: colors.background,
              paddingBottom: bottomInset + loomUiTokens.composer.bottomPadding,
            },
          ]}
        >
          {editLabel ? (
            <View style={[styles.editBanner, { borderColor: colors.line }]}>
              <View style={styles.editBannerTextWrap}>
                <Ionicons
                  name="create-outline"
                  size={loomUiTokens.composer.editIconSize}
                  color={colors.secondary}
                />
                <AppText variant="meta" tone="secondary" style={styles.editBannerText}>
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

          <View style={styles.inputRow}>
            <AppInput
              ref={inputRef}
              value={input}
              onChangeText={onChangeInput}
              placeholder={placeholder}
              style={styles.input}
              multiline
              editable={!sending && !loading}
              numberOfLines={5}
              textAlignVertical="top"
              onFocus={onInputFocus}
            />
            <Pressable
              onPress={onSend}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: canSend ? colors.red : colors.tertiary,
                  opacity: pressed ? 0.8 : 1,
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
                color={colors.onSurface}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    );
  }
);

const styles = StyleSheet.create({
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: loomUiTokens.layout.horizontalInset,
    paddingTop: loomUiTokens.composer.topPadding,
    alignItems: 'stretch',
    gap: loomUiTokens.composer.sectionGap,
  },
  editBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: loomUiTokens.composer.editBannerRadius,
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
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: loomUiTokens.composer.inputRowGap,
  },
  input: {
    flex: 1,
    minHeight: loomUiTokens.composer.inputMinHeight,
    maxHeight: loomUiTokens.composer.inputMaxHeight,
    borderRadius: loomUiTokens.composer.inputRadius,
    fontSize: loomUiTokens.composer.inputTextSize,
    lineHeight: loomUiTokens.composer.inputTextLineHeight,
    paddingTop: loomUiTokens.composer.inputVerticalPadding,
    paddingBottom: loomUiTokens.composer.inputVerticalPadding,
  },
  sendButton: {
    height: loomUiTokens.composer.sendButtonSize,
    width: loomUiTokens.composer.sendButtonSize,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
});
