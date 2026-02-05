import { ULID } from '../value-objects';

/**
 * UserPreferences entity
 *
 * App-wide singleton for user settings.
 * Not tied to any Agent — these are application-level preferences.
 */
export interface UserPreferences {
  readonly id: ULID;
  readonly displayName?: string;
  readonly email?: string;
  readonly avatarRef?: string;

  // Appearance
  readonly theme: Theme;
  readonly fontSize: FontSize;
  readonly fontFace?: string;

  // Behavior
  readonly defaultVoiceModeEnabled: boolean;
  readonly defaultTemperature: number;

  // Node display
  readonly nodeViewStyle: NodeViewStyle;
  readonly nodeViewCornerRadius: number;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Font size options
 */
export type FontSize =
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30;

/**
 * Node view style options
 */
export type NodeViewStyle = 'filled' | 'outlined';
