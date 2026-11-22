import { fonts } from '@interface/ui/value-objects/fonts';
import type { NodeViewStyle } from '@domain/entities';
import type { ChatFontFace } from '../types';

export type InterfaceOption<T> = {
  readonly value: T;
  readonly label: string;
};

/** Latent Spaces' order; JetBrains Mono and Open Sans replace Calling Code and System. */
export const FONT_OPTIONS: readonly InterfaceOption<ChatFontFace>[] = [
  { value: fonts.mono, label: 'JetBrains Mono' },
  { value: fonts.vt220, label: 'VT220' },
  { value: fonts.cardoRegular, label: 'Cardo' },
  { value: fonts.openSans, label: 'Open Sans' },
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
