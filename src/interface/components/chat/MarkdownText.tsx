import { memo, useMemo } from 'react';
import type { TextStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useAspenGroveTheme } from '../../hooks/useAspenGroveTheme';
import {
  parseMarkdown,
  parseMarkdownUncached,
  sharedMarkdownIt,
} from './markdown/markdown-parse';
import {
  markdownRules,
  selectableMarkdownRules,
} from './markdown/markdown-rules';
import { createMarkdownStyles } from './markdown/markdown-styles';

type MarkdownTextProps = {
  readonly children: string;
  readonly baseStyle?: TextStyle;
  /** Text still being written (streaming): parsed without caching. */
  readonly transient?: boolean;
  /** The reader can select and copy each block's text. */
  readonly selectable?: boolean;
};

/**
 * Renders markdown content using native components.
 * Styled to match Aspen Grove's typography and theme. The text is parsed
 * once per distinct message (`parseMarkdown`), so pass a stable `baseStyle`
 * and the component only re-renders when the text or style changes.
 */
export const MarkdownText = memo(
  ({
    children,
    baseStyle,
    transient = false,
    selectable = false,
  }: MarkdownTextProps) => {
    const { colors } = useAspenGroveTheme();

    const styles = useMemo(
      () => createMarkdownStyles(baseStyle, colors),
      [baseStyle, colors]
    );

    const ast = transient
      ? parseMarkdownUncached(children)
      : parseMarkdown(children);

    return (
      <Markdown
        style={styles}
        rules={selectable ? selectableMarkdownRules : markdownRules}
        mergeStyle
        markdownit={sharedMarkdownIt}
      >
        {/* A parsed tree renders as is: markdown-display parses strings only. */}
        {ast as unknown as string}
      </Markdown>
    );
  }
);
