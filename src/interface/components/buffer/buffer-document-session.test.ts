import type { ULID } from '@domain/value-objects';
import { bufferOpenFixture } from '@infrastructure/persistence/watermelon/repositories/buffer-open-fixture';
import { StoreBufferDraftUseCase } from '@application/use-cases/StoreBufferDraftUseCase';
import {
  runsText,
  type AuthorshipRun,
} from '@application/services/buffer/authorship-runs';
import type { BufferDocument } from '@application/services/buffer/document-ranges';
import { BufferDocumentSession } from './buffer-document-session';
import { createDraftSaver } from './buffer-draft-saver';
import { previewFromPassages } from './buffer-passages-document';

const SEA = 'The sea was calm.';
const human = (text: string): AuthorshipRun => ({ author: 'human', text });

const seeded = async () => {
  const f = await bufferOpenFixture();
  const model = await f.addNode(SEA, { parents: [f.root], onPath: true });
  const session = new BufferDocumentSession({
    treeId: f.treeId,
    open: f.open,
    commit: f.commit,
    switchPath: f.switchPath,
    drafts: new StoreBufferDraftUseCase(f.bufferDraftStore),
  });
  const { opened } = await session.load();
  /** The opened document with passage and tail text replaced as typed. */
  const typed = (
    texts: Record<ULID, string> = {},
    tail = ''
  ): BufferDocument => ({
    passages: opened.passages.map((p) => ({
      id: p.nodeId,
      runs: [human(texts[p.nodeId] ?? p.text)],
    })),
    tail: tail ? [human(tail)] : [],
  });
  return { f, model, session, opened, typed };
};

test('commit then reopen shows the edited text, colored against its model ancestor', async () => {
  const { f, model, session, typed } = await seeded();
  const result = await session.commit(
    typed({ [model]: 'The sea was very calm.' }, ' Gulls wheeled.')
  );
  if (result.kind !== 'done') throw new Error(result.kind);
  const texts = result.opened.passages.map((p) => p.text);
  expect(texts).toEqual(['', 'The sea was very calm.', ' Gulls wheeled.']);
  const edited = result.opened.passages[1];
  expect(edited.nodeId).not.toBe(model);
  expect(edited).toMatchObject({ author: 'human', ancestorText: SEA });

  // Reopened from the database, it colors against the original model text.
  const reopened = previewFromPassages(
    (await f.open.execute({ treeId: f.treeId })).passages
  );
  const runs = reopened.index.document.passages[1].runs;
  expect(runsText(runs)).toBe('The sea was very calm.');
  expect(
    runs.some((r) => r.author === 'model' && r.text.includes('calm.'))
  ).toBe(true);
  expect(
    runs
      .filter((r) => r.author === 'human')
      .map((r) => r.text)
      .join('')
  ).toContain('very');
  expect(reopened.index.document.passages[0].id).toBe(f.root);
  expect(reopened.ancestors[edited.nodeId]).toEqual([
    { author: 'model', text: SEA },
  ]);
  expect(await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0)).toBeNull();
});

test('switch to the original version and back keeps both', async () => {
  const { f, model, session, typed } = await seeded();
  const done = await session.commit(typed({ [model]: 'The sea was rough.' }));
  if (done.kind !== 'done') throw new Error(done.kind);
  const editedId = done.opened.passages[1].nodeId;
  const versions = done.opened.choices[1].versions;
  expect(versions.entries.map((e) => e.nodeId)).toEqual([model, editedId]);
  expect(versions.active).toBe(1);

  const unchanged = (o: typeof done.opened): BufferDocument => ({
    passages: o.passages.map((p) => ({ id: p.nodeId, runs: [human(p.text)] })),
    tail: [],
  });
  const original = await session.switchTo(
    unchanged(done.opened),
    versions.entries[0].action
  );
  if (original.kind !== 'done') throw new Error(original.kind);
  expect(original.opened.passages[1]).toMatchObject({
    nodeId: model,
    text: SEA,
  });

  const back = await session.switchTo(
    unchanged(original.opened),
    original.opened.choices[1].versions.entries[1].action
  );
  if (back.kind !== 'done') throw new Error(back.kind);
  expect(back.opened.passages[1]).toMatchObject({
    nodeId: editedId,
    text: 'The sea was rough.',
  });
  expect((await f.nodeRepo.findById(model))?.content).toEqual({
    type: 'text',
    text: SEA,
  });
  expect((await f.nodeRepo.findById(editedId))?.content).toEqual({
    type: 'text',
    text: 'The sea was rough.',
  });
});

