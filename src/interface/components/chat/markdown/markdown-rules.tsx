import type { RenderRules } from 'react-native-markdown-display';
import { CodeBlock } from './CodeBlock';

/**
 * Render rules that replace the library's defaults: text groups pass their
 * children through, and code blocks are syntax highlighted. Module-level so
 * every message shares one rules object.
 */
export const markdownRules: RenderRules = {
  // Ensure text nodes inherit proper styling
  textgroup: (node, children) => children,

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
