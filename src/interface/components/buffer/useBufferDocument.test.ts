import { useBufferDocument, bufferReadOnly } from './useBufferDocument';
import { act, renderHook } from '@interface/test-support/render-hook';
import { bufferOpenFixture } from '@infrastructure/persistence/watermelon/repositories/buffer-open-fixture';
import { StoreBufferDraftUseCase } from '@application/use-cases/StoreBufferDraftUseCase';
import { BufferDocumentSession } from './buffer-document-session';
import { previewFromPassages } from './buffer-passages-document';
import { createCompositionBarrier } from './composition-barrier';
import { useAppServices } from '@interface/composition';
import type { LoomTree } from '@domain/entities';

jest.mock('@interface/composition', () => ({ useAppServices: jest.fn() }));

test('only ready real documents and fixtures accept typing', () => {
  const ready = {
    enabled: true,
    status: 'ready' as const,
    commandRunning: false,
    recoveryPending: false,
  };
  expect(bufferReadOnly(ready)).toBe(false);
  expect(bufferReadOnly({ ...ready, status: 'loading' })).toBe(true);
  expect(bufferReadOnly({ ...ready, status: 'error' })).toBe(true);
  expect(bufferReadOnly({ ...ready, commandRunning: true })).toBe(true);
  expect(bufferReadOnly({ ...ready, recoveryPending: true })).toBe(true);
  expect(
    bufferReadOnly({
      enabled: false,
      status: 'loading',
      commandRunning: true,
      recoveryPending: true,
    })
  ).toBe(false);
});

test.each(['discard', 'keep'])(
  'recovery locks typing until %s succeeds',
  async (action) => {
    const f = await bufferOpenFixture();
    const store = new StoreBufferDraftUseCase(f.bufferDraftStore);
    const services = {
      useCases: {
        openBufferDocumentUseCase: f.open,
        commitBufferChangesUseCase: f.commit,
        switchBufferPathUseCase: f.switchPath,
        storeBufferDraftUseCase: store,
      },
    };
    (useAppServices as jest.Mock).mockReturnValue(services);
    const barrier = createCompositionBarrier({ requestEnd() {} });
    const mount = () =>
      renderHook(
        () =>
          useBufferDocument({ id: f.treeId } as LoomTree, barrier, true, {
            settle: async () => {},
          }),
        undefined
      );
    const earlier = new BufferDocumentSession({ ...f, drafts: store });
    const { opened } = await earlier.load();
    await earlier.save({
      ...previewFromPassages(opened.passages).index.document,
      tail: [{ author: 'human', text: 'draft' }],
    });
    jest
      .spyOn(f.commit, 'execute')
      .mockRejectedValueOnce(new Error('disk busy'));
    const next = mount();
    try {
      await act(async () => {});
      expect(next.result.current.recovery?.text).toBe('draft');
      expect(next.result.current.readOnly).toBe(true);
      await act(() =>
        action === 'discard'
          ? next.result.current.dismissRecovery()
          : next.result.current.keepRecovery()
      );
      expect(next.result.current.recovery).toBeNull();
      expect(next.result.current.readOnly).toBe(false);
      expect(next.result.current.doc.index.length).toBe(
        action === 'discard' ? 0 : 5
      );
    } finally {
      await next.unmount();
    }
  }
);

const mountCommand = async (settle: () => Promise<void>) => {
  const f = await bufferOpenFixture();
  (useAppServices as jest.Mock).mockReturnValue({
    useCases: {
      openBufferDocumentUseCase: f.open,
      commitBufferChangesUseCase: f.commit,
      switchBufferPathUseCase: f.switchPath,
      storeBufferDraftUseCase: new StoreBufferDraftUseCase(f.bufferDraftStore),
    },
  });
  const barrier = createCompositionBarrier({ requestEnd() {} });
  const hook = renderHook(
    () =>
      useBufferDocument({ id: f.treeId } as LoomTree, barrier, true, {
        settle,
      }),
    undefined
  );
  await act(async () => {});
  return { ...hook, f };
};

test('a switch waits for accepted web edits before it snapshots', async () => {
  let release!: () => void;
  const settle = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  const { result, f, unmount } = await mountCommand(settle);
  const command = jest
    .spyOn(BufferDocumentSession.prototype, 'switchTo')
    .mockResolvedValue({ kind: 'nothing' });
  try {
    let switched!: Promise<boolean>;
    await act(() => {
      switched = result.current.switchTo({
        kind: 'branch',
        position: 0,
        nodeId: f.treeId,
      });
    });
    expect(command).not.toHaveBeenCalled();
    expect(result.current.readOnly).toBe(true);
    expect(settle).toHaveBeenCalledTimes(1);
    await act(async () => {
      result.current.sink.onChanges(
        [{ start: 0, end: 0, inserted: 'last characters' }],
        15
      );
      release();
      expect(await switched).toBe(true);
    });
    expect(command.mock.calls[0][0].tail).toEqual([
      { author: 'human', text: 'last characters' },
    ]);
  } finally {
    command.mockRestore();
    await unmount();
  }
});

test('a settle timeout fails the command and keeps the text', async () => {
  const { result, unmount } = await mountCommand(async () => {
    throw new Error('Editor timed out');
  });
  try {
    await act(() =>
      result.current.onReplace({ start: 0, end: 0, inserted: 'keep me' })
    );
    await act(async () => {
      expect(await result.current.commit()).toBe(false);
    });
    expect(result.current.notice).toMatch(/timed out/i);
    expect(result.current.latest().index.document.tail).toEqual([
      { author: 'human', text: 'keep me' },
    ]);
    expect(result.current.readOnly).toBe(false);
  } finally {
    await unmount();
  }
});
