import type { LoomVoiceName } from '@domain/value-objects';
import {
  FormButtonRow,
  FormLabel,
  FormRow,
  FormSection,
  FormToggleRow,
} from '@/interface/ui/components/form';

/** LoomSettingsView.swift:322-326, with Aspen Grove's speech engine named. */
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
};

/**
 * Latent Spaces' "Voice Mode" section (LoomSettingsView.swift:302-327): the
 * toggle, the current voice and a Choose Voice button for the chooser sheet.
 */
export const VoiceModeSection = ({
  voiceModeEnabled,
  onChangeVoiceModeEnabled,
  voiceName,
  onChooseVoice,
}: VoiceModeSectionProps) => (
  <FormSection
    testID="settings-voice-section"
    header="Voice Mode"
    footer={FOOTER}
  >
    <FormToggleRow
      testID="settings-voice-mode-toggle"
      title="Voice Mode (beta)"
      value={voiceModeEnabled}
      onValueChange={onChangeVoiceModeEnabled}
    />
    {/* person.crop.square */}
    <FormRow testID="settings-voice-current" separatorInset="icon">
      <FormLabel title={`Current voice: ${voiceName}`} icon="person-outline" />
    </FormRow>
    {/* person.crop.square.on.square.angled */}
    <FormButtonRow
      testID="settings-voice-choose"
      title="Choose Voice"
      icon="people-outline"
      onPress={onChooseVoice}
    />
  </FormSection>
);
