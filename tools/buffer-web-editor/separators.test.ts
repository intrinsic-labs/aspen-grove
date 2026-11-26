import {
  mapBreaks,
  restoreSeparators,
  splitSeparators,
  toHostOffset,
  toPageOffset,
  withBreaks,
} from './separators';

/** The brief's multiline sample: LF, a blank line, then two CRLFs (32 units). */
const SAMPLE = 'AA\tBB\n\nCC \u{1F469}‍\u{1F469}‍\u{1F467} é DD\r\nEE\r\nFF';

describe('splitSeparators', () => {
  it('leaves LF-only text alone', () => {
    expect(splitSeparators('a\nb')).toEqual({ text: 'a\nb', breaks: [] });
  });

  it('shows every break as LF and remembers the others', () => {
    expect(splitSeparators('a\r\nb\nc\rd')).toEqual({
      text: 'a\nb\nc\nd',
      breaks: [
        [1, '\r\n'],
        [5, '\r'],
      ],
    });
  });

  it('round-trips mixed separators byte for byte', () => {
    const { text, breaks } = splitSeparators(SAMPLE);
    expect(text.length).toBe(SAMPLE.length - 2);
    expect(restoreSeparators(text, breaks)).toBe(SAMPLE);
  });
});

describe('offsets', () => {
  const { breaks } = splitSeparators('ab\r\ncd\ne\rf\r\ng');
  // page: a b \n c d \n e \n f \n g   (breaks at 2 CRLF, 7 CR, 9 CRLF)

  it('counts a CRLF as two host units and a CR as one', () => {
    expect(breaks).toEqual([
      [2, '\r\n'],
      [7, '\r'],
      [9, '\r\n'],
    ]);
    expect(toHostOffset(breaks, 2)).toBe(2);
    expect(toHostOffset(breaks, 3)).toBe(4);
    expect(toHostOffset(breaks, 8)).toBe(9);
    expect(toHostOffset(breaks, 11)).toBe(13);
  });

  it('inverts, and clamps the middle of a CRLF to before the pair', () => {
    for (let page = 0; page <= 11; page++) {
      expect(toPageOffset(breaks, toHostOffset(breaks, page))).toBe(page);
    }
    expect(toPageOffset(breaks, 3)).toBe(2);
  });
});

describe('mapBreaks', () => {
  it('drops breaks in the replaced range and shifts later ones', () => {
    const breaks = splitSeparators('a\r\nb\r\nc').breaks; // [1, 3]
    expect(mapBreaks(breaks, 0, 2, 5)).toEqual([[6, '\r\n']]);
    expect(mapBreaks(breaks, 2, 3, 0)).toEqual([
      [1, '\r\n'],
      [2, '\r\n'],
    ]);
  });

  it('adds breaks an insert brings, in order', () => {
    expect(withBreaks([[9, '\r']], [[3, '\r\n']])).toEqual([
      [3, '\r\n'],
      [9, '\r'],
    ]);
  });
});
