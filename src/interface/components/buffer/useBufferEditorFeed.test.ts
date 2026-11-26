import { act, renderHook } from '@interface/test-support/render-hook';
import { applyEdits, prefixLength } from './buffer-preview-document';
import { samplePreview } from './buffer-preview-sample';
import { createCompositionBarrier } from './composition-barrier';
import { useBufferEditorFeed } from './useBufferEditorFeed';

// The whole opening backspaced: the opening still holds left affinity.
const held = () => {
  const state = samplePreview();
  return applyEdits(
    state,
    [{ start: 0, end: prefixLength(state), inserted: '' }],
    {
      caret: 0,
    }
  );
};

const mount = () =>
  renderHook(
    () =>
      useBufferEditorFeed(createCompositionBarrier({ requestEnd() {} }), held),
    undefined
  );

test('the host keeps the hold when the page kept it, and drops it when the page did', async () => {
  const { result, unmount } = mount();
  try {
    expect(result.current.doc.hold).toBeDefined();
    await act(() =>
      result.current.sink.onCaretMoved({ anchor: 0, head: 0 }, false)
    );
    expect(result.current.doc.hold).toBeDefined();
    await act(() =>
      result.current.sink.onCaretMoved({ anchor: 4, head: 4 }, true)
    );
    expect(result.current.doc.hold).toBeUndefined();
  } finally {
    await unmount();
  }
});
