import { describe, expect, it } from '@jest/globals';
import {
  applyEdits,
  documentRuns as previewRuns,
  documentText as previewText,
  emptyPreview,
  previewDocument,
  type PreviewDocument as PreviewState,
} from './buffer-preview-document';
import { samplePreview } from './buffer-preview-sample';

const applyPreviewEdit = (
  doc: PreviewState,
  edit: { start: number; end: number; inserted: string }
) => applyEdits(doc, [edit]);
import type { BufferSelection } from './derive-replacement';
import { createChangeTracker } from './native-change-tracker';

/**
 * A stand-in for the native input and its React parent: it holds the
 * document, feeds the tracker the strings a keyboard would produce, applies
 * each reported edit and syncs the tracker as a render would.
 */
const editor = (initial: PreviewState) => {
  let state = initial;
  const tracker = createChangeTracker(previewText(state));
  return {
    get state() {
      return state;
    },
    set state(value: PreviewState) {
      state = value;
    },
    get text() {
      return previewText(state);
    },
    get runs() {
      return previewRuns(state).map((run) => [run.author, run.text]);
    },
    /** The native string became `next`; `selection` is what the view held. */
    native(next: string, selection: BufferSelection | null, render = true) {
      const edit = tracker.receive(next, selection);
      if (edit) {
        state = applyPreviewEdit(state, edit);
      }
      if (render) {
        tracker.sync(previewText(state));
      }
      return edit;
    },
    render() {
      tracker.sync(previewText(state));
    },
  };
};

const caret = (at: number): BufferSelection => ({ start: at, end: at });
const SEAM = 'The snow had been falling since dawn. '.length;
const sample = () => editor(samplePreview());

describe('mid-word autocorrect', () => {
  it('rewrites a typed word and keeps the model words around it', () => {
    const e = editor(
      previewDocument({
        prefix: [],
        endings: [[{ author: 'model', text: 'The quikc brown fox' }]],
      })
    );
    // Space typed after "quikc": autocorrect makes it "quick" plus the space.
    e.native('The quick  brown fox', caret(9));
    expect(e.runs).toEqual([
      ['model', 'The qui'],
      ['human', 'ck '],
      ['model', ' brown fox'],
    ]);
  });

  it('corrects a word the human is typing at the end', () => {
    const e = editor(emptyPreview());
    e.native('I', caret(0));
    e.native('I ', caret(1));
    e.native('I t', caret(2));
    e.native('I te', caret(3));
    e.native('I teh', caret(4));
    const edit = e.native('I the ', caret(5));
    expect(edit).toEqual({ start: 3, end: 5, inserted: 'he ' });
    expect(e.runs).toEqual([['human', 'I the ']]);
  });

  it('autocorrect reaching across a human/model seam leaves a clean seam', () => {
    const e = editor(
      previewDocument({
        prefix: [{ author: 'human', text: 'We wnt' }],
        endings: [[{ author: 'model', text: ' home now.' }]],
      })
    );
    // "wnt" becomes "went"; the model's text is untouched.
    e.native('We went home now.', caret(6));
    expect(e.text).toBe('We went home now.');
    expect(e.runs).toEqual([
      ['human', 'We went'],
      ['model', ' home now.'],
    ]);
  });
});

describe('a paste over a selection across a human/model seam', () => {
  it('replaces the span, the paste is the human prefix owner', () => {
    const e = sample();
    const before = e.text;
    const sel = { start: SEAM - 5, end: SEAM + 8 };
    const pasted = ' PASTED ';
    e.native(before.slice(0, sel.start) + pasted + before.slice(sel.end), sel);
    expect(e.text).toBe(
      before.slice(0, sel.start) + pasted + before.slice(sel.end)
    );
    const runs = e.runs;
    expect(runs[0]).toEqual([
      'human',
      'The snow had been falling since dawn. '.slice(0, SEAM - 5) + pasted,
    ]);
    expect(runs[1]?.[0]).toBe('model');
    expect(runs[1]?.[1]?.startsWith('whole town')).toBe(false);
    expect(runs.map((r) => r[1]).join('')).toBe(e.text);
  });

  it('a paste ending exactly on the seam does not recolor the model text', () => {
    const e = sample();
    const before = e.text;
    e.native(before.slice(0, 4) + 'X' + before.slice(SEAM), {
      start: 4,
      end: SEAM,
    });
    expect(e.runs[0]).toEqual(['human', 'The X']);
    expect(e.runs[1]?.[0]).toBe('model');
  });

  it('select-all and paste replaces everything with human text', () => {
    const e = sample();
    const total = e.text.length;
    e.native('Fresh start.', { start: 0, end: total });
    expect(e.runs).toEqual([['human', 'Fresh start.']]);
  });
});

