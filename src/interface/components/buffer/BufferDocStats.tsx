import { StyleSheet, Text } from 'react-native';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
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
 * from it. A real but unobtrusive box: near-invisible text, tiny, no touches.
 */
export const BufferDocStats = ({ length, receipt }: BufferDocStatsProps) => (
  <Text
    testID="buffer-doc-stats"
    pointerEvents="none"
    // A measurement receipt, not content: TalkBack must not read it out.
    importantForAccessibility="no-hide-descendants"
    accessibilityElementsHidden
    style={styles.stats}
  >
    {`len=${length} head=${receipt?.head ?? 0} rev=${receipt?.revision ?? 0}`}
  </Text>
);

const styles = StyleSheet.create({
  stats: {
    position: 'absolute',
    // Clear of the status bar and header, where Maestro's hierarchy keeps it.
    top: 120,
    right: 0,
    width: 160,
    height: 12,
    fontSize: 8,
    // Near-black on the black page: present, not readable by eye.
    color: bufferTokens.colors.receipt,
  },
});
