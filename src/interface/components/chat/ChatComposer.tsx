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
import { AppInput } from '@interface/ui/system';

type ChatComposerProps = {
  readonly input: string;
  readonly onChangeInput: (value: string) => void;
  readonly onSend: () => void;
  readonly canSend: boolean;
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
  };
};

export const ChatComposer = memo(
  ({
    input,
    onChangeInput,
    onSend,
    canSend,
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
              paddingBottom: bottomInset + 8,
            },
          ]}
        >
          <AppInput
            ref={inputRef}
            value={input}
            onChangeText={onChangeInput}
            placeholder="Send a message..."
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
              name={sending ? 'ellipsis-horizontal' : 'arrow-up'}
              size={18}
              color={colors.onSurface}
            />
          </Pressable>
        </View>
      </KeyboardStickyView>
    );
  }
);

const styles = StyleSheet.create({
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  composerSticky: {
    width: '100%',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 8,
    fontSize: 17,
    lineHeight: 27,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendButton: {
    height: 44,
    width: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
});
