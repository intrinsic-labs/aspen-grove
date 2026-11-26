import type { ULID } from '@domain/value-objects';
import { importBufferVersions } from '@infrastructure/persistence/watermelon/repositories/buffer-versions-import';
import { StoreBufferDraftUseCase } from '@application/use-cases/StoreBufferDraftUseCase';
import type { AuthorshipRun } from '@application/services/buffer/authorship-runs';
import type { BufferDocument } from '@application/services/buffer/document-ranges';
import { BufferDocumentSession } from './buffer-document-session';

const human = (text: string): AuthorshipRun => ({ author: 'human', text });

test('the imported fixture takes the flow: edit an earlier passage, add a tail, save, switch to the original and back', async () => {
  const { f, open, treeId } = await importBufferVersions();
  const session = new BufferDocumentSession({
    treeId,
    open,
    commit: f.commit,
    switchPath: f.switchPath,
    drafts: new StoreBufferDraftUseCase(f.bufferDraftStore),
  });
  const { opened } = await session.load();
  const before = await f.counts();
  const typed = (texts: Record<ULID, string>, tail = ''): BufferDocument => ({
    passages: opened.passages.map((p) => ({
      id: p.nodeId,
      runs: [human(texts[p.nodeId] ?? p.text)],
    })),
    tail: tail ? [human(tail)] : [],
  });
  const second = opened.passages[2];
  expect(session.isDirty(typed({}))).toBe(false);
  const edit = typed(
    { [second.nodeId]: second.text.replace('fogged', 'misted') },
    ' Gulls wheeled.'
  );
  expect(session.isDirty(edit)).toBe(true);

  const done = await session.commit(edit);
  if (done.kind !== 'done') throw new Error(done.kind);
  const after = await f.counts();
  // [nodes, edges, edge_sources, path_nodes, path_selections]
  // The fixture's tree plus the empty buffer the helper starts from.
  expect(before).toEqual([6, 4, 4, 5, 0]);
  expect(after).toEqual([8, 6, 8, 6, 1]);
  const texts = done.opened.passages.map((p) => p.text);
  expect(texts.join('')).toContain('had misted.');
  expect(texts.join('')).toContain('Gulls wheeled.');
  expect(session.isDirty(typed({}))).toBe(false);

  const index = done.opened.passages.findIndex((p) =>
    p.text.includes('misted')
  );
  const here = done.opened.choices[index];
  expect(here.versions.entries).toHaveLength(2);
  expect(here.branches.entries.length).toBeLessThanOrEqual(1);

  const unchanged = (o: typeof done.opened): BufferDocument => ({
    passages: o.passages.map((p) => ({ id: p.nodeId, runs: [human(p.text)] })),
    tail: [],
  });
  const original = await session.switchTo(
    unchanged(done.opened),
    here.versions.entries[0].action
  );
  if (original.kind !== 'done') throw new Error(original.kind);
  expect(original.opened.passages.map((p) => p.text).join('')).toContain(
    'had fogged.'
  );
  const back = await session.switchTo(
    unchanged(original.opened),
    original.opened.choices[index].versions.entries[1].action
  );
  if (back.kind !== 'done') throw new Error(back.kind);
  expect(back.opened.passages.map((p) => p.text).join('')).toContain(
    'had misted.'
  );
});
