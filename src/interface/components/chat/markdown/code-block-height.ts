/** A code line's height: `CodeBlock`'s `styles.text.lineHeight`. */
export const CODE_LINE_HEIGHT = 20;
/** `CodeBlock`'s `scrollContent` top and bottom padding. */
const CODE_VERTICAL_CHROME = 12 + 12;

/** A fenced block's content ends in a newline that isn't a line of code. */
export const withoutTrailingNewline = (code: string): string =>
  code.replace(/\n$/, '');

/**
 * The height a code block is given up front, so the message doesn't jump
 * when the highlighter lays out: its shown lines plus the padding.
 */
export const codeBlockHeight = (shownCode: string): number =>
  shownCode.split('\n').length * CODE_LINE_HEIGHT + CODE_VERTICAL_CHROME;
