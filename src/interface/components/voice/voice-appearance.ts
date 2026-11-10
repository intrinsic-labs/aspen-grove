import type Ionicons from '@expo/vector-icons/Ionicons';
import type { LoomVoiceName } from '@domain/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';

export type VoiceAppearance = {
  readonly color: string;
  /** Closest Ionicons glyph to the Latent Spaces SF Symbol. */
  readonly icon: keyof typeof Ionicons.glyphMap;
};

/** How each character voice looks (LoomVoice.swift's color and sfSymbol). */
export const VOICE_APPEARANCE: Readonly<
  Record<LoomVoiceName, VoiceAppearance>
> = {
  // cup.and.saucer.fill
  Jefferson: { color: loomUiTokens.colors.voiceJefferson, icon: 'cafe' },
  // sun.max.fill
  Lily: { color: loomUiTokens.colors.voiceLily, icon: 'sunny' },
  // leaf.fill
  Eve: { color: loomUiTokens.colors.green, icon: 'leaf' },
};
