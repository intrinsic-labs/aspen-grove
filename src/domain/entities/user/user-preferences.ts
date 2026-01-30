/**
 * User Preferences
 *
 * App-wide user preferences stored as a singleton.
 * Not tied to any specific Agent - these are global settings.
 */

import type { Ulid, Timestamp, Theme, NodeViewStyle } from '../base';

/**
 * UserPreferences entity - global app settings.
 *
 * Key characteristics:
 * - Singleton: exactly one record per app installation
 * - Created automatically on first launch
 * - Not linked to Grove or Agent - truly global
 */
export interface UserPreferences {
  /** ULID primary identifier (singleton - only one exists) */
  readonly id: Ulid;

  /** User's chosen display name (used as default for human Agent names) */
  readonly displayName: string;

  /** Optional email for future account/sync features */
  readonly email: string | null;

  /** Optional reference to avatar image in media storage */
  readonly avatarRef: string | null;

  /** Whether voice mode is enabled by default */
  readonly defaultVoiceModeEnabled: boolean;

  /** Preferred temperature for new model agents */
  readonly defaultTemperature: number | null;

  /** UI theme setting */
  readonly theme: Theme;

  /** UI text size in points */
  readonly fontSize: number;

  /** UI font family name */
  readonly fontFace: string;

  /** Node view style preference */
  readonly nodeViewStyle: NodeViewStyle;

  /** Node view corner radius (0-28) */
  readonly nodeViewCornerRadius: number;

  /** Show detailed error info in alerts */
  readonly verboseErrorAlerts: boolean;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;

  /** Last update timestamp in milliseconds */
  readonly updatedAt: Timestamp;
}

/**
 * Default values for new UserPreferences
 */
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'> = {
  displayName: 'Human',
  email: null,
  avatarRef: null,
  defaultVoiceModeEnabled: false,
  defaultTemperature: null,
  theme: 'system' as Theme,
  fontSize: 16,
  fontFace: 'System',
  nodeViewStyle: 'filled' as NodeViewStyle,
  nodeViewCornerRadius: 12,
  verboseErrorAlerts: false,
};

/**
 * Input for creating UserPreferences
 */
export interface CreateUserPreferencesInput {
  /** ULID for the preferences (pre-generated) */
  id: Ulid;

  /** Optional overrides for default values */
  displayName?: string;
  email?: string;
  avatarRef?: string;
  defaultVoiceModeEnabled?: boolean;
  defaultTemperature?: number;
  theme?: Theme;
  fontSize?: number;
  fontFace?: string;
  nodeViewStyle?: NodeViewStyle;
  nodeViewCornerRadius?: number;
  verboseErrorAlerts?: boolean;
}

/**
 * Input for updating UserPreferences
 */
export interface UpdateUserPreferencesInput {
  displayName?: string;
  email?: string | null;
  avatarRef?: string | null;
  defaultVoiceModeEnabled?: boolean;
  defaultTemperature?: number | null;
  theme?: Theme;
  fontSize?: number;
  fontFace?: string;
  nodeViewStyle?: NodeViewStyle;
  nodeViewCornerRadius?: number;
  verboseErrorAlerts?: boolean;
}
