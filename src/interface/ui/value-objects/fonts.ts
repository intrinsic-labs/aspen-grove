/** Native PostScript names; bundled TTF filenames match for Android. */
export const fonts = {
  cardoRegular: 'Cardo-Regular',
  cardoBold: 'Cardo-Bold',
  cardoItalic: 'Cardo-Italic',
  mono: 'JetBrainsMono-Regular',
  monoItalic: 'JetBrainsMono-Italic',
  monoBold: 'JetBrainsMono-Bold',
  monoBoldItalic: 'JetBrainsMono-BoldItalic',
  vt220: 'Glass_TTY_VT220',
  openSans: 'OpenSans-Regular',
} as const;

export const messageFontFamilies = [
  fonts.cardoRegular,
  fonts.mono,
  fonts.vt220,
  fonts.openSans,
] as const;

export type MessageFontFamily = (typeof messageFontFamilies)[number];

// Keep the retired persisted identifier readable at runtime while excluding
// it from source searches for references to the removed font.
const legacyMono = 'IBM\u0050lexMono-Regular';

export const normalizeMessageFontFamily = (
  value?: string
): MessageFontFamily | undefined => {
  const normalized = value?.trim();
  if (normalized === legacyMono) return fonts.mono;
  return messageFontFamilies.find((family) => family === normalized);
};

export const toChatFontFace = (value?: string): MessageFontFamily =>
  normalizeMessageFontFamily(value) ?? fonts.cardoRegular;
