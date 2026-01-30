/**
 * Grove WatermelonDB Model
 *
 * Database model for Grove entities.
 * Maps between database columns (snake_case) and domain entity (camelCase).
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Grove model for WatermelonDB persistence.
 *
 * The Grove is the top-level container for all user data.
 * In MVP, there is exactly one Grove per user.
 */
export class GroveModel extends Model {
  static table = 'groves';

  /** Display name (default: "My Grove") */
  @field('name') name!: string;

  /** Reference to the owner (human) Agent */
  @field('owner_agent_id') ownerAgentId!: string;

  /** Creation timestamp in milliseconds */
  @readonly @date('created_at') createdAt!: Date;

  /** Last update timestamp in milliseconds */
  @date('updated_at') updatedAt!: Date;
}
