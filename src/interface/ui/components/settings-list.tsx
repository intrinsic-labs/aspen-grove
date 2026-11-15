import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Slider from '@react-native-community/slider';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppSwitch } from './AppSwitch';
import { AppText } from './primitives';

type SettingsListProps = {
  readonly children: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
  /** Forwarded to the host View. */
  readonly testID?: string;
};

export const SettingsList = ({
  children,
  style,
  testID,
}: SettingsListProps) => (
  <View testID={testID} style={[styles.list, style]}>
    {children}
  </View>
);

type SettingsSectionProps = {
  readonly title?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
  /** Forwarded to the section's host View. */
  readonly testID?: string;
};

/**
 * A flat settings section: system-font header, rows separated by hairline
 * dividers, optional footer. Deliberately boring — no cards, no outlines.
 */
export const SettingsSection = ({
  title,
  footer,
  children,
  style,
  testID,
}: SettingsSectionProps) => {
  const items = Children.toArray(children).filter(Boolean);
  const dividerColor = 'rgba(255, 255, 255, 0.12)';

  return (
    <View testID={testID} style={[styles.section, style]}>
      {title ? (
        <AppText variant="ui" tone="secondary" style={styles.sectionHeader}>
          {title}
        </AppText>
      ) : null}

      <View>
        {items.map((item, index) => (
          <Fragment key={index}>
            {item}
            {index < items.length - 1 ? (
              <View
                style={[styles.rowDivider, { backgroundColor: dividerColor }]}
              />
            ) : null}
          </Fragment>
        ))}
      </View>

      {footer ? (
        <AppText variant="meta" tone="muted" style={styles.sectionFooter}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
};

type SettingsStackRowProps = {
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
};

export const SettingsStackRow = ({
  label,
  children,
  style,
}: SettingsStackRowProps) => (
  <View style={[styles.row, style]}>
    <AppText variant="ui" tone="secondary" style={styles.rowLabel}>
      {label}
    </AppText>
    {children}
  </View>
);

type SettingsInlineRowProps = {
  readonly label: ReactNode;
  readonly trailing: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
};

export const SettingsInlineRow = ({
  label,
  trailing,
  style,
}: SettingsInlineRowProps) => (
  <View style={[styles.inlineRow, style]}>
    <AppText variant="ui" tone="primary" style={styles.inlineLabel}>
      {label}
    </AppText>
    {trailing}
  </View>
);

type SettingsSliderRowProps = {
  readonly label: ReactNode;
  readonly value: number;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly step: number;
  readonly onValueChange: (value: number) => void;
  /** Formats the value shown next to the label. Defaults to String(value). */
  readonly formatValue?: (value: number) => string;
  readonly style?: ViewStyle | ViewStyle[];
  /** Forwarded to the host Slider. */
  readonly testID?: string;
};

export const SettingsSliderRow = ({
  label,
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  formatValue,
  style,
  testID,
}: SettingsSliderRowProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.sliderHeader}>
        <AppText variant="ui" tone="secondary" style={styles.rowLabel}>
          {label}
        </AppText>
        <AppText variant="meta" tone="primary">
          {formatValue ? formatValue(value) : String(value)}
        </AppText>
      </View>
      <Slider
        testID={testID}
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.secondaryVariant}
        style={styles.slider}
      />
    </View>
  );
};

type SettingsSwitchRowProps = {
  readonly label: ReactNode;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly style?: ViewStyle | ViewStyle[];
  /** Forwarded to the host Switch. */
  readonly testID?: string;
};

export const SettingsSwitchRow = ({
  label,
  value,
  onValueChange,
  style,
  testID,
}: SettingsSwitchRowProps) => (
  <View style={[styles.switchRow, style]}>
    <AppText variant="ui" tone="primary" style={styles.switchLabel}>
      {label}
    </AppText>
    <AppSwitch testID={testID} value={value} onValueChange={onValueChange} />
  </View>
);

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 30,
  },
  section: {
    gap: 4,
  },
  sectionHeader: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionFooter: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.25,
    marginTop: 6,
  },
  row: {
    paddingVertical: 10,
    gap: 4,
  },
  rowLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slider: {
    width: '100%',
    height: 32,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
  },
  inlineLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});
