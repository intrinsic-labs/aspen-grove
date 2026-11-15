import { describe, expect, it } from '@jest/globals';
import type { LoomTree } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { TitleTreeFromFirstMessageUseCase } from './TitleTreeFromFirstMessageUseCase';

const now = new Date('2026-11-10T12:00:00.000Z');
const treeId = '01KTREE0000000000000000000' as ULID;

const makeTree = (title: string): LoomTree => ({
  id: treeId,
  groveId: '01KGROVE000000000000000000' as ULID,
  title,
  rootNodeId: '01KROOT0000000000000000000' as ULID,
  mode: 'dialogue',
  createdAt: now,
  updatedAt: now,
});

const build = (title: string | null) => {
  const saved: string[] = [];
  const useCase = new TitleTreeFromFirstMessageUseCase({
    loomTreeRepository: {
      findById: async () => (title === null ? null : makeTree(title)),
      update: async ({ changes }) => {
        saved.push(changes.title ?? '');
        return makeTree(changes.title ?? '');
      },
    },
  });
  return { useCase, saved };
};

describe('TitleTreeFromFirstMessageUseCase', () => {
  it('titles an untitled tree from its first message', async () => {
    const { useCase, saved } = build('Loom Tree 2026-11-10T11:59:00.000Z');
    const title = await useCase.execute({
      treeId,
      firstMessage: 'How good are you at writing tools?',
    });
    expect(title).toBe('How good are you...');
    expect(saved).toEqual(['How good are you...']);
  });

  it('leaves a titled tree alone', async () => {
    const { useCase, saved } = build('Aspen notes');
    expect(await useCase.execute({ treeId, firstMessage: 'Hi' })).toBeNull();
    expect(saved).toEqual([]);
  });

  it('does nothing for a missing tree', async () => {
    const { useCase, saved } = build(null);
    expect(await useCase.execute({ treeId, firstMessage: 'Hi' })).toBeNull();
    expect(saved).toEqual([]);
  });
});
