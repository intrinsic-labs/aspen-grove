/**
 * Organization Module
 *
 * Exports Link and Tag entities for cross-referencing and categorization.
 */

export type { Link, CreateLinkInput, LinkedItemRef } from './link';
export { createLinkedItemRef, isSameConnection, getOtherEnd } from './link';

export type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  TagAssignment,
  CreateTagAssignmentInput,
  TaggedItemRef,
} from './tag';
