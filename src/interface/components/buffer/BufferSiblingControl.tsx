import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText } from '@/interface/ui/value-objects';
import { branchDots } from './branch-dots';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';

type BufferSiblingControlProps = {
  /** Zero-based position among the siblings. */
  readonly index: number;
  readonly count: number;
  /** Mono label, e.g. "Branch 1 of 2". */
  readonly label: string;
  readonly onSelect: (index: number) => void;
};

const { control, dots } = bufferTokens;

/**
 * Floating pill with previous/next chevrons, a mono label and one dot per
 * sibling (capped). It is the compact control for a position's alternative endings. Works
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
      accessibilityHint="Swipe up or down to switch to another ending of this text"
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') next();
        if (event.nativeEvent.actionName === 'decrement') previous();
      }}
      style={styles.pill}
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
          style={styles.label}
        >
          {label}
        </AppText>
        <Dots count={count} index={index} />
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
    style={styles.step}
  >
    <Ionicons
      name={icon}
      size={control.iconSize}
      color={enabled ? control.iconColor : control.iconColorDisabled}
    />
  </Pressable>
);

const Dots = ({ count, index }: { count: number; index: number }) => {
  const { visible, activeSlot } = branchDots(count, index, dots.max);
  return (
    <View testID="buffer-branch-dots" style={styles.dots}>
      {Array.from({ length: visible }, (_, slot) => (
        <View
          key={slot}
          style={[styles.dot, slot === activeSlot && styles.dotActive]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: control.gap,
    height: control.height,
    paddingHorizontal: control.paddingHorizontal,
    borderRadius: control.radius,
    backgroundColor: control.fill,
    shadowColor: control.shadowColor,
    shadowOpacity: control.shadowOpacity,
    shadowRadius: control.shadowRadius,
    shadowOffset: { width: 0, height: control.shadowOffsetY },
    elevation: control.elevation,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: control.height,
    paddingHorizontal: control.labelPaddingHorizontal,
  },
  label: { fontSize: control.labelSize, color: control.labelColor },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dots.gap,
    marginLeft: dots.marginLeft,
  },
  dot: {
    width: dots.size,
    height: dots.size,
    borderRadius: dots.size / 2,
    backgroundColor: dots.color,
  },
  dotActive: { backgroundColor: dots.activeColor },
  step: {
    width: control.stepSize,
    height: control.stepSize,
    borderRadius: control.stepSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
