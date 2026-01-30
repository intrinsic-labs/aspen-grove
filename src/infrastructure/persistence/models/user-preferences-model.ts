/**
 * UserPreferences WatermelonDB Model
 *
 * Singleton model for app-wide user preferences.
 * Maps database columns to UserPreferences domain entity.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';
import type { UserPreferences, Theme, NodeViewStyle, Ulid, Timestamp } from '../../../domain';

/**
 * WatermelonDB model for user_preferences table.
 *
 * This is a singleton - exactly one record exists per app installation.
 * Created automatically on first launch with sensible defaults.
 */
export class UserPreferencesModel extends Model {
  static table = 'user_preferences';

  /** User's chosen display name */
  @field('display_name') displayName!: string;

  /** Optional email for future account/sync features */
  @field('email') email!: string | null;

  /** Optional reference to avatar image in media storage */
  @field('avatar_ref') avatarRef!: string | null;

  /** Whether voice mode is enabled by default */
  @field('default_voice_mode_enabled') defaultVoiceModeEnabled!: boolean;

  /** Preferred temperature for new model agents */
  @field('default_temperature') defaultTemperature!: number | null;

  /** UI theme setting: 'light' | 'dark' | 'system' */
  @field('theme') theme!: string;

  /** UI text size in points */
  @field('font_size') fontSize!: number;

  /** UI font family name */
  @field('font_face') fontFace!: string;

  /** Node view style: 'filled' | 'outlined' */
  @field('node_view_style') nodeViewStyle!: string;

  /** Node view corner radius (0-28) */
  @field('node_view_corner_radius') nodeViewCornerRadius!: number;

  /** Show detailed error info in alerts */
  @field('verbose_error_alerts') verboseErrorAlerts!: boolean;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /** Last update timestamp */
  @date('updated_at') updatedAt!: Date;

  /**
   * Convert this model to a domain entity.
   */
  toDomain(): UserPreferences {
    return {
      id: this.id as Ulid,
      displayName: this.displayName,
      email: this.email,
      avatarRef: this.avatarRef,
      defaultVoiceModeEnabled: this.defaultVoiceModeEnabled,
      defaultTemperature: this.defaultTemperature,
      theme: this.theme as Theme,
      fontSize: this.fontSize,
      fontFace: this.fontFace,
      nodeViewStyle: this.nodeViewStyle as NodeViewStyle,
      nodeViewCornerRadius: this.nodeViewCornerRadius,
      verboseErrorAlerts: this.verboseErrorAlerts,
      createdAt: this.createdAt.getTime() as Timestamp,
      updatedAt: this.updatedAt.getTime() as Timestamp,
    };
  }
}
