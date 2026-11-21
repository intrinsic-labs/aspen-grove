import { describe, expect, it, jest } from '@jest/globals';
import type { LoomTree, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { act, renderHook } from '@interface/test-support/render-hook';
import type { ChatSession } from '../types';
import { useTreeHeaderActions } from './useTreeHeaderActions';

const mockShareTextAsFile = jest.fn(async (_file: unknown) => {});
jest.mock('@interface/services/loom-file-sharing', () => ({
  shareTextAsFile: (file: unknown) => mockShareTextAsFile(file),
}));

const treeId = 'tree-1' as ULID;
const session = {
  treeId,
  pathId: 'path-1' as ULID,
  model: null,
} as unknown as ChatSession;

const setup = () => {
  const navigation = { setOptions: jest.fn((_options: object) => {}) };
  const router = { push: jest.fn((_href: unknown) => {}) };
  const treeRepo = {
    findById: jest.fn(async () => null),
    update: jest.fn(
      async (input: { changes: { title?: string } }) =>
        ({ id: treeId, title: input.changes.title }) as unknown as LoomTree
    ),
  };
  const nodeRepo = {
    findById: jest.fn(async () => null),
    findBookmarked: jest.fn(async (): Promise<Node[]> => []),
  };
  const exportPathMarkdownUseCase = {
    execute: jest.fn(async () => ({
      markdown: '# Path',
      suggestedFileName: 'path.md',
    })),
  };
  const prompt = jest.fn(async () => 'A grove of aspens');
  const setError = jest.fn((_error: string | null) => {});
  const hook = renderHook(
    (rows: unknown) =>
      useTreeHeaderActions({
        navigation,
        router,
        session,
        activeTreeIdRef: { current: treeId },
        rows,
        prompt,
        setError,
        treeRepo,
        nodeRepo,
        credentialStore: {} as never,
        useCases: {
          generateTreeTitleUseCase: { execute: jest.fn() } as never,
          titleTreeFromFirstMessageUseCase: { execute: jest.fn() } as never,
          exportLoomTreeUseCase: { execute: jest.fn() } as never,
          exportPathMarkdownUseCase: exportPathMarkdownUseCase as never,
        },
      }),
    [] as unknown
  );
  return {
    hook,
    navigation,
    router,
    treeRepo,
    nodeRepo,
    exportPathMarkdownUseCase,
    setError,
  };
};

describe('useTreeHeaderActions', () => {
  it('saves an edited title and shows it in the header', async () => {
    const { hook, navigation, treeRepo } = setup();
    await act(async () => {
      hook.result.current.menu.editTitle();
    });
    expect(treeRepo.update).toHaveBeenCalledWith({
      id: treeId,
      changes: { title: 'A grove of aspens' },
    });
    expect(navigation.setOptions).toHaveBeenLastCalledWith({
      title: 'A grove of aspens',
    });
  });

  it('reloads the bookmarks list when a card changes a bookmark', async () => {
    const { hook, nodeRepo } = setup();
    await act(async () => {});
    const loads = nodeRepo.findBookmarked.mock.calls.length;
    expect(loads).toBeGreaterThan(0);
    await act(async () => {
      hook.result.current.bookmarksChanged();
    });
    expect(nodeRepo.findBookmarked.mock.calls.length).toBe(loads + 1);
    expect(nodeRepo.findBookmarked).toHaveBeenLastCalledWith(treeId);
  });

  it('exports the path as Markdown through the share sheet', async () => {
    const { hook, exportPathMarkdownUseCase, setError } = setup();
    await act(async () => {
      await hook.result.current.menu.exportPath();
    });
    expect(exportPathMarkdownUseCase.execute).toHaveBeenCalledWith({
      treeId,
      pathId: 'path-1',
    });
    expect(mockShareTextAsFile).toHaveBeenCalledWith({
      content: '# Path',
      fileName: 'path.md',
      mimeType: 'text/markdown',
    });
    expect(setError).not.toHaveBeenCalled();
  });

  it("opens the tree's Model Settings from the menu and Choose Agent", async () => {
    const { hook, router } = setup();
    await act(async () => {});
    hook.result.current.menu.openModelSettings();
    hook.result.current.menu.onChooseAgent();
    expect(router.push).toHaveBeenCalledTimes(2);
  });
});
