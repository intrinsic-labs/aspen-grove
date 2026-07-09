import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { useAppearanceController } from '../appearance/useAppearanceController';
import { MessageTypographySection } from '../MessageTypographySection';
import { SettingsScreenScaffold } from '../SettingsScreenScaffold';
import { SettingsStatus } from '../SettingsStatus';

const TypographySettingsScreen = () => {
  const { colors } = useAspenGroveTheme();
  const appearance = useAppearanceController();

  return (
    <SettingsScreenScaffold loading={appearance.loading}>
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
      <SettingsStatus
        saving={appearance.saving}
        notice={null}
        error={appearance.error}
        hasValidationError={false}
      />
    </SettingsScreenScaffold>
  );
};

export default TypographySettingsScreen;
