import { describe, expect, it } from '@jest/globals';
import {
  alignRunsToClusters,
  coalesce,
  reconcileWithAncestor,
  replaceInRuns,
  runsLength,
  runsText,
  sliceRuns,
} from './authorship-runs';
import {
  E_ACUTE,
  FAMILY,
  FLAGS,
  HINDI_KI,
  human,
  model,
  SEGMENTER_PATHS,
  useSegmenter,
} from './document-fixtures';

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

describe.each(SEGMENTER_PATHS)(
  'reconcileWithAncestor with %s',
  (_name, useNative) => {
    useSegmenter(useNative);

    const alpha = 'alpha beta gamma';

    it('model → human edit → second edit still resolves original', () => {
      const afterFirst = 'alpha BETA gamma';
      expect(reconcileWithAncestor(alpha, afterFirst)).toEqual([
        model('alpha '),
        human('BETA'),
        model(' gamma'),
      ]);
      // The second edit is measured from the first edit's text, but the
      // ancestor is still the original model passage.
      const afterSecond = 'alpha BETA zzzzz';
      expect(reconcileWithAncestor(alpha, afterSecond)).toEqual([
        model('alpha '),
        human('BETA'),
        model(' '),
        human('zzzzz'),
      ]);
      // Undoing the first edit returns to pure model text.
      expect(reconcileWithAncestor(alpha, alpha)).toEqual([model(alpha)]);
    });

    it('two separated edits keep the unchanged island blue', () => {
      expect(
        reconcileWithAncestor(
          'The quick brown fox jumps',
          'The slow brown cat jumps'
        )
      ).toEqual([
        model('The '),
        human('slow'),
        model(' brown '),
        human('cat'),
        model(' jumps'),
      ]);
    });

    it('repeated words, emoji ZWJ and combining mark stay aligned', () => {
      // Whichever "go" went, what remains is the ancestor's text.
      expect(reconcileWithAncestor('go go stop', 'go stop')).toEqual([
        model('go stop'),
      ]);
      expect(
        reconcileWithAncestor(
          `go ${FAMILY} caf${E_ACUTE} go`,
          `go ${FAMILY} cafe go!`
        )
      ).toEqual([
        model(`go ${FAMILY} caf`),
        human('e'),
        model(' go'),
        human('!'),
      ]);
    });

    it('never splits a cluster: a changed mark makes its whole cluster human', () => {
      expect(reconcileWithAncestor(`caf${E_ACUTE}`, 'caf' + 'è')).toEqual([
        model('caf'),
        human('è'),
      ]);
    });

    it('matches leftmost when the ancestor text could match twice', () => {
      expect(reconcileWithAncestor('a', 'XaYa')).toEqual([
        human('X'),
        model('a'),
        human('Ya'),
      ]);
      expect(reconcileWithAncestor('ab', 'abab')).toEqual([
        model('ab'),
        human('ab'),
      ]);
      expect(reconcileWithAncestor('ab', 'zabab')).toEqual([
        human('z'),
        model('ab'),
        human('ab'),
      ]);
    });

    it('keeps regional-indicator pairs whole', () => {
      expect(reconcileWithAncestor(FLAGS, '🇺🇸🇩🇪')).toEqual([
        model('🇺🇸'),
        human('🇩🇪'),
      ]);
      // A pair that lost one indicator is a new cluster, not a half-match.
      expect(reconcileWithAncestor('🇺🇸', '🇺🇦')).toEqual([human('🇺🇦')]);
    });

    it('keeps Indic spacing marks with their consonant', () => {
      expect(reconcileWithAncestor(`x${HINDI_KI}`, 'xकी')).toEqual([
        model('x'),
        human('की'),
      ]);
      expect(reconcileWithAncestor(HINDI_KI, 'क')).toEqual([human('क')]);
    });

    it('handles empty sides', () => {
      expect(reconcileWithAncestor('abc', '')).toEqual([]);
      expect(reconcileWithAncestor('', 'abc')).toEqual([human('abc')]);
    });

    it('is deterministic and fast for a long passage with a few edits', () => {
      const base = Array.from({ length: 1500 }, (_, i) => `word${i}`).join(' ');
      const edited = base
        .replace('word700', 'CHANGED')
        .replace('word1200 ', '');
      const first = reconcileWithAncestor(base, edited);
      expect(reconcileWithAncestor(base, edited)).toEqual(first);
      expect(runsText(first)).toBe(edited);
      expect(first.filter((run) => run.author === 'human')).toHaveLength(1);
    });
  }
);