describe('CJK marked text', () => {
  it('follows pinyin composition and commits one human run', () => {
    const e = editor(
      previewDocument({
        prefix: [{ author: 'human', text: 'Hi ' }],
        endings: [[{ author: 'model', text: ' there.' }]],
      })
    );
    // Marked text: each keystroke rewrites the marked range.
    e.native('Hi n there.', caret(3));
    e.native('Hi ni there.', caret(4));
    e.native('Hi ni h there.', caret(5));
    expect(e.text).toBe('Hi ni h there.');
    // Candidate chosen: the marked range becomes the committed text.
    e.native('Hi 你好 there.', caret(8));
    expect(e.text).toBe('Hi 你好 there.');
    expect(e.runs).toEqual([
      ['human', 'Hi 你好'],
      ['model', ' there.'],
    ]);
  });

  it('composes inside a model run without recoloring it', () => {
    const e = editor(
      previewDocument({
        prefix: [],
        endings: [[{ author: 'model', text: 'abcdef' }]],
      })
    );
    e.native('abcnxdef', caret(3));
    e.native('abcnixdef'.replace('nix', 'ni'), caret(4));
    e.native('abc你def', caret(5));
    expect(e.text).toBe('abc你def');
    expect(e.runs).toEqual([
      ['model', 'abc'],
      ['human', '你'],
      ['model', 'def'],
    ]);
  });

  it('replaces marked kana with its kanji on a stale selection', () => {
    const e = editor(emptyPreview());
    e.native('か', caret(0));
    e.native('かん', caret(1));
    // The selection event for "かん" has not arrived: still the old caret.
    e.native('漢', caret(1));
    expect(e.text).toBe('漢');
    expect(e.runs).toEqual([['human', '漢']]);
  });
});

describe('emoji and combining marks', () => {
  const mid = () =>
    editor(
      previewDocument({
        prefix: [],
        endings: [[{ author: 'model', text: 'ab' }]],
      })
    );

  it('inserts an emoji (a surrogate pair) as one human run', () => {
    const e = mid();
    e.native('a😀b', caret(1));
    expect(e.runs).toEqual([
      ['model', 'a'],
      ['human', '😀'],
      ['model', 'b'],
    ]);
  });

  it('backspace removes the whole pair', () => {
    const e = mid();
    e.native('a😀b', caret(1));
    e.native('ab', caret(3));
    expect(e.runs).toEqual([['model', 'ab']].map(([a, t]) => [a, t]));
  });

  it('replacing an emoji by one sharing its high surrogate never splits a pair', () => {
    const e = editor(
      previewDocument({
        prefix: [{ author: 'human', text: 'x' }],
        endings: [[{ author: 'model', text: '😀y' }]],
      })
    );
    // U+1F600 -> U+1F601 differ only in the low surrogate.
    e.native('x😁y', null);
    expect(e.text).toBe('x😁y');
    for (const [, text] of e.runs) {
      expect(text).toBe(text.normalize('NFC'));
      // No run starts with a low surrogate or ends with a high one.
      expect(/^[\uDC00-\uDFFF]/.test(text as string)).toBe(false);
      expect(/[\uD800-\uDBFF]$/.test(text as string)).toBe(false);
    }
  });

  it('a skin-tone change stays one cluster', () => {
    const e = editor(
      previewDocument({
        prefix: [],
        endings: [[{ author: 'model', text: '👍🏽!' }]],
      })
    );
    e.native('👍🏿!', null);
    expect(e.text).toBe('👍🏿!');
    for (const [, text] of e.runs) {
      expect(/^[\uDC00-\uDFFF]/.test(text as string)).toBe(false);
      expect(/[\uD800-\uDBFF]$/.test(text as string)).toBe(false);
    }
    // The modifier never starts a run on its own.
    expect(e.runs.some(([, t]) => (t as string).startsWith('🏿'))).toBe(false);
  });

  it('deleting a ZWJ family removes the cluster, nothing else', () => {
    const family = '👨‍👩‍👧';
    const e = editor(
      previewDocument({
        prefix: [],
        endings: [[{ author: 'model', text: `a${family}b` }]],
      })
    );
    e.native('ab', caret(1 + family.length));
    expect(e.runs).toEqual([['model', 'ab']]);
  });

  it('a combining accent changed in place replaces its base too', () => {
    const e = editor(
      previewDocument({
        prefix: [],
        endings: [[{ author: 'model', text: 'café!' }]],
      })
    );
    // acute -> grave: the cluster is rewritten, not just its mark.
    e.native('cafè!', null);
    expect(e.text).toBe('cafè!');
    expect(e.runs.some(([, t]) => (t as string).startsWith('̀'))).toBe(false);
    expect(e.runs).toEqual([
      ['model', 'caf'],
      ['human', 'è'],
      ['model', '!'],
    ]);
  });

  it('typing a combining mark after a model letter makes the cluster human', () => {
    const e = editor(
      previewDocument({
        prefix: [],
        endings: [[{ author: 'model', text: 'cafe!' }]],
      })
    );
    e.native('café!', caret(4));
    expect(e.runs).toEqual([
      ['model', 'caf'],
      ['human', 'é'],
      ['model', '!'],
    ]);
  });
});

