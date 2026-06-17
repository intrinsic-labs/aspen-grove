import { ULID } from '../value-objects';

/**
 * UserPreferences entity
 *
 * App-wide singleton for user settings.
 * Not tied to any Agent — these are application-level preferences.
 *
 * Provider routing is NOT controlled here. Each Agent's `modelRef` determines
 * which provider adapter handles a given request; trees reference agents via
 * `LoomTree.defaultModelAgentId`. Connection configuration (endpoints, API
 * tokens) for the LM Studio provider lives here for now because there is no
 * better home for it — credentials remain in secure storage.
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
  readonly verboseErrorAlerts: boolean;

  // LM Studio connection settings (token lives in secure store)
  readonly lmstudioSettings: LMStudioSettings;

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

/**
 * LM Studio connection settings.
 *
 * Connection-level only — model selection is no longer stored here. The model
 * an LM Studio Agent talks to is encoded in that Agent's `modelRef`.
 */
export interface LMStudioSettings {
  /** Server endpoint (e.g., "http://192.168.1.100:1234") */
  readonly endpoint: string;
  /** Enable server-side MCP tools */
  readonly useMcpTools: boolean;
  /** Auto-load models on first request */
  readonly autoLoadModels: boolean;
  /** Auto-unload after idle (seconds, 0 = disabled) */
  readonly idleTtlSeconds: number;
}

export const DEFAULT_LMSTUDIO_SETTINGS: LMStudioSettings = {
  endpoint: 'http://localhost:1234',
  useMcpTools: true,
  autoLoadModels: true,
  idleTtlSeconds: 0,
};
