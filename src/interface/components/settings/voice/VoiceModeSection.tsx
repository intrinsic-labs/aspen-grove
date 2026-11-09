import { Pressable, StyleSheet, Switch, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { LoomVoiceName } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import {
  AppText,
  SettingsInlineRow,
  SettingsSection,
} from '@/interface/ui/value-objects';

const FOOTER =
  'With Voice Mode (beta) enabled, LLM responses will be spoken aloud once they are fully generated. ' +
  'You can double tap any message to listen to it, and tap it again to stop speech. ' +
  'Use the dictation button on your keyboard to speak to the model.\n\n' +
  "Voice Mode (beta) uses your device's built-in speech synthesizer to generate text-to-speech on device.";

type VoiceModeSectionProps = {
  readonly voiceModeEnabled: boolean;
  readonly onChangeVoiceModeEnabled: (enabled: boolean) => void;
  readonly voiceName: LoomVoiceName;
  readonly onChooseVoice: () => void;
  readonly switchOffTrack: string;
};

/**
 * Latent Spaces' "Voice Mode" settings section: the switch, the current
 * voice and a Choose Voice button that opens the voice chooser.
 */
export const VoiceModeSection = ({
  voiceModeEnabled,
  onChangeVoiceModeEnabled,
  voiceName,
  onChooseVoice,
  switchOffTrack,
}: VoiceModeSectionProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <SettingsSection
      testID="settings-voice-section"
      title="Voice Mode"
      footer={FOOTER}
    >
      <SettingsInlineRow
        label="Voice Mode (beta)"
        trailing={
          <Switch
            testID="settings-voice-mode-toggle"
            value={voiceModeEnabled}
            onValueChange={onChangeVoiceModeEnabled}
            trackColor={{ false: switchOffTrack, true: colors.accentColor }}
            thumbColor={colors.onSurface}
          />
        }
      />
      <View testID="settings-voice-current" style={styles.labelRow}>
        <Ionicons name="person-outline" size={20} color={colors.accentColor} />
        <AppText variant="ui" tone="primary" style={styles.labelText}>
          {`Current voice: ${voiceName}`}
        </AppText>
      </View>
      <Pressable
        testID="settings-voice-choose"
        accessibilityRole="button"
        onPress={onChooseVoice}
        style={({ pressed }) => [
          styles.labelRow,
          { opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <Ionicons name="people-outline" size={20} color={colors.accentColor} />
        <AppText variant="ui" tone="accent" style={styles.labelText}>
          Choose Voice
        </AppText>
      </Pressable>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  labelText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});
