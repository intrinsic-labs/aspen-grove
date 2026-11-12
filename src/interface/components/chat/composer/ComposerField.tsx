import { useState, type ReactNode, type RefObject } from 'react';
import {
  type NativeSyntheticEvent,
  StyleSheet,
  type TextInput,
  type TextInputContentSizeChangeEventData,
  type TextStyle,
  View,
} from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { MaterialView } from '@/interface/ui/components/MaterialView';
import { AppInput } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

type ComposerFieldProps = {
  readonly testID: string;
  readonly inputRef?: RefObject<TextInput | null>;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly editable: boolean;
  /** The reader's message font, size and line height. */
  readonly textStyle: TextStyle;
  readonly minHeight: number;
  readonly maxHeight: number;
  readonly maxLines: number;
  readonly onFocus?: () => void;
  readonly onContentSizeChange?: (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
  ) => void;
  /** Trailing controls (send, expand), bottom-aligned beside the input. */
  readonly children: ReactNode;
};

/**
 * Latent Spaces' `MessageField` (MessageField.swift): a thin-material field
 * with radius 20 and a soft shadow, a 1 pt green stroke while focused, the
 * input on the leading side and its controls trailing. The tree chat's
 * composer and Home's "Begin a new loom tree" composer both draw it.
 */
export const ComposerField = ({
  testID,
  inputRef,
  value,
  onChangeText,
  placeholder,
  editable,
  textStyle,
  minHeight,
  maxHeight,
  maxLines,
  onFocus,
  onContentSizeChange,
  children,
}: ComposerFieldProps) => {
  const { colors } = useAspenGroveTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldShadow}>
      {isFocused ? (
        <View
          pointerEvents="none"
          style={[styles.focusStroke, { borderColor: colors.green }]}
        />
      ) : null}
      <MaterialView variant="systemThinDark" style={styles.field}>
        <AppInput
          testID={testID}
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={loomUiTokens.colors.composerPlaceholder}
          selectionColor={colors.accentColor}
          keyboardAppearance="dark"
          multiline
          editable={editable}
          numberOfLines={maxLines}
          scrollEnabled
          textAlignVertical="top"
          onContentSizeChange={onContentSizeChange}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, textStyle, { minHeight, maxHeight }]}
        />
        {children}
      </MaterialView>
    </View>
  );
};

const FOCUS_STROKE_VISIBLE = loomUiTokens.composer.focusedStrokeWidth / 2;

const styles = StyleSheet.create({
  // The shadow sits outside the clipped material (MessageInputView.swift:51).
  fieldShadow: {
    borderRadius: loomUiTokens.composer.fieldRadius,
    shadowColor: '#000',
    shadowOpacity: loomUiTokens.composer.shadowOpacity,
    shadowRadius: loomUiTokens.composer.shadowRadius,
    shadowOffset: { width: 0, height: 0 },
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: loomUiTokens.composer.fieldRadius,
  },
  // The reference strokes a 1 pt line centered on the field's edge behind
  // the field (MessageInputView.swift:47-50), so only its outer half shows.
  focusStroke: {
    position: 'absolute',
    top: -FOCUS_STROKE_VISIBLE,
    left: -FOCUS_STROKE_VISIBLE,
    right: -FOCUS_STROKE_VISIBLE,
    bottom: -FOCUS_STROKE_VISIBLE,
    borderRadius: loomUiTokens.composer.fieldRadius + FOCUS_STROKE_VISIBLE,
    borderWidth: FOCUS_STROKE_VISIBLE,
  },
  input: {
    flex: 1,
    paddingTop: loomUiTokens.composer.textPaddingVertical,
    paddingBottom: loomUiTokens.composer.textPaddingVertical,
    paddingLeft: loomUiTokens.composer.textPaddingLeading,
    paddingRight: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
});
