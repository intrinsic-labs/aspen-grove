import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import {
  greetingText,
  headerDateText,
  timeOfDaySymbol,
  type TimeOfDaySymbol,
} from './greeting';

const tokens = loomUiTokens.home;
// `.secondary` in dark mode: the system secondaryLabel.
const SECONDARY = loomUiTokens.settingsForm.colors.secondaryLabel;

// The nearest Material Community glyphs to the SF Symbols
// (DateHeaderView.swift `getTimeIcon`).
const SYMBOL_GLYPHS: Record<
  TimeOfDaySymbol,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  sun: 'weather-sunny',
  'cloud-sun': 'weather-partly-cloudy',
  'moon-stars': 'weather-night',
  'moon-zzz': 'power-sleep',
};

type DateHeaderProps = {
  readonly displayName: string | null;
};

/**
 * Latent Spaces' `DateHeaderView`: the time-of-day greeting in Cardo 36,
 * then the date with its symbol in the mono face, both centered. The time is
 * read again whenever Home comes back into view.
 */
export const DateHeader = ({ displayName }: DateHeaderProps) => {
  const { colors } = useAspenGroveTheme();
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text
        testID="home-greeting"
        accessibilityRole="header"
        // Two lines, as Latent Spaces' "Welcome to Loom." fits: "Welcome to
        // Aspen Grove." is wider, so it shrinks a little rather than wrap.
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.greeting, { color: colors.primary }]}
      >
        {greetingText(now, displayName)}
      </Text>
      <View testID="home-date" style={styles.dateLine}>
        <MaterialCommunityIcons
          name={SYMBOL_GLYPHS[timeOfDaySymbol(now)]}
          size={tokens.dateLine.iconSize}
          color={SECONDARY}
          style={styles.icon}
        />
        <Text style={[styles.dateText, { color: SECONDARY }]}>
          {headerDateText(now)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  greeting: {
    fontFamily: 'Cardo-Regular',
    fontSize: tokens.greeting.fontSize,
    lineHeight: tokens.greeting.lineHeight,
    textAlign: 'center',
    paddingTop: tokens.greeting.paddingTop,
    paddingBottom: tokens.greeting.paddingBottom,
    paddingHorizontal: 16,
    // Shrinking to fit also tightens the lines; hold the two-line block's
    // height so the date and the list stay where Latent Spaces has them.
    minHeight:
      tokens.greeting.paddingTop +
      tokens.greeting.lineHeight * 2 +
      tokens.greeting.paddingBottom,
  },
  dateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.dateLine.iconGap,
    paddingBottom: tokens.dateLine.paddingBottom,
  },
  icon: {
    paddingHorizontal: tokens.dateLine.iconPaddingHorizontal,
  },
  dateText: {
    fontFamily: tokens.dateLine.fontFamily,
    fontSize: tokens.dateLine.fontSize,
    lineHeight: tokens.dateLine.lineHeight,
  },
});
