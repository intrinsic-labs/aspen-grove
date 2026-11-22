import type { TextStyle } from 'react-native';
import type { MarkdownTypography } from './markdown-typography';

type HeadingKey = `heading${1 | 2 | 3 | 4 | 5 | 6}`;

type HeadingScale = {
  readonly fontScale: number;
  readonly lineScale: number;
  readonly marginTop: number;
  readonly marginBottom: number;
};

/** heading1 to heading6: size and line height relative to the body. */
const HEADING_SCALES: readonly HeadingScale[] = [
  { fontScale: 1.6, lineScale: 1.4, marginTop: 16, marginBottom: 8 },
  { fontScale: 1.4, lineScale: 1.3, marginTop: 14, marginBottom: 6 },
  { fontScale: 1.2, lineScale: 1.2, marginTop: 12, marginBottom: 4 },
  { fontScale: 1.1, lineScale: 1.1, marginTop: 10, marginBottom: 4 },
  { fontScale: 1, lineScale: 1, marginTop: 8, marginBottom: 2 },
  { fontScale: 0.9, lineScale: 0.9, marginTop: 8, marginBottom: 2 },
];

/** Markdown headings, in the bold face, scaled from the body text. */
export const markdownHeadingStyles = ({
  faces,
  fontSize,
  lineHeight,
  textColor,
}: MarkdownTypography): Record<HeadingKey, TextStyle> =>
  Object.fromEntries(
    HEADING_SCALES.map((scale, index) => [
      `heading${index + 1}`,
      {
        fontFamily: faces.bold,
        fontWeight: faces.bold === undefined ? 'bold' : 'normal',
        fontSize: fontSize * scale.fontScale,
        lineHeight: lineHeight * scale.lineScale,
        marginTop: scale.marginTop,
        marginBottom: scale.marginBottom,
        color: textColor,
      },
    ])
  ) as Record<HeadingKey, TextStyle>;
