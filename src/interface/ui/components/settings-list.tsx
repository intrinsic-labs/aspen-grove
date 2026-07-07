import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Switch, View, type ViewStyle } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from './primitives';

type SettingsListProps = {
  readonly children: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
};

export const SettingsList = ({ children, style }: SettingsListProps) => (
  <View style={[styles.list, style]}>{children}</View>
);

type SettingsSectionProps = {
  readonly title?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
};

/**
 * A flat settings section: uppercase mono header, rows separated by hairline
 * dividers, optional footer. Deliberately boring — no cards, no outlines.
 */
export const SettingsSection = ({
  title,
  footer,
  children,
  style,
}: SettingsSectionProps) => {
  const { isDark } = useAspenGroveTheme();
  const items = Children.toArray(children).filter(Boolean);
  const dividerColor = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.12)';

  return (
    <View style={[styles.section, style]}>
      {title ? (
        <AppText variant="meta" tone="secondary" style={styles.sectionHeader}>
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
    <AppText variant="meta" tone="secondary" style={styles.rowLabel}>
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
    <AppText variant="mono" tone="primary" style={styles.inlineLabel}>
      {label}
    </AppText>
    {trailing}
  </View>
);

type SettingsSwitchRowProps = {
  readonly label: ReactNode;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly trackColor?: { false: string; true: string };
  readonly style?: ViewStyle | ViewStyle[];
};

export const SettingsSwitchRow = ({
  label,
  value,
  onValueChange,
  trackColor,
  style,
}: SettingsSwitchRowProps) => (
  <View style={[styles.switchRow, style]}>
    <AppText variant="mono" tone="primary" style={styles.switchLabel}>
      {label}
    </AppText>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={trackColor}
    />
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
    fontFamily: 'IBMPlexMono-Semibold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.7,
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
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
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
    fontFamily: 'IBMPlexMono-Regular',
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
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
});
