import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText } from '@/interface/ui/value-objects';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';

type BufferSiblingControlProps = {
  /** Zero-based position among the siblings. */
  readonly index: number;
  readonly count: number;
  /** Mono label, e.g. "Branch 1 of 2". */
  readonly label: string;
  readonly onSelect: (index: number) => void;
};

const { control } = bufferTokens;

/**
 * Compact previous/next control for a position's alternative endings. Works
 * by tap, by a horizontal swipe on the label, and as one adjustable
 * accessibility element (increment and decrement).
 */
export const BufferSiblingControl = ({
  index,
  count,
  label,
  onSelect,
}: BufferSiblingControlProps) => {
  const canPrevious = index > 0;
  const canNext = index < count - 1;
  const previous = () => canPrevious && onSelect(index - 1);
  const next = () => canNext && onSelect(index + 1);

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy),
        onPanResponderRelease: (_, { dx }) => {
          if (dx <= -control.swipeDistance && index < count - 1) {
            onSelect(index + 1);
          } else if (dx >= control.swipeDistance && index > 0) {
            onSelect(index - 1);
          }
        },
      }),
    [count, index, onSelect]
  );

  return (
    <View
      testID="buffer-branch-control"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Branch"
      accessibilityValue={{ text: label }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') next();
        if (event.nativeEvent.actionName === 'decrement') previous();
      }}
      style={styles.row}
    >
      <Step
        testID="buffer-branch-prev"
        icon="chevron-back"
        enabled={canPrevious}
        onPress={previous}
      />
      <View {...swipe.panHandlers} style={styles.labelWrap}>
        <AppText
          testID="buffer-branch-value"
          variant="mono"
          tone="secondary"
          style={styles.label}
        >
          {label}
        </AppText>
      </View>
      <Step
        testID="buffer-branch-next"
        icon="chevron-forward"
        enabled={canNext}
        onPress={next}
      />
    </View>
  );
};

type StepProps = {
  readonly testID: string;
  readonly icon: 'chevron-back' | 'chevron-forward';
  readonly enabled: boolean;
  readonly onPress: () => void;
};

const Step = ({ testID, icon, enabled, onPress }: StepProps) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={!enabled}
    accessible={false}
    importantForAccessibility="no"
    hitSlop={control.hitSlop}
    style={[styles.step, !enabled && styles.stepDisabled]}
  >
    <Ionicons name={icon} size={control.iconSize} color={control.iconColor} />
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: control.gap,
    minHeight: control.height,
  },
  labelWrap: {
    minWidth: control.labelMinWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: control.height,
  },
  label: { fontSize: control.labelSize },
  step: {
    width: control.stepSize,
    height: control.stepSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.3 },
});
