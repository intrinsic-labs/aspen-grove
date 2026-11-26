import type { AuthorshipRun } from './authorship-runs';
import { id } from './buffer-graph-fixtures';
import { draftFromDocument, type BufferDraftBase } from './draft-from-document';
import type { BufferDocument } from './document-ranges';

const human = (text: string): AuthorshipRun => ({ author: 'human', text });
const base: BufferDraftBase = {
  treeId: id('tree'),
  pathId: id('path'),
  ownerAgentId: id('owner'),
  sequence: [id('a'), id('b')],
  revision: 42,
  passages: [
    { nodeId: id('a'), text: 'one ' },
    { nodeId: id('b'), text: 'two' },
  ],
};
const doc = (a: string, b: string, tail = ''): BufferDocument => ({
  passages: [
    { id: 'a', runs: a ? [human(a)] : [] },
    { id: 'b', runs: b ? [human(b)] : [] },
  ],
  tail: tail ? [human(tail)] : [],
});

test('an unchanged document writes no draft', () => {
  expect(draftFromDocument(base, doc('one ', 'two'))).toBeNull();
  expect(
    draftFromDocument(base, doc('one ', 'two'), { keepEmpty: true })
  ).toMatchObject({ edits: [], workingTail: '', expectedRevision: 42 });
});

test('typing at the end becomes the working tail only', () => {
  expect(draftFromDocument(base, doc('one ', 'two', ' three'))).toEqual({
    treeId: base.treeId,
    pathId: base.pathId,
    ownerAgentId: base.ownerAgentId,
    expectedSequence: base.sequence,
    expectedRevision: 42,
    edits: [],
    workingTail: ' three',
  });
});

test('an earlier edit and a new tail commit in one operation', () => {
  const draft = draftFromDocument(base, doc('ONE ', 'two', '\n\nmore'));
  expect(draft?.edits).toEqual([{ nodeId: id('a'), text: 'ONE ' }]);
  expect(draft?.workingTail).toBe('\n\nmore');
});

test('whitespace, CRLF and an emptied passage are carried literally', () => {
  const draft = draftFromDocument(base, doc('one\r\n\r\n ', '', '  '));
  expect(draft?.edits).toEqual([
    { nodeId: id('a'), text: 'one\r\n\r\n ' },
    { nodeId: id('b'), text: '' },
  ]);
  expect(draft?.workingTail).toBe('  ');
});
