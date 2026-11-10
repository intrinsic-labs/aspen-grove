import { useState } from 'react';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { useVoiceMode } from '../../voice';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';
import { VoiceChooserSheet } from '../voice/VoiceChooserSheet';
import { VoiceModeSection } from '../voice/VoiceModeSection';

const VoiceSettingsScreen = () => {
  const { isDark } = useAspenGroveTheme();
  const voiceMode = useVoiceMode();
  const [chooserVisible, setChooserVisible] = useState(false);

  const switchOffTrack = isDark
    ? 'rgba(255, 255, 255, 0.22)'
    : 'rgba(0, 0, 0, 0.22)';

  return (
    <SettingsScreenScaffold
      testID="settings-voice-screen"
      loading={voiceMode.loading}
    >
      <VoiceModeSection
        voiceModeEnabled={voiceMode.voiceModeEnabled}
        onChangeVoiceModeEnabled={voiceMode.setVoiceModeEnabled}
        voiceName={voiceMode.voice.name}
        onChooseVoice={() => setChooserVisible(true)}
        switchOffTrack={switchOffTrack}
      />
      <SettingsStatus
        saving={voiceMode.saving}
        notice={null}
        error={voiceMode.error}
        hasValidationError={false}
      />
      <VoiceChooserSheet
        visible={chooserVisible}
        onClose={() => setChooserVisible(false)}
      />
    </SettingsScreenScaffold>
  );
};

export default VoiceSettingsScreen;
