// Exercise a presentation update in the generated page without replacing state.
import { JSDOM } from 'jsdom';
import { BUFFER_WEB_EDITOR_HTML } from '../../src/interface/components/buffer/android/web-editor-html.generated';
import type {
  HostMessage,
  WebEditorStyle,
} from '../../src/interface/components/buffer/android/web-editor-protocol';

const style = (paddingTop: number, placeholder: string): WebEditorStyle => ({
  fontFamily: 'serif',
  fontSize: 16,
  lineHeight: 22,
  paddingTop,
  paddingHorizontal: 24,
  paddingBottom: 24,
  humanColor: 'white',
  modelColor: 'blue',
  placeholderColor: 'gray',
  backgroundColor: 'black',
  placeholder,
  diagnostics: false,
});

test('style after load changes the page without changing text or selection', () => {
  const dom = new JSDOM(BUFFER_WEB_EDITOR_HTML, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(page) {
      page.ReactNativeWebView = { postMessage: () => {} };
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
      epoch: 1,
      text: 'unchanged document',
      caret: 4,
      ends: [18],
      modelRanges: [],
      readOnly: false,
      style: style(16, 'Old placeholder'),
    });
    const content = page.document.querySelector('.cm-content')!;
    const range = page.document.createRange();
    range.setStart(content.querySelector('.cm-line')!.firstChild!, 4);
    range.collapse(true);
    page.getSelection()!.removeAllRanges();
    page.getSelection()!.addRange(range);
    page.document.dispatchEvent(new page.Event('selectionchange'));
    const textBefore = content.textContent;
    const selectionBefore = page.getSelection()!.focusOffset;
    expect(selectionBefore).toBe(4);

    send({ type: 'style', style: style(96, 'New placeholder') });

    expect(
      page.document.documentElement.style.getPropertyValue('--pad-top')
    ).toBe('96px');
    expect(content.textContent).toBe(textBefore);
    expect(page.getSelection()!.focusOffset).toBe(selectionBefore);
  } finally {
    page.close();
  }
});
