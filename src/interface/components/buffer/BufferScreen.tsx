import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
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
import { BufferFixtureControls } from './BufferFixtureControls';
import { BufferSiblingControl } from './BufferSiblingControl';
import { BufferDocStats } from './BufferDocStats';
import { useBufferPreview } from './useBufferPreview';
import { BufferEditorSurface, type BufferEngine } from './BufferEditorSurface';
import type { CompositionControl } from './composition-barrier';
import { createCompositionBarrier } from './composition-barrier';
import type { BufferRenderVariant } from './BufferTextInput';
import {
  paragraphStressPreview,
  stressPreview,
} from './buffer-preview-fixture';
import {
  documentEnds,
  selectSibling,
  siblingCount,
  type PreviewDocument,
} from './buffer-preview-document';
import { materialize } from '@application/services/buffer/document-ranges';
import { samplePreview } from './buffer-preview-sample';

type BufferScreenProps = {
  readonly tree: LoomTree;
};

const { layout, control, bar } = bufferTokens;

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
  const [variant, setVariant] = useState<BufferRenderVariant>('spans');
  const [engine, setEngine] = useState<BufferEngine>('native');
  // Counts wholesale document loads (fixture, sibling switch) for the web editor.
  const [epoch, setEpoch] = useState(0);
  // Counts fixture loads only; the native input starts afresh on one.
  const [fixtureEpoch, setFixtureEpoch] = useState(0);

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

  // A document load waits for an IME composition to end (see the barrier).
  const composition = useRef<CompositionControl>({ end: () => {} }).current;
  const barrier = useMemo(
    () => createCompositionBarrier({ requestEnd: () => composition.end() }),
    [composition]
  );
  const {
    doc: preview,
    setDoc: setPreview,
    onReplace,
    onSelection,
    onComposition,
    sink,
    receipt,
    clearReceipt,
  } = useBufferPreview(barrier);
  const onSelectSibling = useCallback(
    (index: number) =>
      barrier.run(() => {
        barrier.reset();
        setPreview((state) => selectSibling(state, index));
        setEpoch((value) => value + 1);
        clearReceipt();
      }),
    [barrier, clearReceipt, setPreview]
  );
  const load = useCallback(
    (next: PreviewDocument) =>
      barrier.run(() => {
        barrier.reset();
        setPreview(next);
        setEpoch((value) => value + 1);
        setFixtureEpoch((value) => value + 1);
        clearReceipt();
      }),
    [barrier, clearReceipt, setPreview]
  );

  const { text, runs } = useMemo(
    () => materialize(preview.index),
    [preview.index]
  );
  const count = siblingCount(preview);

  return (
    <AppScreen testID="buffer-screen" style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen} enabled>
        <BufferEditorSurface
          engine={engine}
          variant={variant}
          epoch={epoch}
          fixtureEpoch={fixtureEpoch}
          text={text}
          runs={runs}
          ends={documentEnds(preview)}
          composition={composition}
          onComposition={onComposition}
          textStyle={textStyle}
          headerHeight={headerHeight}
          topGap={layout.topGap}
          onReplace={onReplace}
          onSelection={onSelection}
          sink={sink}
        />
        {engine === 'web' ? (
          <BufferDocStats length={text.length} receipt={receipt} />
        ) : null}
        {/* A multiline input has no `keyboardDismissMode` (a ScrollView prop), and
            an input accessory bar breaks double-tap word selection, so the
            empty band around the pill puts the keyboard away on a tap, as
            Home's greeting does. Android also has the back key. */}
        <Pressable
          testID="buffer-control-bar"
          onPress={Keyboard.dismiss}
          accessible={false}
          style={[
            styles.bar,
            {
              paddingBottom:
                (keyboardVisible ? 0 : insets.bottom) + bar.bottomGap,
            },
          ]}
        >
          {count > 1 ? (
            <BufferSiblingControl
              index={preview.selected}
              count={count}
              label={`Branch ${preview.selected + 1} of ${count}`}
              onSelect={onSelectSibling}
            />
          ) : text.length === 0 ? (
            <BufferFixtureControls
              variant={variant}
              engine={engine}
              onLoadSample={() => load(samplePreview())}
              onLoadStress={(length) => load(stressPreview(length))}
              onLoadParagraphs={() => load(paragraphStressPreview())}
              onVariant={setVariant}
              onEngine={setEngine}
            />
          ) : null}
        </Pressable>
      </KeyboardAvoidingView>
      <HeaderScrollEdge />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    // The pill floats in this band, centered and never full width; the
    // document above ends where the band begins, so its last line clears it.
    // Always as tall as the pill, so it is a tap target for putting the
    // keyboard away and the document does not jump when the pill appears.
    alignItems: 'center',
    minHeight: bar.topGap + control.height,
    paddingTop: bar.topGap,
  },
});
