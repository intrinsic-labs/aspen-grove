import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { useSheetBarTopInset } from '../sheet/useSheetBarTopInset';

const header = loomUiTokens.sheetHeader;

type SheetButton = {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  /** Shows a spinner in place of the label. */
  readonly busy?: boolean;
  readonly testID?: string;
};

type FormSheetHeaderProps = {
  readonly title: string;
  /** A text button, or your own control (a glass icon button with a menu). */
  readonly leading?: SheetButton | ReactNode;
  readonly trailing?: SheetButton | ReactNode;
};

const isSheetButton = (value: unknown): value is SheetButton =>
  typeof value === 'object' &&
  value !== null &&
  'label' in value &&
  'onPress' in value;

const Side = ({ item }: { readonly item: SheetButton | ReactNode }) =>
  isSheetButton(item) ? <GlassButton button={item} /> : <>{item}</>;

const GlassButton = ({ button }: { readonly button: SheetButton }) => (
  <Pressable
    testID={button.testID}
    onPress={button.onPress}
    disabled={button.disabled || button.busy}
    accessibilityRole="button"
    accessibilityLabel={button.label}
    hitSlop={6}
    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
  >
    <GlassView
      glassEffectStyle="regular"
      colorScheme="dark"
      isInteractive
      style={styles.glass}
    >
      {button.busy ? (
        <ActivityIndicator color={loomUiTokens.colors.primary} />
      ) : (
        <Text
          style={[styles.buttonText, button.disabled ? styles.disabled : null]}
        >
          {button.label}
        </Text>
      )}
    </GlassView>
  </Pressable>
);

/**
 * A sheet's navigation bar as iOS 26 draws it in Latent Spaces: Cancel and
 * Save as glass capsules either side of a semibold title
 * (APIKeySettingsView.swift:117-130). On Android it keeps itself below the
 * status bar (`useSheetBarTopInset`), so a modal screen drawing it, such as
 * the agent editor or the Connections sheet, needs nothing of its own.
 */
export const FormSheetHeader = ({
  title,
  leading,
  trailing,
}: FormSheetHeaderProps) => {
  // Below Android's status bar when the sheet is a full-screen screen.
  const topInset = useSheetBarTopInset();
  return (
    <View
      style={[
        styles.bar,
        topInset > 0
          ? {
              paddingTop: header.topPadding + topInset,
              minHeight: header.topPadding + header.buttonHeight + topInset,
            }
          : null,
      ]}
    >
      <View style={styles.side}>
        {leading ? <Side item={leading} /> : null}
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={[styles.side, styles.trailing]}>
        {trailing ? <Side item={trailing} /> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: header.topPadding,
    paddingHorizontal: header.sideInset,
    minHeight: header.topPadding + header.buttonHeight,
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
  trailing: {
    alignItems: 'flex-end',
  },
  glass: {
    height: header.buttonHeight,
    minWidth: header.buttonHeight,
    paddingHorizontal: header.buttonPaddingHorizontal,
    borderRadius: header.buttonHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: header.textSize,
    color: loomUiTokens.colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
  title: {
    fontSize: header.textSize,
    fontWeight: '600',
    color: loomUiTokens.colors.primary,
    textAlign: 'center',
    flexShrink: 1,
  },
});
