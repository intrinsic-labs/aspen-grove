import { act, renderHook } from '@interface/test-support/render-hook';
import { useEditorSession } from './useEditorSession';
import type { WebEditorSink } from './buffer-web-editor-props';

const mount = () => {
  const send = jest.fn();
  const sink: WebEditorSink = {
    onApplied: jest.fn(),
    onChanges: jest.fn(),
    onAdopt: jest.fn(),
    onComposition: jest.fn(),
    onCaretMoved: jest.fn(),
  };
  const hook = renderHook(() => useEditorSession(2, sink, send), undefined);
  return { ...hook, send, sink };
};

test('a matching reply waits for its revision to reach the sink', async () => {
  const { result, send, sink, unmount } = mount();
  try {
    const done = jest.fn();
    const settled = result.current.settle().then(done);
    const { requestId } = send.mock.calls[0][0];
    const reply = {
      type: 'settled' as const,
      epoch: 2,
      requestId,
      revision: 1,
    };
    result.current.receive({ ...reply, epoch: 1, revision: 0 });
    result.current.receive({ ...reply, requestId: requestId + 1, revision: 0 });
    result.current.receive(reply);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    result.current.receive({
      type: 'changes',
      epoch: 2,
      prevRevision: 0,
      revision: 1,
      replacements: [{ from: 0, to: 0, insert: 'x' }],
      selection: { head: 1, anchor: 1 },
      composing: false,
    });
    await settled;
    expect(sink.onApplied).toHaveBeenCalled();
  } finally {
    await unmount();
  }
});

test('a missing reply rejects after 1.5 seconds', async () => {
  jest.useFakeTimers();
  const { result, unmount } = mount();
  try {
    const failure = expect(result.current.settle()).rejects.toThrow(
      /timed out/i
    );
    await act(() => jest.advanceTimersByTime(1500));
    await failure;
  } finally {
    await unmount();
    jest.useRealTimers();
  }
});
