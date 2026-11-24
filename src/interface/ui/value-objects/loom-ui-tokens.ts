/**
 * Shared dialogue-surface UI tokens. Single source of truth for the loom UI.
 *
 * The values are Latent Spaces' (the SwiftUI reference, `loom-swift`,
 * `fix/phase-1-2` at 02c71d5). Swift sources are cited as `File.swift:line`,
 * relative to `loom-swift/Loom/`. "Measured" means read off an iOS Simulator
 * capture of the reference build (iPhone 17 Pro, iOS 26) where the value is a
 * system default rather than a number in the source.
 *
 * The sections live by concern in `./tokens/` and are composed here, so
 * `loomUiTokens` stays the one entry point. Every colour the interface
 * draws comes from here or the theme palette beside it
 * (`tokens/theme-colors.ts`); lint fails on a colour literal anywhere else
 * (`config/eslint-colour-literals.mjs`).
 *
 * The tree chat (Dialogue) screen, its continuation row and node sheets are
 * ported against these. The expanded composer tokens are still Aspen
 * Grove's provisional values until that screen is ported.
 */
import { bufferTokens } from './tokens/buffer';
import { colorTokens } from './tokens/colors';
import { dialogueTokens } from './tokens/dialogue';
import { homeTokens } from './tokens/home';
import { modelBrowserTokens } from './tokens/model-browser';
import { onboardingTokens } from './tokens/onboarding';
import { settingsTokens } from './tokens/settings';
import { sheetTokens } from './tokens/sheets';

export const loomUiTokens = {
  ...colorTokens,
  ...dialogueTokens,
  ...homeTokens,
  ...settingsTokens,
  ...onboardingTokens,
  ...sheetTokens,
  ...modelBrowserTokens,
  buffer: bufferTokens,
} as const;
