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
  /**
   * The model Agent that generates a continuation when the user sends a turn.
   * Required for dialogue-mode trees (enforced by use cases); may be unset for
   * buffer-mode trees or for legacy trees that have not been backfilled.
   *
   * Editing this field switches the tree to a different agent. Editing the
   * referenced agent's configuration is a separate operation handled by the
   * agent's own use cases.
   */
  readonly defaultModelAgentId?: ULID;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date;
}
