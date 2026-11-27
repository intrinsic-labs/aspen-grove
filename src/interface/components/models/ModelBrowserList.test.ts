import { createElement } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import {
  ModelBrowserList,
  type ModelBrowserListProps,
} from './ModelBrowserList';

type Renderer = {
  readonly root: {
    findAllByProps(props: Record<string, unknown>): readonly unknown[];
  };
  unmount(): void;
};
type HeaderOptions = {
  readonly headerSearchBarOptions?: {
    readonly onChangeText: (event: {
      readonly nativeEvent: { readonly text: string };
    }) => void;
  };
};

const TestRenderer = require('react-test-renderer') as {
  create(element: unknown): Renderer;
  act(callback: () => unknown): Promise<void> | void;
};

let mockHeaderOptions: HeaderOptions = {};
jest.mock('expo-router', () => ({
  useNavigation: () => ({
    setOptions: (options: HeaderOptions) => {
      mockHeaderOptions = options;
    },
  }),
}));

const props = (
  onUseCustom?: ModelBrowserListProps['onUseCustom']
): ModelBrowserListProps => ({
  provider: 'openrouter',
  options: [],
  loading: false,
  error: null,
  currentId: null,
  onOpen: () => undefined,
  onUseCustom,
  testIDPrefix: 'browser-test',
});

const renderWithSearch = async (
  onUseCustom?: ModelBrowserListProps['onUseCustom']
) => {
  let renderer: Renderer | undefined;
  await TestRenderer.act(() => {
    renderer = TestRenderer.create(
      createElement(ModelBrowserList, props(onUseCustom))
    );
  });
  await TestRenderer.act(() => {
    mockHeaderOptions.headerSearchBarOptions?.onChangeText({
      nativeEvent: { text: 'new/model' },
    });
  });
  return renderer!;
};

describe('ModelBrowserList custom ids', () => {
  it('without onUseCustom never renders the custom row', async () => {
    const renderer = await renderWithSearch();
    expect(
      renderer.root.findAllByProps({ testID: 'browser-test-custom' })
    ).toHaveLength(0);
    await TestRenderer.act(() => renderer.unmount());
  });

  it('with onUseCustom still renders the custom row', async () => {
    const renderer = await renderWithSearch(() => undefined);
    expect(
      renderer.root.findAllByProps({ testID: 'browser-test-custom' }).length
    ).toBeGreaterThan(0);
    await TestRenderer.act(() => renderer.unmount());
  });
});