describe('undo', () => {
  it('restores a previous value and the colors that went with it', () => {
    const e = sample();
    const original = e.text;
    const runsBefore = e.runs;
    const at = original.indexOf('quiet') + 3;
    e.native(original.slice(0, at) + 'ZZ' + original.slice(at), caret(at));
    expect(e.runs).not.toEqual(runsBefore);
    // Native undo returns the exact previous string, caret after the removal.
    e.native(original, caret(at + 2));
    expect(e.text).toBe(original);
    expect(e.runs).toEqual(runsBefore);
  });

  it('undoes a paste across the seam back to the original text', () => {
    const e = sample();
    const original = e.text;
    e.native(original.slice(0, SEAM - 3) + '#' + original.slice(SEAM + 4), {
      start: SEAM - 3,
      end: SEAM + 4,
    });
    e.native(original, caret(SEAM - 2));
    expect(e.text).toBe(original);
    // The text is exact; the pasted-over span is human now, which is the
    // documented rule (nothing recovers authorship from a string alone).
    expect(e.runs.map((r) => r[1]).join('')).toBe(original);
  });
});

describe('iOS double onChange', () => {
  it('applies the first character into an empty input once', () => {
    const e = editor(emptyPreview());
    e.native('T', caret(0), false);
    e.native('T', caret(0), false);
    e.render();
    expect(e.text).toBe('T');
    expect(e.runs).toEqual([['human', 'T']]);
  });

  it('applies a repeated character typed twice once each', () => {
    const e = editor(emptyPreview());
    e.native('a', caret(0));
    e.native('aa', caret(1));
    e.native('aa', caret(1), false);
    e.native('aa', caret(2), false);
    e.render();
    expect(e.text).toBe('aa');
  });

  it('applies a later change after the duplicate was dropped', () => {
    const e = editor(emptyPreview());
    e.native('T', caret(0), false);
    e.native('T', caret(0), false);
    e.render();
    e.native('Th', caret(1));
    expect(e.text).toBe('Th');
  });
});

describe('typing faster than React renders', () => {
  it('measures each change from the previous native string', () => {
    const e = editor(emptyPreview());
    let typed = '';
    for (const ch of 'The kettle') {
      typed += ch;
      e.native(typed, caret(typed.length - 1), false);
    }
    e.render();
    expect(e.text).toBe('The kettle');
    expect(e.runs).toEqual([['human', 'The kettle']]);
  });

  it('keeps autocorrect and a late render apart', () => {
    const e = editor(emptyPreview());
    e.native('alr', caret(0), false);
    e.native('already', caret(3), false);
    e.native('already ', caret(7), false);
    // The parent renders each state it was sent, in order.
    e.render();
    expect(e.text).toBe('already ');
  });

  it('adopts a change from outside once nothing is pending', () => {
    const e = editor(emptyPreview());
    e.native('a', caret(0));
    // The parent switched sibling: a rendered string the tracker never saw.
    e.state = applyPreviewEdit(e.state, { start: 0, end: 1, inserted: 'Z' });
    e.render();
    e.native('Zb', caret(1));
    expect(e.text).toBe('Zb');
  });
});

describe('Android event order: the selection may already be the new caret', () => {
  it('a typed character with the post-change caret keeps authorship at the seam', () => {
    const e = sample();
    const before = e.text;
    // A letter typed just after the opening's last space, before the model.
    e.native(before.slice(0, SEAM) + 'Q' + before.slice(SEAM), caret(SEAM + 1));
    expect(e.text).toBe(before.slice(0, SEAM) + 'Q' + before.slice(SEAM));
    // The human's letter joins the human run before it; the model text
    // after the seam keeps its color.
    expect(e.runs[0]).toEqual([
      'human',
      'The snow had been falling since dawn. Q',
    ]);
    expect(e.runs[1]?.[0]).toBe('model');
  });

  it('a backspace with the post-change caret removes the right character', () => {
    const e = sample();
    const before = e.text;
    e.native(before.slice(0, SEAM - 1) + before.slice(SEAM), caret(SEAM - 1));
    expect(e.text).toBe(before.slice(0, SEAM - 1) + before.slice(SEAM));
    expect(e.runs[0]?.[1]).toBe('The snow had been falling since dawn.');
  });

  it('a repeated letter keeps text exact whichever caret is held', () => {
    for (const held of [caret(1), caret(2), caret(5)]) {
      const e = editor(
        previewDocument({
          prefix: [],
          endings: [[{ author: 'model', text: 'aaa' }]],
        })
      );
      e.native('aaaa', held);
      expect(e.text).toBe('aaaa');
      expect(e.runs.map((r) => r[1]).join('')).toBe('aaaa');
    }
  });
});
