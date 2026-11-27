import type { BufferWebEditorProps } from './buffer-web-editor-props';
import { bufferWebEditorPropsEqual } from './buffer-web-editor-equality';
import { fonts } from '@/interface/ui/value-objects/fonts';

const sink = {} as BufferWebEditorProps['sink'];
const composition = {} as BufferWebEditorProps['composition'];
const props = (overrides: Partial<BufferWebEditorProps> = {}) => ({
  epoch: 1,
  readOnly: false,
  text: 'draft',
  runs: [{ author: 'human' as const, text: 'draft' }],
  ends: [5],
  composition,
  textStyle: { fontFamily: fonts.cardoRegular, fontSize: 17, lineHeight: 27 },
  headerHeight: 80,
  topGap: 16,
  placeholder: 'Start writing',
  sink,
  ...overrides,
});

test('equal presentation values do not re-render the editor', () => {
  expect(
    bufferWebEditorPropsEqual(
      props(),
      props({
        text: 'typed without crossing React',
        textStyle: {
          fontFamily: fonts.cardoRegular,
          fontSize: 17,
          lineHeight: 27,
        },
      })
    )
  ).toBe(true);
});

test.each([
  { headerHeight: 81 },
  { topGap: 17 },
  { placeholder: 'Continue writing' },
  { textStyle: { fontFamily: fonts.mono, fontSize: 17, lineHeight: 27 } },
  {
    textStyle: { fontFamily: fonts.cardoRegular, fontSize: 18, lineHeight: 27 },
  },
  {
    textStyle: { fontFamily: fonts.cardoRegular, fontSize: 17, lineHeight: 28 },
  },
])('changed presentation values re-render the editor', (change) => {
  expect(bufferWebEditorPropsEqual(props(), props(change))).toBe(false);
});
