import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

export type OnboardingSymbol =
  | 'text.append'
  | 'point.bottomleft.forward.to.point.topright.filled.scurvepath'
  | 'key'
  | 'tree'
  | 'info.circle'
  | 'bubble.left.and.text.bubble.right'
  | 'checkmark.circle'
  | 'book';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type SymbolSpec = {
  /** The SymbolView frame, in points. */
  readonly width: number;
  readonly height: number;
  /** Where SF Symbols don't exist (Android, web). */
  readonly fallback: IoniconName;
};

// SymbolView aspect-fits the glyph inside its frame with some inset, so each
// frame is the glyph Latent Spaces draws at `.font(.title)` (measured on the
// reference shots 53-56) scaled until the drawn glyph matches it.
const SYMBOLS: Record<OnboardingSymbol, SymbolSpec> = {
  'text.append': { width: 33, height: 29.5, fallback: 'list-outline' },
  'point.bottomleft.forward.to.point.topright.filled.scurvepath': {
    width: 30.5,
    height: 38,
    fallback: 'git-branch-outline',
  },
  key: { width: 25, height: 44.5, fallback: 'key-outline' },
  tree: { width: 40.5, height: 42, fallback: 'leaf-outline' },
  'info.circle': {
    width: 32.5,
    height: 32.5,
    fallback: 'information-circle-outline',
  },
  'bubble.left.and.text.bubble.right': {
    width: 44,
    height: 36,
    fallback: 'chatbubbles-outline',
  },
  'checkmark.circle': {
    width: 32.5,
    height: 32.5,
    fallback: 'checkmark-circle-outline',
  },
  book: { width: 22, height: 19, fallback: 'book-outline' },
};

type OnboardingIconProps = {
  readonly name: OnboardingSymbol;
};

/** An SF Symbol in the accent, at the size Latent Spaces draws it. */
export const OnboardingIcon = ({ name }: OnboardingIconProps) => {
  const spec = SYMBOLS[name];
  const color = loomUiTokens.colors.accentColor;
  return (
    <SymbolView
      name={name as SFSymbol}
      tintColor={color}
      style={{ width: spec.width, height: spec.height }}
      fallback={
        <Ionicons
          name={spec.fallback}
          size={Math.max(spec.width, spec.height)}
          color={color}
        />
      }
    />
  );
};
