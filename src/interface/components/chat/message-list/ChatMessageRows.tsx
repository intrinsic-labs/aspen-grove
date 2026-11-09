import { useEffect } from 'react';
import type { LayoutChangeEvent, TextStyle } from 'react-native';
import type { ULID } from '@domain/value-objects';
import type { SpeakingRow } from '../read-aloud/useChatReadAloud';
import type { ChatDisplayPreferences, ChatRow } from '../types';
import { ChatMessageRow } from './ChatMessageRow';
import type { ContinuationRailState } from './continuation-rail-state';
import type { ChatMessageMenuAction } from './message-menu';
import { useProgressiveRows } from './useProgressiveRows';

type ChatMessageRowsProps = {
  readonly rows: readonly ChatRow[];
  /** The screen has finished sliding in: earlier rows may fill in. */
  readonly settled: boolean;
  /** True while earlier rows are still being mounted above. */
  readonly onFillingChange: (filling: boolean) => void;
  readonly railSourceNodeId: ULID | null;
  readonly continuationRail: ContinuationRailState;
  readonly messageTextStyle: TextStyle;
  readonly displayPreferences: ChatDisplayPreferences;
  readonly speakingRow: SpeakingRow | null;
  readonly captionIconColor: string;
  readonly captionTextColor: string;
  readonly onPress: (nodeId: ULID) => void;
  readonly onLongPress: (nodeId: ULID) => void;
  readonly onMessageAction: (
    nodeId: string,
    action: ChatMessageMenuAction
  ) => void;
  readonly onRowLayout: (nodeId: ULID, event: LayoutChangeEvent) => void;
  readonly onRailLayout: (nodeId: ULID, event: LayoutChangeEvent) => void;
};

/**
 * The path's rows, mounted tail first (`useProgressiveRows`): a long tree
 * shows its last messages at once and fills in the earlier ones above.
 * Rows don't animate their moves (a rail opening above them): layout
 * transitions on every row cost more than the slices, break keeping the
 * visible rows in place while earlier ones are prepended, and switched on
 * afterwards they leave a re-laid-out bubble's text clipped.
 * Renders a fragment, so each row stays a direct child of the scroll
 * content.
 */
export const ChatMessageRows = ({
  rows,
  settled,
  onFillingChange,
  railSourceNodeId,
  continuationRail,
  speakingRow,
  ...rowProps
}: ChatMessageRowsProps) => {
  const { rows: visibleRows, complete } = useProgressiveRows(rows, settled);

  useEffect(() => {
    onFillingChange(!complete);
  }, [complete, onFillingChange]);

  useEffect(() => () => onFillingChange(false), [onFillingChange]);

  return (
    <>
      {visibleRows.map((row) => (
        <ChatMessageRow
          key={row.id}
          row={row}
          rail={railSourceNodeId === row.id ? continuationRail : null}
          speakingColor={
            speakingRow?.nodeId === row.id ? speakingRow.color : undefined
          }
          {...rowProps}
        />
      ))}
    </>
  );
};
