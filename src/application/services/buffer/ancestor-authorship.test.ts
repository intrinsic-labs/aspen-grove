import { describe, expect, it } from '@jest/globals';
import { reconcileRuns, reconcileWithAncestor } from './ancestor-authorship';
import { runsText } from './authorship-runs';
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

describe.each(SEGMENTER_PATHS)(
  'reconcileWithAncestor with %s',
  (_name, useNative) => {
    useSegmenter(useNative);

    const alpha = 'alpha beta gamma';

    it('model → human edit → second edit still resolves original', () => {
      expect(reconcileWithAncestor(alpha, 'alpha BETA gamma')).toEqual([
        model('alpha '),
        human('BETA'),
        model(' gamma'),
      ]);
      expect(reconcileWithAncestor(alpha, 'alpha BETA zzzzz')).toEqual([
        model('alpha '),
        human('BETA'),
        model(' '),
        human('zzzzz'),
      ]);
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

    it('delta over beta stays human', () => {
      // "e" and "ta" are common to both words; neither reads as the model's.
      expect(reconcileWithAncestor('a beta b', 'a delta b')).toEqual([
        model('a '),
        human('delta'),
        model(' b'),
      ]);
    });

    it('a 5k-grapheme passage with one edit stays exact', () => {
      const base = Array.from({ length: 1400 }, (_, i) => `w${i % 10}x`).join(
        ' '
      );
      expect(base.length).toBeGreaterThan(5000);
      const edited = base.replace('w5x', 'ZZ');
      const runs = reconcileWithAncestor(base, edited);
      expect(runsText(runs)).toBe(edited);
      expect(runs.filter((run) => run.author === 'human')).toEqual([
        human('ZZ'),
      ]);
    });

    it('stays exact for two far-apart edits in a long passage', () => {
      const base = Array.from({ length: 1400 }, (_, i) => `w${i % 10}x`).join(
        ' '
      );
      const edited = base
        .replace('w5x', 'ZZ')
        .replace(/w3x w4x w5x w6x w7x w8x w9x$/, 'END');
      const runs = reconcileWithAncestor(base, edited);
      expect(runsText(runs)).toBe(edited);
      expect(runs.filter((run) => run.author === 'human')).toEqual([
        human('ZZ'),
        human('END'),
      ]);
    });

    it('repeated words, emoji ZWJ and combining mark stay aligned', () => {
      expect(reconcileWithAncestor('go go stop', 'go stop')).toEqual([
        model('go stop'),
      ]);
      expect(
        reconcileWithAncestor(
          `go ${FAMILY} caf${E_ACUTE} go`,
          `go ${FAMILY} cafe go!`
        )
      ).toEqual([
        model(`go ${FAMILY} `),
        human('cafe'),
        model(' go'),
        human('!'),
      ]);
    });

    it('never splits a cluster: a changed mark makes its whole cluster human', () => {
      expect(reconcileWithAncestor(`x ${E_ACUTE}`, 'x è')).toEqual([
        model('x '),
        human('è'),
      ]);
      expect(reconcileWithAncestor(`caf${E_ACUTE}`, 'cafè')).toEqual([
        human('cafè'),
      ]);
    });

    it('matches leftmost when the ancestor text could match twice', () => {
      expect(reconcileWithAncestor('a', 'X a Y a')).toEqual([
        human('X '),
        model('a'),
        human(' Y a'),
      ]);
      expect(reconcileWithAncestor('ab', 'ab ab')).toEqual([
        model('ab'),
        human(' ab'),
      ]);
      expect(reconcileWithAncestor('ab', 'z ab ab')).toEqual([
        human('z '),
        model('ab'),
        human(' ab'),
      ]);
    });

    it('keeps each regional-indicator pair whole', () => {
      expect(reconcileWithAncestor(FLAGS, '🇺🇸🇩🇪')).toEqual([
        model('🇺🇸'),
        human('🇩🇪'),
      ]);
      expect(reconcileWithAncestor('🇺🇸', '🇺🇦')).toEqual([human('🇺🇦')]);
    });

    it('keeps Indic spacing marks with their consonant', () => {
      expect(reconcileWithAncestor(`x ${HINDI_KI}`, 'x की')).toEqual([
        model('x '),
        human('की'),
      ]);
      expect(reconcileWithAncestor(HINDI_KI, 'क')).toEqual([human('क')]);
    });

    it('keeps punctuation runs and whitespace as tokens of their own', () => {
      expect(reconcileWithAncestor('Wait... what?', 'Wait! what?')).toEqual([
        model('Wait'),
        human('!'),
        model(' what?'),
      ]);
    });

    it('handles empty sides', () => {
      expect(reconcileWithAncestor('abc', '')).toEqual([]);
      expect(reconcileWithAncestor('', 'abc')).toEqual([human('abc')]);
    });

    it('beyond the edit bound degrades to common ends, never to wrong text', () => {
      const base = Array.from({ length: 3000 }, (_, i) => `w${i}`).join(' ');
      const edited = base.replace('w10 ', 'NEW ').replace('w2900 ', '');
      const runs = reconcileRuns([model(base)], edited, 20);
      expect(runsText(runs)).toBe(edited);
      expect(runs[0]).toEqual(model('w0 w1 w2 w3 w4 w5 w6 w7 w8 w9 '));
      expect(runs.some((run) => run.author === 'human')).toBe(true);
      expect(runs[runs.length - 1]?.author).toBe('model');
    });
  }
);

describe('reconcileRuns keeps the ancestor’s own authors', () => {
  it('a human word inside model text stays human where it matches', () => {
    const ancestor = [
      model('the lamps along the '),
      human('old'),
      model(' harbour'),
    ];
    expect(reconcileRuns(ancestor, 'the lamps along the old harbour')).toEqual(
      ancestor
    );
    expect(reconcileRuns(ancestor, 'the lamps along the harbour')).toEqual([
      model('the lamps along the harbour'),
    ]);
  });
});
