import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  FormSection,
  formText,
  useFormColors,
} from '@/interface/ui/components/form';
import { SymbolIcon } from '@/interface/ui/components/SymbolIcon';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { keyStorageCopy } from './key-storage-copy';

const hero = loomUiTokens.apiKeysHero;

// Platform-correct: where expo-secure-store keeps the key (key-storage-copy).
const BULLETS = keyStorageCopy(Platform.OS).bullets;

/** The API Keys page's opening card (APIKeySettingsView.swift:20-52). */
export const ApiKeysHeroSection = () => {
  const colors = useFormColors();
  return (
    <FormSection testID="connections-hero">
      <View style={styles.hero}>
        <View style={styles.icon}>
          <SymbolIcon
            name="lock.shield.fill"
            fallback="shield-checkmark"
            size={hero.iconSize}
            color={loomUiTokens.colors.accentColor}
          />
        </View>
        <Text style={styles.title}>
          Aspen Grove keeps your API keys on your device.
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <Text style={[formText.body, styles.bullets]}>
          {BULLETS.map((bullet) => `• ${bullet}`).join('\n')}
        </Text>
      </View>
    </FormSection>
  );
};

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: loomUiTokens.settingsForm.rowPaddingHorizontal,
    paddingVertical: hero.rowVerticalPadding,
    alignItems: 'center',
  },
  icon: {
    marginTop: hero.iconTopPadding,
  },
  title: {
    fontFamily: 'Cardo-Regular',
    fontSize: hero.titleSize,
    color: loomUiTokens.colors.primary,
    textAlign: 'center',
    paddingVertical: hero.titleVerticalPadding,
  },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth * 3,
  },
  // A multi-line Text in a centered VStack: the block is as wide as its
  // longest line and centered, its lines left-aligned.
  bullets: {
    alignSelf: 'center',
    paddingVertical: hero.bulletsVerticalPadding,
  },
});
