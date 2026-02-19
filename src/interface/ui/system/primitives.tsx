import { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
  View,
} from 'react-native';
import { useThemeColors } from '@interface/hooks/useThemeColors';
import type { ReactNode } from 'react';

type TextTone = 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse';
type TextVariant = 'display' | 'title' | 'body' | 'mono' | 'meta';

const getTextToneColor = (
  tone: TextTone,
  colors: ReturnType<typeof useThemeColors>['colors']
) => {
  switch (tone) {
    case 'secondary':
      return colors.secondary;
    case 'muted':
      return colors.tertiary;
    case 'accent':
      return colors.red;
    case 'inverse':
      return colors.onSurface;
    default:
      return colors.primary;
  }
};

const getTextVariantStyle = (variant: TextVariant): TextStyle => {
  switch (variant) {
    case 'display':
      return {
        fontFamily: 'OpenSans-ExtraBold',
        fontSize: 34,
        lineHeight: 40,
      };
    case 'title':
      return {
        fontFamily: 'OpenSans-Bold',
        fontSize: 28,
        lineHeight: 33,
      };
    case 'body':
      return {
        fontFamily: 'Lora-Regular',
        fontSize: 20,
        lineHeight: 30,
      };
    case 'meta':
      return {
        fontFamily: 'IBMPlexMono-Regular',
        fontSize: 12,
        lineHeight: 18,
        letterSpacing: 0.4,
      };
    default:
      return {
        fontFamily: 'IBMPlexMono-Regular',
        fontSize: 16,
        lineHeight: 22,
      };
  }
};

type AppTextProps = {
  readonly children: ReactNode;
  readonly variant?: TextVariant;
  readonly tone?: TextTone;
  readonly numberOfLines?: number;
  readonly style?: TextStyle | TextStyle[];
};

export const AppText = ({
  children,
  variant = 'mono',
  tone = 'primary',
  numberOfLines,
  style,
}: AppTextProps) => {
  const { colors } = useThemeColors();

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        getTextVariantStyle(variant),
        { color: getTextToneColor(tone, colors) },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

type AppScreenProps = {
  readonly children: ReactNode;
  readonly style?: ViewStyle | ViewStyle[];
};

export const AppScreen = ({ children, style }: AppScreenProps) => {
  const { colors } = useThemeColors();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
};

export const Hairline = ({ style }: { readonly style?: ViewStyle | ViewStyle[] }) => {
  const { colors } = useThemeColors();

  return <View style={[styles.hairline, { backgroundColor: colors.line }, style]} />;
};

type AppPillButtonProps = {
  readonly label: string;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly variant?: 'solid' | 'outline';
  readonly style?: ViewStyle | ViewStyle[];
};

export const AppPillButton = ({
  label,
  onPress,
  disabled,
  variant = 'solid',
  style,
}: AppPillButtonProps) => {
  const { colors } = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pillButton,
        variant === 'solid'
          ? {
              backgroundColor: colors.surface,
              borderColor: colors.surface,
            }
          : {
              backgroundColor: 'transparent',
              borderColor: colors.line,
            },
        (pressed || disabled) && styles.pillButtonPressed,
        style,
      ]}
    >
      <AppText
        variant="mono"
        tone={variant === 'solid' ? 'inverse' : 'primary'}
        style={styles.pillLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

type AppInputProps = Omit<TextInputProps, 'style'> & {
  readonly style?: TextStyle | TextStyle[];
};

export const AppInput = forwardRef<TextInput, AppInputProps>(
  ({ style, placeholderTextColor, ...props }, ref) => {
    const { colors } = useThemeColors();

    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? colors.tertiary}
        style={[
          styles.input,
          {
            color: colors.primary,
            borderColor: colors.line,
            backgroundColor: colors.backgroundMuted,
          },
          style,
        ]}
        {...props}
      />
    );
  }
);

AppInput.displayName = 'AppInput';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  pillButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonPressed: {
    opacity: 0.7,
  },
  pillLabel: {
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Lora-Regular',
    fontSize: 18,
    lineHeight: 26,
  },
});
