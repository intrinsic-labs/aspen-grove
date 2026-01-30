/**
 * Text Content
 *
 * Represents text-based content within a Node.
 * Text is markdown-compatible for rich formatting.
 */

export interface TextContent {
  readonly type: 'text';

  /** The text content, markdown-compatible */
  readonly text: string;
}

/**
 * Type guard for TextContent
 */
export function isTextContent(content: unknown): content is TextContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'text' &&
    'text' in content &&
    typeof (content as TextContent).text === 'string'
  );
}

/**
 * Create a TextContent object
 */
export function createTextContent(text: string): TextContent {
  return {
    type: 'text',
    text,
  };
}
