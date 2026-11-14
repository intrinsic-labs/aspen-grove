import { describe, expect, it } from '@jest/globals';
import type { SelectableProvider } from '@domain/entities';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useModelPickerData } from './useModelPickerData';

let resolveLmStudio: (models: unknown[]) => void = () => undefined;

const mockAdapters = {
  openRouterCatalog: {
    getModels: async () => [
      { id: 'openai/gpt-4o', displayName: 'GPT-4o', description: '' },
    ],
  },
  providerRegistry: {
    getLMStudioAdapter: () => ({
      fetchModels: () =>
        new Promise<unknown[]>((resolve) => {
          resolveLmStudio = resolve;
        }),
    }),
  },
};

jest.mock('@interface/composition', () => ({
  useAppServices: () => ({ adapters: mockAdapters }),
}));

const ids = (options: readonly { id: string }[]) => options.map((o) => o.id);

describe('useModelPickerData', () => {
  it("shows no stale options while a new provider's list loads", async () => {
    const hook = renderHook(
      ({ provider }: { provider: SelectableProvider }) =>
        useModelPickerData(provider),
      { provider: 'openrouter' as SelectableProvider }
    );
    await act(async () => undefined);
    expect(ids(hook.result.current.options)).toEqual(['openai/gpt-4o']);

    await hook.rerender({ provider: 'lmstudio' });
    expect(hook.result.current.options).toEqual([]);

    await act(async () => {
      resolveLmStudio([{ id: 'qwen3-8b', type: 'llm', state: 'loaded' }]);
    });
    expect(ids(hook.result.current.options)).toEqual(['qwen3-8b']);
    await hook.unmount();
  });
});
