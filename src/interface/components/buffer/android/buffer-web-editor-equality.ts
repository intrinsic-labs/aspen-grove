import type { BufferWebEditorProps } from './buffer-web-editor-props';
import { webEditorStyle, webEditorStylesEqual } from './web-editor-style';

const styleOf = ({
  textStyle,
  headerHeight,
  topGap,
  placeholder = '',
}: BufferWebEditorProps) =>
  webEditorStyle(textStyle, headerHeight, topGap, placeholder);

/** Keeps document typing outside React while admitting presentation changes. */
export const bufferWebEditorPropsEqual = (
  before: BufferWebEditorProps,
  after: BufferWebEditorProps
): boolean =>
  before.epoch === after.epoch &&
  before.readOnly === after.readOnly &&
  before.sink === after.sink &&
  webEditorStylesEqual(styleOf(before), styleOf(after));
