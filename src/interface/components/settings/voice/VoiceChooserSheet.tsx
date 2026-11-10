import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOOM_VOICES } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
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
  const { colors } = useAspenGroveTheme();
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
      <View
        testID="settings-voice-chooser"
        style={[
          styles.container,
          {
            backgroundColor: colors.oppositePrimary,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <AppText variant="ui" tone="primary" style={styles.title}>
          Choose a voice
        </AppText>
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
        <View style={styles.dots}>
          {LOOM_VOICES.map((voice, dotIndex) => (
            <View
              key={voice.name}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    dotIndex === index ? colors.primary : colors.tertiary,
                },
              ]}
            />
          ))}
        </View>
        <Pressable
          testID="settings-voice-select"
          accessibilityRole="button"
          onPress={select}
          style={({ pressed }) => [
            styles.select,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <AppText
            variant="ui"
            style={[styles.selectText, { color: colors.oppositePrimary }]}
          >
            Select
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
  },
  title: {
    alignSelf: 'center',
    marginTop: 18,
    fontSize: 17,
    fontWeight: '600',
  },
  pager: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  select: {
    marginHorizontal: 16,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  selectText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
