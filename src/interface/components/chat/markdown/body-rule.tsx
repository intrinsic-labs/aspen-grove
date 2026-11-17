import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderFunction } from 'react-native-markdown-display';
import { blockSpacing } from './block-spacing';

/**
 * The message's blocks in a column, each pair `blockSpacing` apart: a blank
 * line between paragraphs, lists and headings, Latent Spaces' tighter 12 pt
 * around a code block.
 */
export const bodyRule: RenderFunction = (node, children, _parents, styles) => {
  const lineHeight = Number(StyleSheet.flatten(styles.body)?.lineHeight ?? 0);
  return (
    <View key={node.key} style={styles._VIEW_SAFE_body}>
      {children.map((child, index) => (
        <Fragment key={node.children[index]?.key ?? index}>
          {index > 0 ? (
            <View
              style={{
                height: blockSpacing(
                  node.children[index - 1].type,
                  node.children[index].type,
                  lineHeight
                ),
              }}
            />
          ) : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
};