test('a failed commit keeps the text and the stored draft', async () => {
  const { f, model, session, typed } = await seeded();
  const document = typed({ [model]: 'The sea was grey.' }, ' Rain.');
  jest
    .spyOn(f.db.adapter, 'batch')
    .mockRejectedValueOnce(new Error('storage failure'));
  const failed = await session.commit(document);
  expect(failed).toEqual({ kind: 'failed', message: 'storage failure' });
  const stored = await f.bufferDraftStore.get(
    f.treeId,
    f.pathId,
    session.opened!.sequence,
    session.opened!.revision
  );
  expect(stored?.conflicted).toBe(false);
  expect(stored?.draft.workingTail).toBe(' Rain.');
  expect(stored?.draft.edits).toEqual([
    { nodeId: model, text: 'The sea was grey.' },
  ]);
  expect(await f.sequence()).toEqual([f.root, model]);

  // The same operation retries and clears the draft.
  const retried = await session.commit(document);
  expect(retried.kind).toBe('done');
  expect(await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0)).toBeNull();
});

test('a commit whose acknowledgement was lost is recognized as committed', async () => {
  const { f, model, session, typed } = await seeded();
  jest
    .spyOn(f.bufferDraftStore, 'remove')
    .mockRejectedValueOnce(new Error('cleanup failure'));
  const result = await session.commit(typed({ [model]: 'The sea was loud.' }));
  expect(result.kind).toBe('done');
  expect(await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0)).toBeNull();
});

test('an unchanged document commits nothing and clears no version', async () => {
  const { f, session, typed } = await seeded();
  const before = await f.counts();
  expect(await session.commit(typed())).toEqual({ kind: 'nothing' });
  await session.save(typed());
  expect(await f.counts()).toEqual(before);
  expect(await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0)).toBeNull();
});

test('backgrounding stores the draft and writes no version', async () => {
  jest.useFakeTimers();
  try {
    const { f, model, session, typed } = await seeded();
    const before = await f.counts();
    const nodes = await f.nodeRepo.findByLoomTreeId(f.treeId, true);
    let latest = typed({ [model]: 'The sea was calm, then not.' }, ' Wind.');
    const saver = createDraftSaver({ save: () => session.save(latest) });
    saver.schedule();
    await saver.flush();
    const stored = await f.bufferDraftStore.get(
      f.treeId,
      f.pathId,
      session.opened!.sequence,
      session.opened!.revision
    );
    expect(stored?.draft.workingTail).toBe(' Wind.');
    expect(stored?.draft.createdAtMs).toBeDefined();
    expect(await f.counts()).toEqual(before);
    expect(await f.nodeRepo.findByLoomTreeId(f.treeId, true)).toHaveLength(
      nodes.length
    );
    expect(await f.sequence()).toEqual([f.root, model]);

    // Backing out the typing clears the draft; still no version.
    latest = typed();
    saver.schedule();
    await saver.flush();
    expect(await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0)).toBeNull();
    expect(await f.counts()).toEqual(before);
  } finally {
    jest.useRealTimers();
  }
});

test('a draft left by a closed session is replayed when the tree opens', async () => {
  const { f, model, session, typed } = await seeded();
  await session.save(typed({ [model]: 'The sea was calm and wide.' }));
  const next = new BufferDocumentSession({
    treeId: f.treeId,
    open: f.open,
    commit: f.commit,
    switchPath: f.switchPath,
    drafts: new StoreBufferDraftUseCase(f.bufferDraftStore),
  });
  const loaded = await next.load();
  expect(loaded.recovery).toBeUndefined();
  expect(loaded.opened.passages[1].text).toBe('The sea was calm and wide.');
});
