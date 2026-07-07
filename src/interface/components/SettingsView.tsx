import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAspenGroveTheme } from '../hooks/useAspenGroveTheme';
import { AppScreen, SettingsList } from '../ui/value-objects';
import {
  AgentsSection,
  AppBehaviorSection,
  ConnectionsSection,
  MessageTypographySection,
  SettingsStatus,
  useAppearanceController,
  useConnectionsController,
} from './settings';

const SettingsView = () => {
  const { colors, isDark } = useAspenGroveTheme();
  const insets = useSafeAreaInsets();
  const connections = useConnectionsController();
  const appearance = useAppearanceController();

  const loading = connections.loading || appearance.loading;
  const saving = connections.saving || appearance.saving;
  const error = connections.error ?? appearance.error;

  const switchOffTrack = isDark
    ? 'rgba(255, 255, 255, 0.22)'
    : 'rgba(0, 0, 0, 0.22)';

  return (
    <AppScreen>
      {loading ? (
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
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
        >
          <SettingsList>
            <AgentsSection colors={colors} />

            <ConnectionsSection
              controller={connections}
              switchOffTrack={switchOffTrack}
              colors={colors}
            />

            <MessageTypographySection
              fontFace={appearance.fontFace}
              onChangeFontFace={appearance.setFontFace}
              fontSizeInput={appearance.fontSizeInput}
              onChangeFontSizeInput={appearance.setFontSizeInput}
              nodeViewStyle={appearance.nodeViewStyle}
              onChangeNodeViewStyle={appearance.setNodeViewStyle}
              nodeViewCornerRadiusInput={appearance.nodeViewCornerRadiusInput}
              onChangeNodeViewCornerRadiusInput={
                appearance.setNodeViewCornerRadiusInput
              }
              colors={colors}
            />

            <AppBehaviorSection
              verboseErrorAlerts={appearance.verboseErrorAlerts}
              onChangeVerboseErrorAlerts={appearance.setVerboseErrorAlerts}
              switchOffTrack={switchOffTrack}
              colors={colors}
            />

            <SettingsStatus
              saving={saving}
              notice={null}
              error={error}
              hasValidationError={false}
            />
          </SettingsList>
        </KeyboardAwareScrollView>
      )}

      {Platform.OS === 'ios' && !loading ? (
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
