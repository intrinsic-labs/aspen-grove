import { encodeHostMessage } from './web-editor-protocol';
import { parseHostMessage } from './web-editor-host-message';

const style = {
  fontFamily: 'serif',
  fontSize: 17,
  lineHeight: 27,
  paddingTop: 96,
  paddingHorizontal: 24,
  paddingBottom: 24,
  humanColor: 'white',
  modelColor: 'blue',
  placeholderColor: 'gray',
  backgroundColor: 'black',
  placeholder: 'Start writing',
  diagnostics: false,
} as const;

test('a style message round-trips through the host protocol', () => {
  const message = { type: 'style', style } as const;
  expect(parseHostMessage(encodeHostMessage(message))).toEqual(message);
});

test.each([
  { type: 'style' },
  { type: 'style', style: null },
  { type: 'style', style: { ...style, paddingTop: '96' } },
  { type: 'style', style: { ...style, placeholder: undefined } },
  { type: 'style', style: { ...style, diagnostics: 'false' } },
])('rejects malformed style messages', (message) => {
  expect(parseHostMessage(JSON.stringify(message))).toBeNull();
});
