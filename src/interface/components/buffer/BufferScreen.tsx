import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  KeyboardAvoidingView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { useHeaderHeight, useNavigation } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LoomTree } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { HeaderScrollEdge } from '@/interface/ui/components/header/HeaderScrollEdge';
import { AppScreen, AppText } from '@/interface/ui/value-objects';
import { messageFontFamily } from '@/interface/ui/value-objects/fonts';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import { useDialogueDisplayPreferences } from '../chat/useDialogueDisplayPreferences';
import { BufferSiblingControl } from './BufferSiblingControl';
import { BufferTextInput } from './BufferTextInput';
import {
  applyPreviewEdit,
  emptyPreview,
  previewRuns,
  previewText,
  samplePreview,
  selectPreviewSibling,
  siblingCount,
  type PreviewEdit,
} from './buffer-preview';

type BufferScreenProps = {
  readonly tree: LoomTree;
};

const { layout, colors, control } = bufferTokens;

/**
 * A buffer-mode tree: continuous prose, no message boundaries. In this
 * developer preview the text lives in memory only (nothing typed here is
 * saved yet), and an empty buffer can load a review sample: a human opening,
 * two model endings and a human word inside model text.
 */
export const BufferScreen = ({ tree }: BufferScreenProps) => {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const { repositories } = useAppServices();
  const { preferences } = useDialogueDisplayPreferences({
    userPreferencesRepo: repositories.userPreferencesRepo,
  });
  const [preview, setPreview] = useState(emptyPreview);

  useLayoutEffect(() => {
    navigation.setOptions({ title: tree.title ?? 'Buffer' });
  }, [navigation, tree.title]);

  const textStyle = useMemo(
    () => ({
      fontFamily: messageFontFamily(preferences.messageFontFamily),
      fontSize: preferences.messageFontSize,
      lineHeight: preferences.messageFontSize * layout.lineHeightRatio,
    }),
    [preferences.messageFontFamily, preferences.messageFontSize]
  );

  const onReplace = useCallback(
    (edit: PreviewEdit) => setPreview((state) => applyPreviewEdit(state, edit)),
    []
  );
  const onSelectSibling = useCallback(
    (index: number) =>
      setPreview((state) => selectPreviewSibling(state, index)),
    []
  );

  const text = previewText(preview);
  const count = siblingCount(preview);

  return (
    <AppScreen testID="buffer-screen" style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen} enabled>
        <BufferTextInput
          text={text}
          runs={previewRuns(preview)}
          editable
          textStyle={textStyle}
          topInset={headerHeight + layout.topGap}
          placeholder="Start writing"
          onReplace={onReplace}
        />
        <View
          testID="buffer-control-bar"
          style={[
            styles.bar,
            { paddingBottom: keyboardVisible ? 0 : insets.bottom },
          ]}
        >
          {count > 1 ? (
            <BufferSiblingControl
              index={preview.index}
              count={count}
              label={`Branch ${preview.index + 1} of ${count}`}
              onSelect={onSelectSibling}
            />
          ) : text.length === 0 ? (
            <Pressable
              testID="buffer-load-sample"
              onPress={() => setPreview(samplePreview())}
              hitSlop={control.hitSlop}
              style={styles.sample}
            >
              <AppText
                variant="mono"
                tone="secondary"
                style={styles.sampleText}
              >
                Load sample
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <HeaderScrollEdge />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    minHeight: control.height,
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.controlDivider,
  },
  sample: {
    minHeight: control.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleText: { fontSize: control.labelSize },
});
