import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';

type SymbolIconProps = {
  /** The SF Symbol, as the native menus name it (`cpu`). */
  readonly name: SFSymbol;
  /** Where SF Symbols don't exist (Android, web). */
  readonly fallback: ComponentProps<typeof Ionicons>['name'];
  /** The glyph's frame, in points: the size of the text it sits beside. */
  readonly size: number;
  readonly color: string;
};

/**
 * An SF Symbol inline with text, so a control can draw the same glyph a
 * native menu item does (the tree menu's Model is `cpu`).
 */
export const SymbolIcon = ({
  name,
  fallback,
  size,
  color,
}: SymbolIconProps) => (
  <SymbolView
    name={name}
    tintColor={color}
    style={{ width: size, height: size }}
    fallback={<Ionicons name={fallback} size={size} color={color} />}
  />
);
