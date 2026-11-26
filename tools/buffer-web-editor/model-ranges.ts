import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { invertedEffects } from '@codemirror/commands';
import {
  mapModelRangesThrough,
  type ModelRange,
  type Replacement,
} from '../../src/interface/components/buffer/android/web-editor-protocol';

/**
 * Sets the model ranges outright. A transaction carrying it states the
 * ranges as they are after the transaction, so mapping is skipped.
 */
export const setModelRanges = StateEffect.define<readonly ModelRange[]>();

/**
 * Model-authored ranges as plain offsets. They map through edits by the
 * rule the host shares (text typed inside a model range is human) and are
 * registered with history: every document change records the ranges it
 * started from as an inverted effect, so undo and redo restore the text and
 * its authorship in the same transaction.
 */
export const modelRangesField = StateField.define<readonly ModelRange[]>({
  create: () => [],
  update(ranges, transaction) {
    let stated: readonly ModelRange[] | undefined;
    for (const effect of transaction.effects) {
      if (effect.is(setModelRanges)) {
        stated = effect.value;
      }
    }
    if (stated) {
      return stated;
    }
    if (!transaction.docChanged) {
      return ranges;
    }
    const replacements: Replacement[] = [];
    transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) =>
      replacements.push({ from, to, insert: inserted.toString() })
    );
    return mapModelRangesThrough(ranges, replacements);
  },
});

/** The ranges seeded at creation: a load is not an undo step. */
export const modelRanges = (initial: readonly ModelRange[]): Extension => [
  modelRangesField.init(() => initial),
  invertedEffects.of((transaction) =>
    transaction.docChanged
      ? [setModelRanges.of(transaction.startState.field(modelRangesField))]
      : []
  ),
];
