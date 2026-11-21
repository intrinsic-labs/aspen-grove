/**
 * Native PostScript names; bundled TTF filenames match for Android.
 * JetBrains Mono stands in for Latent Spaces' Calling Code (paid). Its
 * advance is IBM Plex Mono's (600/1000 em), so sizes width-matched for Plex
 * still hold.
 */
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
  openSansBold: 'OpenSans-Bold',
  openSansItalic: 'OpenSans-Italic',
  openSansBoldItalic: 'OpenSans-BoldItalic',
} as const;

export const messageFontFamilies = [
  fonts.cardoRegular,
  fonts.mono,
  fonts.vt220,
  fonts.openSans,
] as const;

export type MessageFontFamily = (typeof messageFontFamilies)[number];

/** The mono face before JetBrains Mono; saved preferences may still name it. */
const legacyMono = 'IBMPlexMono-Regular';

export const normalizeMessageFontFamily = (
  value?: string
): MessageFontFamily | undefined => {
  const normalized = value?.trim();
  if (normalized === legacyMono) return fonts.mono;
  return messageFontFamilies.find((family) => family === normalized);
};

export const toChatFontFace = (value?: string): MessageFontFamily =>
  normalizeMessageFontFamily(value) ?? fonts.cardoRegular;

/** Bundled emphasis faces for a message font; VT220 has no variant faces. */
export const emphasisFaces = (family?: string) => {
  switch (family) {
    case fonts.mono:
      return {
        regular: fonts.mono,
        bold: fonts.monoBold,
        italic: fonts.monoItalic,
        boldItalic: fonts.monoBoldItalic,
      };
    case fonts.openSans:
      return {
        regular: fonts.openSans,
        bold: fonts.openSansBold,
        italic: fonts.openSansItalic,
        boldItalic: fonts.openSansBoldItalic,
      };
    case fonts.vt220:
      return {
        regular: fonts.vt220,
        bold: fonts.vt220,
        italic: fonts.vt220,
        boldItalic: fonts.vt220,
      };
    default:
      return {
        regular: fonts.cardoRegular,
        bold: fonts.cardoBold,
        italic: fonts.cardoItalic,
        boldItalic: fonts.cardoBold,
      };
  }
};
