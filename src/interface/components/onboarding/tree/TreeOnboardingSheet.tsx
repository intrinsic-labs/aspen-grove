import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { OnboardingItemRow } from '../intro/OnboardingItemRow';
import { OnboardingButton } from '../OnboardingButton';
import { TREE_ONBOARDING_ITEMS } from './tree-onboarding-items';

const onboarding = loomUiTokens.onboarding;
const tree = onboarding.tree;

type TreeOnboardingSheetProps = {
  readonly visible: boolean;
  /** Begin: the tips are read. */
  readonly onBegin: () => void;
  /** Swiped away. */
  readonly onDismiss: () => void;
};

/**
 * "Loom Trees / Getting Started" (LoomTreeOnboarding.swift): a sheet on the
 * first tree with three tips and a Begin capsule.
 */
export const TreeOnboardingSheet = ({
  visible,
  onBegin,
  onDismiss,
}: TreeOnboardingSheetProps) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View testID="tree-onboarding-sheet" style={styles.sheet}>
        <View style={styles.spacer} />
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Loom Trees
          </Text>
          <Text style={styles.subtitle}>Getting Started</Text>
        </View>
        <View style={styles.spacer} />
        <View style={styles.items}>
          {TREE_ONBOARDING_ITEMS.map((item) => (
            <OnboardingItemRow
              key={item.icon}
              icon={item.icon}
              text={item.text}
            />
          ))}
        </View>
        <View style={styles.spacer} />
        <View style={{ paddingBottom: insets.bottom }}>
          <OnboardingButton
            testID="tree-onboarding-begin"
            label="Begin"
            prominent
            onPress={onBegin}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: onboarding.background,
  },
  spacer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: tree.subtitleGap,
  },
  title: {
    fontFamily: 'Cardo-Regular',
    fontSize: tree.titleSize,
    lineHeight: tree.titleLineHeight,
    color: '#FFFFFF',
    paddingBottom: tree.titleBottomPadding,
  },
  subtitle: {
    fontFamily: tree.subtitleFontFamily,
    fontSize: tree.subtitleSize,
    lineHeight: tree.subtitleLineHeight,
    color: tree.subtitleColor,
    textAlign: 'center',
    paddingHorizontal: onboarding.page.paddingHorizontal,
  },
  items: {
    gap: onboarding.page.itemGap,
    paddingHorizontal: onboarding.page.paddingHorizontal,
    paddingBottom: tree.itemsBottomPadding,
  },
});
