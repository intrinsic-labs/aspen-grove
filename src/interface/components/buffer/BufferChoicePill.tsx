import { useCallback } from 'react';
import type { BufferSwitchAction } from '@application/services/buffer/buffer-draft';
import type { PillChoice } from './buffer-choice-pill';
import { BufferSiblingControl } from './BufferSiblingControl';

type BufferChoicePillProps = {
  readonly choice: PillChoice;
  readonly onSwitch: (action: BufferSwitchAction) => void;
};

/** The pill for a real position's branches or versions; each step is that entry's own action. */
export const BufferChoicePill = ({
  choice,
  onSwitch,
}: BufferChoicePillProps) => {
  const { kind, set, label } = choice;
  const select = useCallback(
    (index: number) => {
      const entry = set.entries[index];
      if (entry) onSwitch(entry.action);
    },
    [onSwitch, set]
  );
  return (
    <BufferSiblingControl
      kind={kind}
      index={set.active}
      count={set.entries.length}
      label={label}
      onSelect={select}
    />
  );
};
