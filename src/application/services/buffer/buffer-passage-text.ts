import type { Node } from '@domain/entities';

/**
 * Text of a node as written. Text nodes give their text, mixed nodes the
 * concatenation of their text blocks, image and audio give nothing.
 * Annotation nodes never reach here: path resolution follows continuation
 * edges only.
 */
export const bufferPassageText = (node: Node): string => {
  const { content } = node;
  if (content.type === 'text') return content.text;
  if (content.type === 'mixed') {
    return content.blocks
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');
  }
  return '';
};
