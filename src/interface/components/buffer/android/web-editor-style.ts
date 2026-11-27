import type { TextStyle } from 'react-native';
import { fonts } from '@/interface/ui/value-objects/fonts';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import { isBufferPreviewEnabled } from '../buffer-preview-flag';
import type { WebEditorStyle } from './web-editor-protocol';

/** The face names the page loads from the app's bundled fonts. */
const PAGE_FACES: ReadonlySet<string> = new Set([
  fonts.cardoRegular,
  fonts.mono,
  fonts.vt220,
]);

const cssFamily = (family: string | undefined): string =>
  family !== undefined && PAGE_FACES.has(family) ? `'${family}'` : 'sans-serif';

/** The page's style from the same tokens and text style the native input uses. */
export const webEditorStyle = (
  textStyle: TextStyle,
  headerHeight: number,
  topGap: number,
  placeholder: string
): WebEditorStyle => ({
  fontFamily: cssFamily(textStyle.fontFamily),
  fontSize: textStyle.fontSize ?? 17,
  lineHeight: textStyle.lineHeight ?? 27,
  paddingTop: headerHeight + topGap,
  paddingHorizontal: bufferTokens.layout.horizontalMargin,
  paddingBottom: bufferTokens.layout.documentBottomPadding,
  humanColor: bufferTokens.colors.humanText,
  modelColor: bufferTokens.colors.modelText,
  placeholderColor: bufferTokens.colors.placeholder,
  backgroundColor: bufferTokens.colors.background,
  placeholder,
  diagnostics: isBufferPreviewEnabled(),
});

/** Presentation messages are suppressed when every rendered value is equal. */
export const webEditorStylesEqual = (
  before: WebEditorStyle | undefined,
  after: WebEditorStyle
): boolean =>
  before !== undefined &&
  before.fontFamily === after.fontFamily &&
  before.fontSize === after.fontSize &&
  before.lineHeight === after.lineHeight &&
  before.paddingTop === after.paddingTop &&
  before.paddingHorizontal === after.paddingHorizontal &&
  before.paddingBottom === after.paddingBottom &&
  before.humanColor === after.humanColor &&
  before.modelColor === after.modelColor &&
  before.placeholderColor === after.placeholderColor &&
  before.backgroundColor === after.backgroundColor &&
  before.placeholder === after.placeholder &&
  before.diagnostics === after.diagnostics;
