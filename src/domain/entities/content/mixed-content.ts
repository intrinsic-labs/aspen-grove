/**
 * Mixed Content
 *
 * Represents content that contains multiple blocks of different types.
 * Used when a node contains a combination of text, images, and/or audio.
 */

import type { TextContent } from './text-content';
import type { ImageContent } from './image-content';
import type { AudioContent } from './audio-content';

/**
 * A content block within mixed content.
 * Can be any of the primitive content types.
 */
export type ContentBlock = TextContent | ImageContent | AudioContent;

/**
 * Mixed content containing an ordered array of content blocks.
 */
export interface MixedContent {
  readonly type: 'mixed';

  /** Ordered array of content blocks */
  readonly blocks: readonly ContentBlock[];
}

/**
 * Create a MixedContent object
 */
export function createMixedContent(blocks: ContentBlock[]): MixedContent {
  return {
    type: 'mixed',
    blocks: [...blocks],
  };
}

/**
 * Type guard for MixedContent
 */
export function isMixedContent(content: unknown): content is MixedContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as MixedContent).type === 'mixed' &&
    'blocks' in content &&
    Array.isArray((content as MixedContent).blocks)
  );
}
