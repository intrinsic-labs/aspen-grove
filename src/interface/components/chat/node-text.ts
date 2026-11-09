import type { Content } from '@domain/entities';

/**
 * Flattens content to the plain text a model or the clipboard would see.
 * Non-text blocks contribute nothing; mixed blocks join with newlines.
 */
export const contentToPlainText = (content: Content): string => {
  switch (content.type) {
    case 'text':
      return content.text;
    case 'mixed':
      return content.blocks.map(contentToPlainText).join('\n');
    default:
      return '';
  }
};

/**
 * One-line stand-in for a node's content: its text, or `[type]` for
 * non-text content (copy, edit prefill).
 */
export const contentToDisplayText = (content: Content): string =>
  content.type === 'text' ? content.text : `[${content.type}]`;
