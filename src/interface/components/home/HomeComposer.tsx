import { useEffect, useRef, useState } from 'react';
import { StyleSheet, type TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { ComposerField } from '../chat/composer/ComposerField';
import { composerFieldMetrics } from '../chat/composer/composer-field-metrics';
import { ComposerSendButton } from '../chat/composer/ComposerSendButton';
import type { ChatDisplayPreferences } from '../chat/types';

type HomeComposerProps = {
  readonly bottomInset: number;
  readonly displayPreferences: ChatDisplayPreferences;
  /** Focus the field once, when Home first appears (HomeScreenView.swift:185-190). */
  readonly autoFocus: boolean;
  readonly creating: boolean;
  /** Starts a tree with this first message; resolves to whether it opened. */
  readonly onSubmit: (text: string) => Promise<boolean>;
  readonly onLayoutHeight: (height: number) => void;
};

/**
 * Home's "Begin a new loom tree" composer (HomeScreenView.swift:222-238):
 * the same field as the tree chat's, pinned over the bottom of the list and
 * riding the keyboard. Sending creates a tree from the message and opens it.
 */
export const HomeComposer = ({
  bottomInset,
  displayPreferences,
  autoFocus,
  creating,
  onSubmit,
  onLayoutHeight,
}: HomeComposerProps) => {
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const focusedOnce = useRef(false);
  const metrics = composerFieldMetrics(displayPreferences);

  useEffect(() => {
    if (!autoFocus || focusedOnce.current) {
      return undefined;
    }
    focusedOnce.current = true;
    const timeoutId = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timeoutId);
  }, [autoFocus]);

  const submit = async () => {
    const message = text.trim();
    if (!message || creating) {
      return;
    }
    if (await onSubmit(message)) {
      setText('');
      inputRef.current?.blur();
    }
  };

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: bottomInset }}
      style={styles.sticky}
    >
      <View
        testID="home-composer"
        onLayout={(event) => onLayoutHeight(event.nativeEvent.layout.height)}
        style={[
          styles.wrap,
          { paddingBottom: bottomInset + loomUiTokens.layout.inputBarPadding },
        ]}
      >
        <ComposerField
          testID="home-composer-input"
          inputRef={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Begin a new loom tree"
          editable={!creating}
          textStyle={metrics.textStyle}
          minHeight={metrics.minHeight}
          maxHeight={metrics.maxHeight}
          maxLines={loomUiTokens.composer.inputCollapsedMaxLines}
        >
          <ComposerSendButton
            sendTestID="home-composer-send"
            onSend={() => void submit()}
            canSend={text.trim().length > 0 && !creating}
            sending={creating}
            hasText={text.length > 0}
            sendLabel="Send"
            canStop={false}
            stopping={false}
            onStop={() => undefined}
          />
        </ComposerField>
      </View>
    </KeyboardStickyView>
  );
};

const styles = StyleSheet.create({
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrap: {
    padding: loomUiTokens.layout.inputBarPadding,
  },
});
