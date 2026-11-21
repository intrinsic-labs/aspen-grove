import type { ComponentProps } from 'react';
import { SymbolIcon } from '../SymbolIcon';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { formText } from './form-text';

const form = loomUiTokens.settingsForm;

const TONE_STYLE = {
  primary: formText.body,
  accent: formText.accent,
  destructive: formText.destructive,
} as const;

export type FormIconName = keyof typeof Ionicons.glyphMap;

type FormLabelProps = {
  readonly title: string;
  /**
   * Icon, also used as the Android/web fallback when systemIcon is supplied.
   */
  readonly icon?: FormIconName;
  readonly systemIcon?: ComponentProps<typeof SymbolIcon>['name'];
  /** `accent` for a button or link row (the Form's tint), red to destroy. */
  readonly tone?: 'primary' | 'accent' | 'destructive';
  readonly numberOfLines?: number;
  /**
   * Take only the title's width rather than fill the row: the label of a
   * field row (`Text` then `Spacer` then a greedy `TextField`), so the field
   * gets the rest of the row.
   */
  readonly hug?: boolean;
};

/** A row title, with the icon column when there is an icon. Icons are gold. */
export const FormLabel = ({
  title,
  icon,
  systemIcon,
  tone = 'primary',
  numberOfLines,
  hug = false,
}: FormLabelProps) => (
  <View style={[styles.label, hug ? styles.hug : null]}>
    {icon ? (
      <View style={styles.iconColumn}>
        {systemIcon ? (
          <SymbolIcon
            name={systemIcon}
            fallback={icon}
            size={form.labelIconSize}
            color={loomUiTokens.colors.accentColor}
          />
        ) : (
          <Ionicons
            name={icon}
            size={form.labelIconSize}
            color={loomUiTokens.colors.accentColor}
          />
        )}
      </View>
    ) : null}
    <Text
      numberOfLines={numberOfLines}
      style={[TONE_STYLE[tone], styles.title]}
    >
      {title}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  label: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  hug: {
    flex: 0,
    flexShrink: 0,
  },
  iconColumn: {
    width: form.labelIconColumn,
    alignItems: 'flex-start',
    paddingLeft: 1,
  },
  title: {
    flexShrink: 1,
  },
});
