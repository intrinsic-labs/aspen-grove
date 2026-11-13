import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const tokens = loomUiTokens.home.header;

/**
 * Home's trailing toolbar button, `figure.wave.circle.fill` (.title, bold),
 * which pushes Settings (HomeScreenView.swift:157-163, `openSettings`). A
 * white disc with Material Community's waving figure stands in for the
 * SF Symbol.
 */
export const HomeSettingsButton = () => {
  const router = useRouter();

  return (
    <Pressable
      testID="home-settings-button"
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={8}
      onPress={() => router.push('/settings')}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.65 : 1 }]}
    >
      <View style={styles.disc}>
        <MaterialCommunityIcons
          name="human-greeting"
          size={tokens.settingsIconSize}
          color="#000"
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: tokens.settingsCircleSize,
    height: tokens.settingsCircleSize,
    borderRadius: tokens.settingsCircleSize / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
