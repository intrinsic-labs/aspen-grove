import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const hero = loomUiTokens.exportSheet;

/**
 * The sheet's opening row (OpenLoomExportSheet.swift:30-60): the white tree
 * in a green circle, "Generate OpenLoom Tree" in Cardo, and the note that
 * nothing here changes the saved tree.
 */
export const ExportSheetHero = () => (
  <View style={styles.hero}>
    <View style={styles.circle}>
      {/* SF Symbol `tree`; no SF Symbols module in the build. */}
      <MaterialCommunityIcons
        name="tree-outline"
        size={hero.iconSize}
        color="#FFFFFF"
      />
    </View>
    <Text style={styles.title}>Generate OpenLoom Tree</Text>
    <Text style={styles.note}>
      {'Changes made here will not affect\nyour saved loom tree.'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    padding: hero.heroPadding,
  },
  circle: {
    width: hero.circleSize,
    height: hero.circleSize,
    borderRadius: hero.circleSize / 2,
    backgroundColor: loomUiTokens.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Cardo-Regular',
    fontSize: hero.titleSize,
    lineHeight: hero.titleLineHeight,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: hero.titleTopGap,
    marginBottom: hero.titleBottomGap,
  },
  note: {
    fontFamily: hero.noteFontFamily,
    fontSize: hero.noteSize,
    lineHeight: hero.noteLineHeight,
    color: loomUiTokens.settingsForm.colors.secondaryLabel,
    textAlign: 'center',
  },
});
