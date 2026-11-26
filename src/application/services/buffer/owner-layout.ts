import { type Replacement, planReplacements } from './apply-replacement';
import {
  type DocumentRange,
  type RangeOwner,
  TAIL_OWNER,
  sameOwner,
} from './document-ranges';

/**
 * The boundaries between owners and nothing else: where each passage and the
 * tail end, and who keeps left affinity. The editor page tracks this through
 * every edit with the very planner the host reducer uses, so a checkpoint
 * after a revision gap rebuilds the same document the host would have had.
 *
 * Owners are the passages in order, then the tail: `ends` has one entry per
 * passage plus one for the tail, so its last entry is the document's length.
 */
export type OwnerLayout = {
  readonly ends: readonly number[];
  /** Index of the owner that keeps left affinity, until the caret moves. */
  readonly hold?: number;
  /** Where the caret was left by the last edit, in the same units. */
  readonly caret?: number;
};

const passageId = (index: number): string => String(index);

const ownerOfIndex = (layout: OwnerLayout, index: number): RangeOwner =>
  index >= layout.ends.length - 1
    ? TAIL_OWNER
    : { kind: 'passage', id: passageId(index) };

const rangesOf = (layout: OwnerLayout): DocumentRange[] => {
  let start = 0;
  return layout.ends.map((end, index) => {
    const range = { owner: ownerOfIndex(layout, index), start, end };
    start = end;
    return range;
  });
};

/**
 * Whether left affinity survives an edit. The caret moved on purpose unless
 * the edit starts or ends where the last edit left it: typing continues
 * there, backspace deletes behind it and forward delete ahead of it. Only a
 * caret that has not moved keeps `hold`, so this holds whichever order the
 * platform delivers its selection and change events in.
 */
export const keepsHold = (
  caret: number | undefined,
  replacements: readonly Replacement[]
): boolean =>
  caret !== undefined &&
  replacements.some((edit) => edit.start === caret || edit.end === caret);

/** The layout after one transaction, measured against the old layout. */
export const advanceLayout = (
  layout: OwnerLayout,
  replacements: readonly Replacement[],
  caretAfter?: number
): OwnerLayout => {
  const held =
    layout.hold !== undefined && keepsHold(layout.caret, replacements)
      ? layout.hold
      : undefined;
  const ranges = rangesOf(layout);
  const length = layout.ends[layout.ends.length - 1] ?? 0;
  const plan = planReplacements(
    { ranges, length },
    replacements,
    held === undefined ? undefined : ownerOfIndex(layout, held)
  );
  const delta = layout.ends.map(() => 0);
  for (const step of plan.steps) {
    const at = ranges.indexOf(step.range);
    delta[at] += step.inserted.length - (step.to - step.from);
  }
  let end = 0;
  const ends = layout.ends.map((old, at) => {
    end += old - (at === 0 ? 0 : layout.ends[at - 1]) + delta[at];
    return end;
  });
  const affinity =
    plan.steps.length === 0
      ? held
      : ranges.findIndex((range) => sameOwner(range.owner, plan.affinity));
  return { ends, hold: affinity, caret: caretAfter };
};
