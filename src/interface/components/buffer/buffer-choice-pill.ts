import type {
  BufferChoiceSet,
  BufferPositionChoices,
} from '@application/services/buffer/buffer-choices';

export type PillChoice = {
  readonly kind: 'branch' | 'version';
  readonly set: BufferChoiceSet;
  readonly label: string;
};

const labelOf = (kind: 'branch' | 'version', set: BufferChoiceSet): string =>
  `${kind === 'branch' ? 'Branch' : 'Version'} ${set.active + 1} of ${set.entries.length}`;

/**
 * What the pill shows at one position: its branches when it has more than one
 * child family, otherwise its versions when more than one is reachable, else
 * nothing. When a position has both, branches win and its versions are not
 * offered (an open design question).
 */
export const pillChoice = (
  choices: BufferPositionChoices | undefined
): PillChoice | undefined => {
  if (!choices) return undefined;
  for (const kind of ['branch', 'version'] as const) {
    const set = kind === 'branch' ? choices.branches : choices.versions;
    if (set.entries.length > 1 && set.active >= 0)
      return { kind, set, label: labelOf(kind, set) };
  }
  return undefined;
};
