import { describe, expect, it } from '@jest/globals';
import {
  alignRunsToClusters,
  coalesce,
  replaceInRuns,
  runsLength,
  runsText,
  sliceRuns,
} from './authorship-runs';
import { E_ACUTE, human, model } from './document-fixtures';

describe('run helpers', () => {
  it('coalesces neighbours by one author and drops empty runs', () => {
    expect(
      coalesce([model('a'), model(''), model('b'), human('c'), human('d')])
    ).toEqual([model('ab'), human('cd')]);
  });

  it('slices by UTF-16 offsets', () => {
    const runs = [model('abc'), human('def')];
    expect(sliceRuns(runs, 2, 4)).toEqual([model('c'), human('d')]);
    expect(runsLength(runs)).toBe(6);
    expect(runsText(runs)).toBe('abcdef');
  });

  it('replaces a range with human text', () => {
    expect(replaceInRuns([model('abcd')], 1, 3, 'X')).toEqual([
      model('a'),
      human('X'),
      model('d'),
    ]);
  });
});

describe('alignRunsToClusters', () => {
  it('leaves runs whose edges are all on boundaries alone', () => {
    const runs = [model('ab'), human('cd')];
    expect(alignRunsToClusters(runs)).toBe(runs);
  });

  it('gives a cluster cut by a run edge to the human', () => {
    expect(alignRunsToClusters([model('cafe'), human('́!')])).toEqual([
      model('caf'),
      human(`${E_ACUTE}!`),
    ]);
  });
});
