import { createElement } from 'react';

/**
 * The slice of react-test-renderer these tests use. The package ships with
 * jest-expo but without its own types, so it's typed here.
 */
type TestRendererModule = {
  create: (element: unknown) => {
    update: (element: unknown) => void;
    unmount: () => void;
  };
  act: (callback: () => unknown) => Promise<void> | void;
};
const TestRenderer: TestRendererModule = require('react-test-renderer');

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Runs `callback` inside React's act(), awaiting any async work it starts. */
export const act = async (callback: () => unknown): Promise<void> => {
  await TestRenderer.act(async () => {
    await callback();
  });
};

/**
 * Renders a hook in a probe component, without a native view tree, so hook
 * logic can be tested with React's real state and effects.
 */
export const renderHook = <Props, Result>(
  hook: (props: Props) => Result,
  initialProps: Props
) => {
  const result = { current: undefined as unknown as Result };
  const Probe = ({ props }: { readonly props: Props }) => {
    result.current = hook(props);
    return null;
  };
  let renderer: ReturnType<TestRendererModule['create']> | undefined;
  void TestRenderer.act(() => {
    renderer = TestRenderer.create(
      createElement(Probe, { props: initialProps })
    );
  });

  return {
    result,
    rerender: (props: Props) =>
      act(() => renderer?.update(createElement(Probe, { props }))),
    unmount: () => act(() => renderer?.unmount()),
  };
};
