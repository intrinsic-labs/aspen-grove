/**
 * Content Types Union
 *
 * Unified content type for Node content.
 * Uses discriminated union pattern for type-safe content handling.
 */

import { TextContent, isTextContent } from './text-content';
import { ImageContent, isImageContent } from './image-content';
import { AudioContent, isAudioContent } from './audio-content';
import { MixedContent, isMixedContent } from './mixed-content';

/**
 * Content type discriminator values
 */
export type ContentType = 'text' | 'image' | 'audio' | 'mixed';

/**
 * Unified content type - discriminated union of all content types.
 * Every Node contains exactly one Content value.
 */
export type Content = TextContent | ImageContent | AudioContent | MixedContent;

/**
 * Type guard for any valid Content
 */
export function isContent(value: unknown): value is Content {
  return (
    isTextContent(value) ||
    isImageContent(value) ||
    isAudioContent(value) ||
    isMixedContent(value)
  );
}

/**
 * Get the content type discriminator
 */
export function getContentType(content: Content): ContentType {
  return content.type;
}

/**
 * Extract plain text from any content type.
 * Useful for search indexing and summarization.
 */
export function extractText(content: Content): string {
  switch (content.type) {
    case 'text':
      return content.text;

    case 'image':
      return content.altText ?? '';

    case 'audio':
      // Transcript would need to be loaded separately
      return '';

    case 'mixed':
      return content.blocks
        .map((block) => {
          if (block.type === 'text') return block.text;
          if (block.type === 'image') return block.altText ?? '';
          return '';
        })
        .filter(Boolean)
        .join('\n');
  }
}

/**
 * Check if content has any text
 */
export function hasText(content: Content): boolean {
  return extractText(content).length > 0;
}

/**
 * Check if content contains images
 */
export function hasImages(content: Content): boolean {
  if (content.type === 'image') return true;
  if (content.type === 'mixed') {
    return content.blocks.some((block) => block.type === 'image');
  }
  return false;
}

/**
 * Check if content contains audio
 */
export function hasAudio(content: Content): boolean {
  if (content.type === 'audio') return true;
  if (content.type === 'mixed') {
    return content.blocks.some((block) => block.type === 'audio');
  }
  return false;
}
