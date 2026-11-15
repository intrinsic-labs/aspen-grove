import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOOM_VOICES } from '@domain/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { useVoiceChooser } from './useVoiceChooser';
import { VoiceCard } from './VoiceCard';

type VoiceChooserSheetProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
};

/**
 * Latent Spaces' `LoomVoiceChooser`: a page sheet of voice cards you swipe
 * through (each one plays as it comes into view), page dots, and a Select
 * capsule that saves the voice shown.
 */
export const VoiceChooserSheet = ({
  visible,
  onClose,
}: VoiceChooserSheetProps) => {
  const insets = useSafeAreaInsets();
  const { index, savedIndex, showPage, onPressPortrait, select } =
    useVoiceChooser(visible, onClose);
  const [pageWidth, setPageWidth] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  // Open on the saved voice's page once the pager has a width.
  useEffect(() => {
    if (visible && pageWidth > 0) {
      pagerRef.current?.scrollTo({
        x: savedIndex * pageWidth,
        animated: false,
      });
    }
    // Only when opened or measured, not on every swipe.
  }, [visible, pageWidth]);

  const onPagerLayout = (event: LayoutChangeEvent) =>
    setPageWidth(event.nativeEvent.layout.width);

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (pageWidth > 0) {
      showPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* No visible title: Latent Spaces sets `navigationTitle` without a
          NavigationStack, so its sheet shows none (LoomVoiceChooser.swift:62). */}
      <View
        testID="settings-voice-chooser"
        accessibilityLabel="Choose a voice"
        style={[styles.container, { paddingBottom: insets.bottom }]}
      >
        <View style={styles.pagerArea}>
          <ScrollView
            ref={pagerRef}
            testID="settings-voice-pager"
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={onPagerLayout}
            onMomentumScrollEnd={onMomentumScrollEnd}
            style={styles.pager}
          >
            {pageWidth > 0
              ? LOOM_VOICES.map((voice) => (
                  <VoiceCard
                    key={voice.name}
                    voice={voice}
                    width={pageWidth}
                    onPressPortrait={onPressPortrait}
                  />
                ))
              : null}
          </ScrollView>
          {/* `PageTabViewStyle(indexDisplayMode: .always)` draws its dots over
              the bottom of the pages (LoomVoiceChooser.swift:27). */}
          <View pointerEvents="none" style={styles.dots}>
            {LOOM_VOICES.map((voice, dotIndex) => (
              <View
                key={voice.name}
                style={[
                  styles.dot,
                  dotIndex === index ? styles.currentDot : styles.otherDot,
                ]}
              />
            ))}
          </View>
        </View>
        <Pressable
          testID="settings-voice-select"
          accessibilityRole="button"
          onPress={select}
          style={({ pressed }) => [
            styles.select,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.selectText}>Select</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const chooser = loomUiTokens.voiceChooser;
// `VStack(spacing: 20)` between the pages and the button (LoomVoiceChooser.swift:19)
const STACK_SPACING = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: loomUiTokens.settingsForm.colors.sheetBackground,
  },
  pagerArea: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: chooser.dotsBottomGap - STACK_SPACING,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: chooser.dotGap,
  },
  dot: {
    width: chooser.dotSize,
    height: chooser.dotSize,
    borderRadius: chooser.dotSize / 2,
  },
  currentDot: {
    backgroundColor: '#FFFFFF',
  },
  otherDot: {
    backgroundColor: chooser.inactiveDot,
  },
  // White capsule, headline bold in `.padding()` (LoomVoiceChooser.swift:51-60)
  select: {
    marginTop: STACK_SPACING,
    marginHorizontal: 16,
    height: chooser.selectHeight,
    borderRadius: chooser.selectHeight / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
});
