import {
  FontSize,
  NodeViewStyle,
  Theme,
  UserPreferences,
} from '@domain/entities';

/**
 * Repository interface for UserPreferences persistence operations.
 * Infrastructure layer implements this contract.
 *
 * UserPreferences is a singleton — exactly one record exists per app installation.
 */
export interface IUserPreferencesRepository {
  /**
   * Retrieves the UserPreferences record, creating it with defaults if not exists.
   * Guarantees a record always exists after this call.
   */
  get(): Promise<UserPreferences>;

  /**
   * Updates UserPreferences fields. Partial update — only provided fields change.
   */
  update(changes: UserPreferencesChanges): Promise<UserPreferences>;
}

/** Allowed changes to UserPreferences. */
export type UserPreferencesChanges = {
  readonly displayName?: string;
  readonly email?: string | null;
  readonly avatarRef?: string | null;
  readonly theme?: Theme;
  readonly fontSize?: FontSize;
  readonly fontFace?: string | null;
  readonly defaultVoiceModeEnabled?: boolean;
  readonly defaultTemperature?: number;
  readonly verboseErrorAlerts?: boolean;
  readonly nodeViewStyle?: NodeViewStyle;
  readonly nodeViewCornerRadius?: number;
};
