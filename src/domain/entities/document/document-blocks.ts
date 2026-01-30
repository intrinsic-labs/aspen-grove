/**
 * Document Blocks
 *
 * Extended block types for rich document content.
 * Documents support all shared content primitives (text, image, audio)
 * plus additional block types suited for structured prose.
 */

import type { Ulid } from '../base';
import { CalloutVariant, EmbedDisplayMode } from '../base';
import type { TextContent } from '../content/text-content';
import type { ImageContent } from '../content/image-content';
import type { AudioContent } from '../content/audio-content';

/**
 * Heading block for document structure
 */
export interface HeadingBlock {
  readonly type: 'heading';
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
}

/**
 * Code block for code snippets
 */
export interface CodeBlock {
  readonly type: 'code';
  readonly language: string | null;
  readonly code: string;
}

/**
 * Callout block for highlighted information
 */
export interface CalloutBlock {
  readonly type: 'callout';
  readonly variant: CalloutVariant;
  readonly content: readonly (TextContent | ImageContent)[];
}

/**
 * Node embed block - embeds a Node from a Loom Tree
 */
export interface NodeEmbedBlock {
  readonly type: 'node-embed';
  readonly nodeId: Ulid;
  readonly loomTreeId: Ulid;
  readonly displayMode: EmbedDisplayMode;
}

/**
 * Tree embed block - embeds a Loom Tree
 */
export interface TreeEmbedBlock {
  readonly type: 'tree-embed';
  readonly loomTreeId: Ulid;
  readonly pathToNode: Ulid | null;
  readonly displayMode: EmbedDisplayMode;
}

/**
 * Divider block for visual separation
 */
export interface DividerBlock {
  readonly type: 'divider';
}

/**
 * Union of all document block types.
 * Includes shared primitives (text, image, audio) and document-specific blocks.
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

/**
 * Document block type discriminator values
 */
export type DocumentBlockType = DocumentBlock['type'];

// ============================================
// Factory Functions
// ============================================

export function createHeadingBlock(
  level: HeadingBlock['level'],
  text: string
): HeadingBlock {
  return { type: 'heading', level, text };
}

export function createCodeBlock(
  code: string,
  language: string | null = null
): CodeBlock {
  return { type: 'code', language, code };
}

export function createCalloutBlock(
  variant: CalloutVariant,
  content: (TextContent | ImageContent)[]
): CalloutBlock {
  return { type: 'callout', variant, content: [...content] };
}

export function createNodeEmbedBlock(
  nodeId: Ulid,
  loomTreeId: Ulid,
  displayMode: EmbedDisplayMode = EmbedDisplayMode.Card
): NodeEmbedBlock {
  return { type: 'node-embed', nodeId, loomTreeId, displayMode };
}

export function createTreeEmbedBlock(
  loomTreeId: Ulid,
  pathToNode: Ulid | null = null,
  displayMode: EmbedDisplayMode = EmbedDisplayMode.Card
): TreeEmbedBlock {
  return { type: 'tree-embed', loomTreeId, pathToNode, displayMode };
}

export function createDividerBlock(): DividerBlock {
  return { type: 'divider' };
}

// ============================================
// Type Guards
// ============================================

export function isHeadingBlock(block: unknown): block is HeadingBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as HeadingBlock).type === 'heading'
  );
}

export function isCodeBlock(block: unknown): block is CodeBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as CodeBlock).type === 'code'
  );
}

export function isCalloutBlock(block: unknown): block is CalloutBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as CalloutBlock).type === 'callout'
  );
}

export function isNodeEmbedBlock(block: unknown): block is NodeEmbedBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as NodeEmbedBlock).type === 'node-embed'
  );
}

export function isTreeEmbedBlock(block: unknown): block is TreeEmbedBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as TreeEmbedBlock).type === 'tree-embed'
  );
}

export function isDividerBlock(block: unknown): block is DividerBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as DividerBlock).type === 'divider'
  );
}

export function isEmbedBlock(
  block: unknown
): block is NodeEmbedBlock | TreeEmbedBlock {
  return isNodeEmbedBlock(block) || isTreeEmbedBlock(block);
}
