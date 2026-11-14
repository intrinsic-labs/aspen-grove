import type { NodeViewStyle } from '@domain/entities';
import type { ChatFontFace } from '../types';

export type InterfaceOption<T> = {
  readonly value: T;
  readonly label: string;
};

/**
 * Aspen Grove's three message fonts, in Latent Spaces' order (mono, Cardo,
 * sans; LoomFont.swift:10-15). Calling Code, VT220 and System are not
 * bundled: IBM Plex Mono and Open Sans stand in.
 */
export const FONT_OPTIONS: readonly InterfaceOption<ChatFontFace>[] = [
  { value: 'IBMPlexMono-Regular', label: 'IBM Plex Mono' },
  { value: 'Cardo-Regular', label: 'Cardo' },
  { value: 'OpenSans-Regular', label: 'Open Sans' },
];

export const MESSAGE_STYLE_OPTIONS: readonly InterfaceOption<NodeViewStyle>[] =
  [
    { value: 'filled', label: 'Filled' },
    { value: 'outlined', label: 'Outlined' },
  ];

/** 12-26 (LoomSettingsView.swift:72-78). */
const FONT_SIZES = Array.from({ length: 15 }, (_, index) => 12 + index);

/** 0-20, even (LoomSettingsView.swift:80-88). */
const CORNER_RADII = Array.from({ length: 11 }, (_, index) => index * 2);

/** LoomSettingsView.swift:264-271 */
const radiusLabel = (radius: number): string => {
  switch (radius) {
    case 0:
      return '0 (hacker)';
    case 8:
      return '8 (default)';
    case 20:
      return '20 (material design plebeian)';
    default:
      return String(radius);
  }
};

/**
 * The menu's values, plus the stored one when an older install saved a
 * value outside Latent Spaces' range (Aspen Grove used to allow more), so
 * the row never shows a blank value.
 */
const withCurrent = (values: readonly number[], current: number) =>
  Number.isFinite(current) && !values.includes(current)
    ? [...values, current].sort((a, b) => a - b)
    : values;

export const fontSizeOptions = (
  current: number
): readonly InterfaceOption<number>[] =>
  withCurrent(FONT_SIZES, current).map((size) => ({
    value: size,
    label: String(size),
  }));

export const cornerRadiusOptions = (
  current: number
): readonly InterfaceOption<number>[] =>
  withCurrent(CORNER_RADII, current).map((radius) => ({
    value: radius,
    label: radiusLabel(radius),
  }));
