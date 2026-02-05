/**
 * Content Types
 *
 * Discriminated union pattern for extensible node and document content.
 * These are the core conent primitives used by Nodes and Documents.
 *
 * Design notes:
 * - References (ref) point to filesystem; actual bytes never stored in db
 * - New content types can be added without changing Node schema
 * - MixedContent cannot nest (blocks are only Text | Image | Audio)
 */

// =============================
// Content Variants
// =============================

/**
 * Plain text content; markdown compatible.
 */
export interface TextContent {
  readonly type: 'text';
  readonly text: string;
}

/**
 * Image content with metadata.
 * Actual image bytes stored in filesystem, referenced by `ref`.
 */
export interface ImageContent {
  readonly type: 'image';
  /** File path or blob id */
  readonly ref: string;
  /** e.g. 'image/png', 'image/jpeg' */
  readonly mimeType: string;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Reference to thumbnail for fast rendering */
  readonly thumbnailRef?: string;
  /** Accessibility/non-vision LLM description */
  readonly altText?: string;
}

/**
 * Audio content with metatdata.
 * Actual audio bytes stored in filesystem, referenced by `ref`.
 */
export interface AudioContent {
  readonly type: 'audio';
  /** File path or blob id */
  readonly ref: string;
  /** e.g. 'audio/mp3', 'audio/wav' */
  readonly mimeType: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Reference to transcript Node for searchability */
  readonly transcriptRef?: string;
}

/**
 * Mixed content: ordered array of text, image, and audio blocks.
 * Used when a single Node or Document contains multiple content types.
 */
export interface MixedContent {
  readonly type: 'mixed';
  /** Ordered array of content blocks (no nesting - blocks are never MixedContent) */
  readonly blocks: ReadonlyArray<TextContent | ImageContent | AudioContent>;
}

// =============================
// Union Type
// =============================

/**
 * The discriminated union of all content types.
 * Use the `type` field to narrow in conditionals or switch statements.
 */
export type Content = TextContent | ImageContent | AudioContent | MixedContent;

/**
 * Content types that can appear inside MixedContent.blocks.
 * MixedContent itself cannot nest.
 */
export type ContentBlock = TextContent | ImageContent | AudioContent;

// =============================
// Type Guards
// =============================

export const isTextContent = (content: Content): content is TextContent =>
  content.type === 'text';

export const isImageContent = (content: Content): content is ImageContent =>
  content.type === 'image';

export const isAudioContent = (content: Content): content is AudioContent =>
  content.type === 'audio';

export const isMixedContent = (content: Content): content is MixedContent =>
  content.type === 'mixed';
