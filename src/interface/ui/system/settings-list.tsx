import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useThemeColors } from '@interface/hooks/useThemeColors';
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

export const SettingsSection = ({
  title,
  footer,
  children,
  style,
}: SettingsSectionProps) => {
  const { isDark } = useThemeColors();
  const items = Children.toArray(children).filter(Boolean);
  const sectionBackgroundColor = isDark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.05)';
  const sectionDividerColor = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.12)';

  return (
    <View style={[styles.section, style]}>
      {title ? (
        <AppText variant="meta" tone="secondary" style={styles.sectionHeader}>
          {title}
        </AppText>
      ) : null}

      <View style={[styles.sectionCard, { backgroundColor: sectionBackgroundColor }]}>
        {items.map((item, index) => (
          <Fragment key={index}>
            {item}
            {index < items.length - 1 ? (
              <View
                style={[
                  styles.rowDivider,
                  {
                    backgroundColor: sectionDividerColor,
                  },
                ]}
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

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 18,
  },
  section: {
    gap: 5,
  },
  sectionHeader: {
    marginLeft: 4,
    fontFamily: 'IBMPlexMono-Semibold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  sectionFooter: {
    marginLeft: 4,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.25,
  },
  sectionCard: {
    borderRadius: 13,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  rowLabel: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  inlineLabel: {
    flex: 1,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 15,
    lineHeight: 22,
  },
});
