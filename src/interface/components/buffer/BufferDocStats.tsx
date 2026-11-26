import { StyleSheet, Text } from 'react-native';
import type { AppliedReceipt } from './android/buffer-web-editor-props';

type BufferDocStatsProps = {
  /** The accepted document's full length, in UTF-16 units. */
  readonly length: number;
  readonly receipt: AppliedReceipt | null;
};

/**
 * Developer-preview measurement receipt: the document's full length and the
 * caret as of the last applied revision, readable by Maestro or adb
 * (`buffer-doc-stats`, `len=… head=… rev=…`). The editor's own accessibility
 * text covers only the viewport, so a long document's size can't be read
 * from it. A real but unobtrusive box: invisible text, tiny, no touches.
 */
export const BufferDocStats = ({ length, receipt }: BufferDocStatsProps) => (
  <Text
    testID="buffer-doc-stats"
    pointerEvents="none"
    style={styles.stats}
  >
    {`len=${length} head=${receipt?.head ?? 0} rev=${receipt?.revision ?? 0}`}
  </Text>
);

const styles = StyleSheet.create({
  stats: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 160,
    height: 12,
    fontSize: 8,
    color: 'transparent',
  },
});
