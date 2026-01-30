/**
 * Content Module
 *
 * Exports all content types used in Nodes and Documents.
 */

// Base content types
export type { TextContent } from './text-content';
export { isTextContent, createTextContent } from './text-content';

export type { ImageContent } from './image-content';
export { isImageContent, createImageContent } from './image-content';

export type { AudioContent } from './audio-content';
export { isAudioContent, createAudioContent } from './audio-content';

export type { MixedContent, ContentBlock } from './mixed-content';
export { isMixedContent, createMixedContent } from './mixed-content';

// Union type and utilities
export type { Content, ContentType } from './content';
export { isContent, getContentType, extractText, hasText, hasImages, hasAudio } from './content';
