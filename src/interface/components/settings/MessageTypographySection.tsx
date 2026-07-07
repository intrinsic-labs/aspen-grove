import { Pressable, StyleSheet, View } from 'react-native';
import type { NodeViewStyle } from '@domain/entities';
import {
  AppInput,
  AppText,
  SettingsSection,
  SettingsStackRow,
} from '@/interface/ui/value-objects';
import type { ChatFontFace } from './types';

type MessageTypographySectionProps = {
  readonly fontFace: ChatFontFace;
  readonly onChangeFontFace: (value: ChatFontFace) => void;
  readonly fontSizeInput: string;
  readonly onChangeFontSizeInput: (value: string) => void;
  readonly nodeViewStyle: NodeViewStyle;
  readonly onChangeNodeViewStyle: (value: NodeViewStyle) => void;
  readonly nodeViewCornerRadiusInput: string;
  readonly onChangeNodeViewCornerRadiusInput: (value: string) => void;
  readonly colors: {
    readonly line: string;
    readonly surface: string;
  };
};

const FONT_OPTIONS: readonly { label: string; value: ChatFontFace }[] = [
  { label: 'Serif', value: 'Cardo-Regular' },
  { label: 'Mono', value: 'IBMPlexMono-Regular' },
  { label: 'Sans', value: 'OpenSans-Regular' },
] as const;

const NODE_STYLE_OPTIONS: readonly { label: string; value: NodeViewStyle }[] = [
  { label: 'Filled', value: 'filled' },
  { label: 'Outlined', value: 'outlined' },
] as const;

const OptionSelector = <T extends string>({
  value,
  options,
  onChange,
  colors,
}: {
  readonly value: T;
  readonly options: readonly { label: string; value: T }[];
  readonly onChange: (next: T) => void;
  readonly colors: MessageTypographySectionProps['colors'];
}) => (
  <View style={[styles.optionSelector, { borderColor: colors.line }]}>
    {options.map((option) => {
      const selected = option.value === value;

      return (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[
            styles.optionButton,
            selected
              ? { backgroundColor: colors.surface }
              : { backgroundColor: 'transparent' },
          ]}
        >
          <AppText
            variant="meta"
            tone={selected ? 'inverse' : 'secondary'}
            style={styles.optionLabel}
          >
            {option.label}
          </AppText>
        </Pressable>
      );
    })}
  </View>
);

export const MessageTypographySection = ({
  fontFace,
  onChangeFontFace,
  fontSizeInput,
  onChangeFontSizeInput,
  nodeViewStyle,
  onChangeNodeViewStyle,
  nodeViewCornerRadiusInput,
  onChangeNodeViewCornerRadiusInput,
  colors,
}: MessageTypographySectionProps) => {
  return (
    <SettingsSection
      title="Message & Typography"
      footer="Applies to dialogue text and user message bubble appearance."
    >
      <SettingsStackRow label="Font">
        <OptionSelector
          value={fontFace}
          options={FONT_OPTIONS}
          onChange={onChangeFontFace}
          colors={colors}
        />
      </SettingsStackRow>

      <SettingsStackRow label="Font Size (12 - 30)">
        <AppInput
          value={fontSizeInput}
          onChangeText={onChangeFontSizeInput}
          placeholder="17"
          keyboardType="number-pad"
          autoCorrect={false}
          style={styles.input}
        />
      </SettingsStackRow>

      <SettingsStackRow label="Message Style">
        <OptionSelector
          value={nodeViewStyle}
          options={NODE_STYLE_OPTIONS}
          onChange={onChangeNodeViewStyle}
          colors={colors}
        />
      </SettingsStackRow>

      <SettingsStackRow label="Message Corner Radius (0 - 32)">
        <AppInput
          value={nodeViewCornerRadiusInput}
          onChangeText={onChangeNodeViewCornerRadiusInput}
          placeholder="8"
          keyboardType="number-pad"
          autoCorrect={false}
          style={styles.input}
        />
      </SettingsStackRow>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  optionSelector: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 30,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  optionLabel: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 28,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
});
