import { useState } from 'react';
import { useVoiceMode } from '../voice';
import { InterfacePreviewSection } from './appearance/InterfacePreviewSection';
import { UserInterfaceSection } from './appearance/UserInterfaceSection';
import { useAppearanceController } from './appearance/useAppearanceController';
import {
  ApiSettingsSection,
  NewTreeSettingsSection,
} from './home/SettingsLinkSections';
import { SettingsScreenScaffold } from './SettingsScreenScaffold';
import { SettingsStatus } from './SettingsStatus';
import { VoiceChooserSheet } from './voice/VoiceChooserSheet';
import { VoiceModeSection } from './voice/VoiceModeSection';

const DEFAULT_FONT_SIZE = 17;
const DEFAULT_CORNER_RADIUS = 8;

const toNumber = (input: string, fallback: number): number => {
  const value = Number(input);
  return input.trim().length > 0 && Number.isFinite(value) ? value : fallback;
};

/**
 * Settings: Latent Spaces' one settings Form (LoomSettingsView.swift), in
 * its section order wherever Aspen Grove has the same setting. Agents and
 * Connections push their own screens; everything else is edited in place.
 */
const SettingsHomeView = () => {
  const appearance = useAppearanceController();
  const voiceMode = useVoiceMode();
  const [chooserVisible, setChooserVisible] = useState(false);

  const fontSize = toNumber(appearance.fontSizeInput, DEFAULT_FONT_SIZE);
  const cornerRadius = toNumber(
    appearance.nodeViewCornerRadiusInput,
    DEFAULT_CORNER_RADIUS
  );

  return (
    <SettingsScreenScaffold
      testID="settings-screen"
      largeTitle="Settings"
      loading={appearance.loading}
    >
      <ApiSettingsSection />
      <NewTreeSettingsSection />
      <UserInterfaceSection
        fontFace={appearance.fontFace}
        onChangeFontFace={appearance.setFontFace}
        fontSize={fontSize}
        onChangeFontSize={(size) => appearance.setFontSizeInput(String(size))}
        nodeViewStyle={appearance.nodeViewStyle}
        onChangeNodeViewStyle={appearance.setNodeViewStyle}
        cornerRadius={cornerRadius}
        onChangeCornerRadius={(radius) =>
          appearance.setNodeViewCornerRadiusInput(String(radius))
        }
        verboseErrorAlerts={appearance.verboseErrorAlerts}
        onChangeVerboseErrorAlerts={appearance.setVerboseErrorAlerts}
        autoTitleEnabled={appearance.autoTitleEnabled}
        onChangeAutoTitleEnabled={appearance.setAutoTitleEnabled}
      />
      <InterfacePreviewSection
        fontFace={appearance.fontFace}
        fontSize={fontSize}
        nodeViewStyle={appearance.nodeViewStyle}
        cornerRadius={cornerRadius}
      />
      <VoiceModeSection
        voiceModeEnabled={voiceMode.voiceModeEnabled}
        onChangeVoiceModeEnabled={voiceMode.setVoiceModeEnabled}
        voiceName={voiceMode.voice.name}
        onChooseVoice={() => setChooserVisible(true)}
      />
      <SettingsStatus
        saving={appearance.saving || voiceMode.saving}
        notice={null}
        error={appearance.error ?? voiceMode.error}
        hasValidationError={false}
      />
      <VoiceChooserSheet
        visible={chooserVisible}
        onClose={() => setChooserVisible(false)}
      />
    </SettingsScreenScaffold>
  );
};

export default SettingsHomeView;
