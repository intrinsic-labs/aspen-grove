import { StyleSheet } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';

const form = loomUiTokens.settingsForm;

/** System (SF) text styles a Form uses; no custom font in Forms. */
export const formText = StyleSheet.create({
  body: {
    fontSize: form.rowTextSize,
    lineHeight: form.rowTextLineHeight,
    color: '#FFFFFF',
  },
  value: {
    fontSize: form.rowTextSize,
    lineHeight: form.rowTextLineHeight,
    color: form.colors.secondaryLabel,
  },
  accent: {
    fontSize: form.rowTextSize,
    lineHeight: form.rowTextLineHeight,
    color: loomUiTokens.colors.accentColor,
  },
  destructive: {
    fontSize: form.rowTextSize,
    lineHeight: form.rowTextLineHeight,
    // systemRed, dark
    color: '#FF453A',
  },
  header: {
    fontSize: form.headerTextSize,
    lineHeight: form.headerLineHeight,
    fontWeight: '600',
    color: form.colors.secondaryLabel,
  },
  footer: {
    fontSize: form.footerTextSize,
    lineHeight: form.footerLineHeight,
    color: form.colors.secondaryLabel,
  },
});
