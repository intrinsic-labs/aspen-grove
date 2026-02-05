import { ULID } from '../value-objects';
import { TextContent, ImageContent, AudioContent } from './content';

// =============================================================================
// Document-Specific Block Types
// =============================================================================

/**
 * Heading block for document structure.
 */
export interface HeadingBlock {
  readonly type: 'heading';
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
}

/**
 * Code block with optional syntax highlighting.
 */
export interface CodeBlock {
  readonly type: 'code';
  readonly language?: string;
  readonly code: string;
}

/**
 * Callout block for emphasized content.
 */
export interface CalloutBlock {
  readonly type: 'callout';
  readonly variant: 'info' | 'warning' | 'tip' | 'note';
  readonly content: ReadonlyArray<TextContent | ImageContent>;
}

/**
 * Embedded node reference.
 */
export interface NodeEmbedBlock {
  readonly type: 'node-embed';
  readonly nodeId: ULID;
  readonly loomTreeId: ULID;
  readonly displayMode: 'inline' | 'card' | 'full';
}

/**
 * Embedded tree reference.
 */
export interface TreeEmbedBlock {
  readonly type: 'tree-embed';
  readonly loomTreeId: ULID;
  readonly pathToNode?: ULID;
  readonly displayMode: 'card' | 'preview';
}

/**
 * Visual divider.
 */
export interface DividerBlock {
  readonly type: 'divider';
}

// =============================================================================
// Union Types
// =============================================================================

/**
 * All block types that can appear in a Document.
 * Includes shared primitives (Text, Image, Audio) and document-specific blocks.
 */
export type DocumentBlock =
  | TextContent
  | ImageContent
  | AudioContent
  | HeadingBlock
  | CodeBlock
  | CalloutBlock
  | NodeEmbedBlock
  | TreeEmbedBlock
  | DividerBlock;

// =============================================================================
// Document Entity
// =============================================================================

/**
 * Document: a rich, mutable document for notes and reference material.
 *
 * Unlike Nodes, Documents are mutable. The blocks array can be modified,
 * but individual blocks are replaced wholesale (not mutated in place).
 */
export interface Document {
  readonly id: ULID;
  readonly groveId: ULID;
  readonly title: string;
  readonly summary?: string;
  /** Mutable array of content blocks */
  blocks: DocumentBlock[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt?: Date;
}

// =============================================================================
// Type Guards
// =============================================================================

export const isHeadingBlock = (block: DocumentBlock): block is HeadingBlock =>
  block.type === 'heading';

export const isCodeBlock = (block: DocumentBlock): block is CodeBlock =>
  block.type === 'code';

export const isCalloutBlock = (block: DocumentBlock): block is CalloutBlock =>
  block.type === 'callout';

export const isNodeEmbedBlock = (
  block: DocumentBlock
): block is NodeEmbedBlock => block.type === 'node-embed';

export const isTreeEmbedBlock = (
  block: DocumentBlock
): block is TreeEmbedBlock => block.type === 'tree-embed';

export const isDividerBlock = (block: DocumentBlock): block is DividerBlock =>
  block.type === 'divider';
