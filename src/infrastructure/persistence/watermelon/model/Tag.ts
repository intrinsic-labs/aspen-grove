import { Model } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

/** Persistence model for Tag (organization label, grove-scoped). */
export class Tag extends Model {
  static table = 'tags';

  @field('grove_id') groveId!: string;
  @text('name') name!: string;
  @text('color') color!: string | null;
  @date('created_at') createdAt!: Date;
}

/** Persistence model for TagAssignment (tag ↔ item junction). */
export class TagAssignment extends Model {
  static table = 'tag_assignments';

  @field('tag_id') tagId!: string;
  @field('target_type') targetType!: string;
  @field('target_id') targetId!: string;
  @date('created_at') createdAt!: Date;
}
