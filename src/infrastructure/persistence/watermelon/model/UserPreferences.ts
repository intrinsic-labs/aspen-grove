import { Model } from '@nozbe/watermelondb';
import {
  date,
  field,
  text,
} from '@nozbe/watermelondb/decorators';

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

  @field('node_view_style') nodeViewStyle!: string;
  @field('node_view_corner_radius') nodeViewCornerRadius!: number;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
