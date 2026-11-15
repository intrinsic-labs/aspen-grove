import { memo, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import { nextFrameIndex, thinkingText } from './thinking-indicator-frames';

const tokens = loomUiTokens.thinkingIndicator;

/**
 * Latent Spaces' thinking indicator (ThinkingIndicator.swift): a 0 bouncing
 * along a row of dots. Mount it while a request is in flight; the timer runs
 * only while it is mounted. With reduce motion on, it holds still.
 */
export const ThinkingIndicator = memo(() => {
  const { colors } = useAspenGroveTheme();
  // null until the first tick, which shows `initialText`.
  const [index, setIndex] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const timer = setInterval(
      () => setIndex((current) => nextFrameIndex(current ?? 0)),
      tokens.intervalMs
    );
    return () => clearInterval(timer);
  }, [reduceMotion]);

  return (
    <View
      testID="chat-thinking-indicator"
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Thinking"
    >
      <Text
        style={[styles.text, { color: colors.secondary }]}
        allowFontScaling={false}
      >
        {thinkingText(index, reduceMotion)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.paddingHorizontal,
    paddingBottom: tokens.paddingBottom,
  },
  text: {
    fontFamily: tokens.fontFamily,
    fontSize: tokens.fontSize,
    lineHeight: tokens.lineHeight,
  },
});
