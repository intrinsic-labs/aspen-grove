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
   * SwiftUI `Label`'s icon. Latent Spaces uses SF Symbols; the closest
   * Ionicons glyph stands in until the build has an SF Symbols module.
   */
  readonly icon?: FormIconName;
  /** `accent` for a button or link row (the Form's tint), red to destroy. */
  readonly tone?: 'primary' | 'accent' | 'destructive';
  readonly numberOfLines?: number;
};

/** A row title, with the icon column when there is an icon. Icons are gold. */
export const FormLabel = ({
  title,
  icon,
  tone = 'primary',
  numberOfLines,
}: FormLabelProps) => (
  <View style={styles.label}>
    {icon ? (
      <View style={styles.iconColumn}>
        <Ionicons
          name={icon}
          size={form.labelIconSize}
          color={loomUiTokens.colors.accentColor}
        />
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
  iconColumn: {
    width: form.labelIconColumn,
    alignItems: 'flex-start',
    paddingLeft: 1,
  },
  title: {
    flexShrink: 1,
  },
});
