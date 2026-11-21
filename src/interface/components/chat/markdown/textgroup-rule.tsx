import { Text } from 'react-native';
import type { RenderFunction } from 'react-native-markdown-display';

/**
 * A block's inline runs (text, bold, italic, inline code, links) as one
 * Text with nested spans, so they wrap as one line of text. Left as
 * siblings, they'd sit in the paragraph's wrapping row and each styled run
 * would break onto a line of its own. `selectable` lets the reader copy
 * the block's text (a node's sheet, as Latent Spaces' Node Info allows).
 */
const textgroupRule =
  (selectable: boolean): RenderFunction =>
  (node, children, _parents, styles) => (
    <Text key={node.key} style={styles.textgroup} selectable={selectable}>
      {children}
    </Text>
  );

export const textgroup = textgroupRule(false);
export const selectableTextgroup = textgroupRule(true);
