// Exercise the generated page and its actual CodeMirror DOM observer.
import { BUFFER_WEB_EDITOR_HTML } from '../../src/interface/components/buffer/android/web-editor-html.generated';
import type {
  EditorMessage,
  HostMessage,
} from '../../src/interface/components/buffer/android/web-editor-protocol';
import { JSDOM } from 'jsdom';

test('the page sends an accepted DOM edit before acknowledging its revision', async () => {
  const messages: EditorMessage[] = [];
  const dom = new JSDOM(BUFFER_WEB_EDITOR_HTML, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(page) {
      page.ReactNativeWebView = {
        postMessage: (data: string) => messages.push(JSON.parse(data)),
      };
      // jsdom has no layout engine.
      page.Range.prototype.getClientRects = () =>
        page.document.body.getClientRects();
      page.Range.prototype.getBoundingClientRect = () =>
        page.document.body.getBoundingClientRect();
    },
  });
  const page = dom.window;
  const send = (message: HostMessage) =>
    page.document.dispatchEvent(
      new page.MessageEvent('message', { data: JSON.stringify(message) })
    );
  try {
    send({
      type: 'load',
      epoch: 4,
      text: 'a',
      ends: [1],
      modelRanges: [],
      readOnly: false,
      style: {
        fontFamily: 'serif',
        fontSize: 16,
        lineHeight: 22,
        paddingTop: 0,
        paddingHorizontal: 0,
        paddingBottom: 0,
        humanColor: 'black',
        modelColor: 'blue',
        placeholderColor: 'gray',
        backgroundColor: 'white',
        placeholder: '',
        diagnostics: false,
      },
    });
    const content = page.document.querySelector('.cm-content')!;
    content.querySelector('.cm-line')!.firstChild!.textContent = 'ab';
    send({ type: 'settle', epoch: 4, requestId: 7 });
    for (
      let frame = 0;
      frame < 10 && !messages.some((m) => m.type === 'settled');
      frame++
    ) {
      await new Promise((resolve) => page.requestAnimationFrame(resolve));
    }
    expect(
      messages.filter((m) => m.type === 'changes' || m.type === 'settled')
    ).toEqual([
      expect.objectContaining({
        type: 'changes',
        revision: 1,
        replacements: [{ from: 1, to: 1, insert: 'b' }],
      }),
      { type: 'settled', epoch: 4, requestId: 7, revision: 1 },
    ]);
    expect(content.getAttribute('contenteditable')).toBe('false');
  } finally {
    page.close();
  }
});
