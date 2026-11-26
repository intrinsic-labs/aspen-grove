import type { EditorState } from '@codemirror/state';
import { EditorView, type EditorViewConfig } from '@codemirror/view';
import { listen, post } from './bridge';

jest.mock('./bridge', () => ({ listen: jest.fn(), post: jest.fn() }));
jest.mock('./theme', () => ({ applyStyle: jest.fn() }));
jest.mock('@codemirror/view', () => {
  const actual = jest.requireActual('@codemirror/view');
  const constructor = jest.fn().mockImplementation(() => ({
    scrollDOM: { scrollTop: 0 },
    destroy: jest.fn(),
  }));
  Object.setPrototypeOf(constructor, actual.EditorView);
  return { ...actual, EditorView: constructor };
});

const load = (caret?: number) => {
  const receive = jest.mocked(listen).mock.calls[0][0];
  receive({
    type: 'load',
    text: 'one\r\ntwo',
    caret,
    epoch: 1,
    ends: [8],
    modelRanges: [],
    readOnly: false,
    style: {
      fontFamily: 'serif',
      fontSize: 16,
      lineHeight: 22,
      paddingTop: 64,
      paddingBottom: 0,
      paddingHorizontal: 0,
      humanColor: 'black',
      modelColor: 'blue',
      placeholderColor: 'gray',
      backgroundColor: 'white',
      placeholder: '',
      diagnostics: false,
    },
  });
  return (EditorView as unknown as jest.Mock).mock
    .lastCall[0] as EditorViewConfig;
};

beforeAll(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { getElementById: () => ({}) },
  });
  require('./main');
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, 'document');
});

test('a fresh page explicitly scrolls to the first line below the header', () => {
  const config = load();
  expect(config.state!.selection.main.head).toBe(0);
  expect(config.scrollTo?.value).toMatchObject({
    range: { head: 0 },
    y: 'start',
    yMargin: 64,
  });
});

test.each([
  [6, 5],
  [99, 7],
  [-2, 0],
])('reload converts and clamps host caret %i', (host, page) => {
  const config = load(host);
  expect(config.state!.selection.main.head).toBe(page);
  expect(config.scrollTo?.value).toMatchObject({
    range: { head: page },
    y: 'nearest',
  });
});

test('a tap before the first edit posts host offsets', () => {
  const state = load().state as EditorState;
  const next = state.update({ selection: { anchor: 5 } }).state;
  for (const listener of state.facet(EditorView.updateListener)) {
    listener({
      state: next,
      startState: state,
      selectionSet: true,
      docChanged: false,
    } as Parameters<typeof listener>[0]);
  }
  expect(post).toHaveBeenCalledWith({
    type: 'selection',
    epoch: 1,
    selection: { anchor: 6, head: 6 },
  });
});

test('a command reload starts at the preceding scroll offset and a fresh open resets it', () => {
  const views = (EditorView as unknown as jest.Mock).mock.results;
  load();
  views.at(-1)!.value.scrollDOM.scrollTop = 240;
  load(6);
  expect(views.at(-1)!.value.scrollDOM.scrollTop).toBe(240);
  load();
  expect(views.at(-1)!.value.scrollDOM.scrollTop).toBe(0);
});
