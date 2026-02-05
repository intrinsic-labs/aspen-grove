// ## LoomTree

import { LoomTreeMode } from './enums';
import { ULID } from '../value-objects';

/**
 * LoomTree type
 *
 * The top level container for a branching exploration.
 */
export interface LoomTree {
  readonly id: ULID;
  readonly groveId: ULID;
  readonly title: string;
  readonly description?: string;
  readonly summary?: string;
  readonly rootNodeId: ULID;
  readonly mode: LoomTreeMode;
  readonly systemContext?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date;
}
