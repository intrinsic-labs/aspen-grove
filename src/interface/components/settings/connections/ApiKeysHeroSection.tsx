import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import {
  FormSection,
  formText,
  useFormColors,
} from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const hero = loomUiTokens.apiKeysHero;

/**
 * Only what is true of Aspen Grove: keys go to `expo-secure-store` with its
 * defaults (iOS Keychain, readable while unlocked, not iCloud-synchronizable)
 * and to the provider itself. Latent Spaces' AES-GCM and biometric claims do
 * not apply here, and default Keychain items can ride in an encrypted device
 * backup, so there is no "no backups" claim either.
 */
const BULLETS = [
  'Secure storage in the iOS Keychain',
  'Never synced to iCloud Keychain',
  'Sent only to the provider it belongs to',
  'No Aspen Grove server in between',
  'iOS app sandboxing',
] as const;

/** The API Keys page's opening card (APIKeySettingsView.swift:20-52). */
export const ApiKeysHeroSection = () => {
  const colors = useFormColors();
  return (
    <FormSection testID="connections-hero">
      <View style={styles.hero}>
        {/* lock.shield.fill */}
        <Ionicons
          name="shield-checkmark"
          size={hero.iconSize}
          color={loomUiTokens.colors.accentColor}
          style={styles.icon}
        />
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
    color: '#FFFFFF',
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
