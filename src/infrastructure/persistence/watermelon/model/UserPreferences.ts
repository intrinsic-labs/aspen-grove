import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

/** Persistence model for app-wide UserPreferences singleton. */
export default class UserPreferences extends Model {
  static table = 'user_preferences';

  @text('display_name') displayName!: string | null;
  @text('email') email!: string | null;
  @text('avatar_ref') avatarRef!: string | null;

  @field('theme') theme!: string;
  @field('font_size') fontSize!: number;
  @text('font_face') fontFace!: string | null;

  @field('default_voice_mode_enabled')
  defaultVoiceModeEnabled!: boolean;

  @field('default_temperature') defaultTemperature!: number;
  @field('verbose_error_alerts') verboseErrorAlerts!: boolean | null;
  @field('auto_title_enabled') autoTitleEnabled!: boolean | null;

  @field('node_view_style') nodeViewStyle!: string;
  @field('node_view_corner_radius') nodeViewCornerRadius!: number;

  // NOTE: `selected_provider` was removed at schema v6. The column may still
  // exist in legacy SQLite databases but is intentionally not declared on the
  // model. Provider routing is now driven by each Agent's `modelRef`.
  @text('lmstudio_settings') lmstudioSettings!: string | null;

  /**
   * User-pinned default model Agent for new LoomTrees. Tree creation reads
   * this; if unset (or stale), the flow falls back to any available shared
   * model agent.
   */
  @field('default_model_agent_id') defaultModelAgentId!: string | null;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
