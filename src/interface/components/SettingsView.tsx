import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { AppScreen, SettingsList } from '../ui/value-objects';
import {
  AppBehaviorSection,
  GenerationDefaultsSection,
  MessageTypographySection,
  OpenRouterSettingsSection,
  SettingsStatus,
  useSettingsController,
} from './settings';

const SettingsView = () => {
  const { colors, isDark } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const controller = useSettingsController();

  const switchOffTrack = isDark
    ? 'rgba(255, 255, 255, 0.22)'
    : 'rgba(0, 0, 0, 0.22)';

  return (
    <AppScreen>
      {controller.loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          enabled
          bottomOffset={Platform.OS === 'ios' ? 62 : 0}
          extraKeyboardSpace={0}
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <SettingsList>
            <OpenRouterSettingsSection
              apiKeyStatusText={controller.apiKeyStatusText}
              apiKeyInput={controller.apiKeyInput}
              onChangeApiKeyInput={controller.setApiKeyInput}
              showApiKey={controller.showApiKey}
              onToggleShowApiKey={() =>
                controller.setShowApiKey((visible) => !visible)
              }
              modelIdentifierInput={controller.modelIdentifierInput}
              onChangeModelIdentifierInput={controller.setModelIdentifierInput}
              colors={colors}
            />

            <GenerationDefaultsSection
              temperatureInput={controller.temperatureInput}
              onChangeTemperatureInput={controller.setTemperatureInput}
              maxTokensInput={controller.maxTokensInput}
              onChangeMaxTokensInput={controller.setMaxTokensInput}
              systemPromptInput={controller.systemPromptInput}
              onChangeSystemPromptInput={controller.setSystemPromptInput}
            />

            <MessageTypographySection
              fontFace={controller.fontFace}
              onChangeFontFace={controller.setFontFace}
              fontSizeInput={controller.fontSizeInput}
              onChangeFontSizeInput={controller.setFontSizeInput}
              nodeViewStyle={controller.nodeViewStyle}
              onChangeNodeViewStyle={controller.setNodeViewStyle}
              nodeViewCornerRadiusInput={controller.nodeViewCornerRadiusInput}
              onChangeNodeViewCornerRadiusInput={
                controller.setNodeViewCornerRadiusInput
              }
              colors={colors}
            />

            <AppBehaviorSection
              verboseErrorAlerts={controller.verboseErrorAlerts}
              onChangeVerboseErrorAlerts={controller.setVerboseErrorAlerts}
              switchOffTrack={switchOffTrack}
              colors={colors}
            />

            <SettingsStatus
              saving={controller.saving}
              notice={controller.notice}
              error={controller.error}
              hasValidationError={controller.hasValidationError}
            />
          </SettingsList>
        </KeyboardAwareScrollView>
      )}

      {Platform.OS === 'ios' && !controller.loading ? (
        <KeyboardToolbar insets={{ left: insets.left, right: insets.right }}>
          <KeyboardToolbar.Prev />
          <KeyboardToolbar.Next />
          <KeyboardToolbar.Done text="Close" />
        </KeyboardToolbar>
      ) : null}
    </AppScreen>
  );
};

export default SettingsView;

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
});
