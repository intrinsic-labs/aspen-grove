import type { RenderRules } from 'react-native-markdown-display';
import { bodyRule } from './body-rule';
import { CodeBlock } from './CodeBlock';
import { listItemRule } from './list-item-rule';
import { selectableTextgroup, textgroup } from './textgroup-rule';

/**
 * Render rules that replace the library's defaults: the body spaces its
 * blocks (`blockSpacing`), a block's inline runs share one Text, list
 * items are marked by their own list, and code blocks are syntax
 * highlighted. Module-level so every message shares one rules object.
 */
export const markdownRules: RenderRules = {
  body: bodyRule,

  textgroup,

  // A numbered list nested in a bulleted one keeps its numbers.
  list_item: listItemRule,

  // Fenced code blocks, highlighted in the info string's language
  // (```javascript). sourceInfo exists at runtime but isn't in the types.
  fence: (node) => (
    <CodeBlock
      key={node.key}
      code={node.content || ''}
      language={
        (node as unknown as { sourceInfo?: string }).sourceInfo || 'text'
      }
    />
  ),

  // Indented code blocks (no language specified)
  code_block: (node) => (
    <CodeBlock key={node.key} code={node.content || ''} language="text" />
  ),
};

/** The same rules, with each block's text selectable. */
export const selectableMarkdownRules: RenderRules = {
  ...markdownRules,
  textgroup: selectableTextgroup,
};
