import { stripInlineMarkdown } from './strip-inline-markdown';

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING = /^\s{0,3}#{1,6}(?:\s+|$)/;
const HEADING_CLOSE = /\s+#+\s*$/;
const RULE = /^\s{0,3}(?:([-*_])(?:\s*\1){2,}|=+)\s*$/;
const QUOTE = /^\s{0,3}(?:>\s?)+/;
const BULLET = /^(\s*)[-*+]\s+/;
/** A table's header underline: `| --- | :-: |`, at least one pipe. */
const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

/** What separates a table row's cells once its pipes are gone. */
export const TABLE_CELL_SEPARATOR = ' · ';

const isTableDivider = (line: string): boolean =>
  line.includes('|') && TABLE_DIVIDER.test(line);

const tableRow = (line: string): string =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => stripInlineMarkdown(cell.trim()))
    .join(TABLE_CELL_SEPARATOR);

const proseLine = (line: string): string => {
  if (RULE.test(line)) {
    return '';
  }
  const unmarked = HEADING.test(line)
    ? line.replace(HEADING, '').replace(HEADING_CLOSE, '')
    : line.replace(QUOTE, '').replace(BULLET, '$1• ');
  return stripInlineMarkdown(unmarked);
};

/**
 * Markdown as the plain text it reads as, for a preview: no heading, quote
 * or emphasis marks, no table pipes or divider rows, no code fences (their
 * code kept as typed), links as their label, bullets as "•". Line breaks
 * stay; runs of blank lines collapse to one. A sketch, not a parser: it
 * reads the markdown models write, not every corner of CommonMark.
 */
export const stripMarkdown = (markdown: string): string => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let fence: string | null = null;
  let inTable = false;

  lines.forEach((line, index) => {
    const fenceMark = FENCE.exec(line)?.[1];
    if (fence !== null) {
      if (
        fenceMark &&
        fenceMark[0] === fence[0] &&
        fenceMark.length >= fence.length
      ) {
        fence = null;
      } else {
        out.push(line);
      }
      return;
    }
    if (fenceMark) {
      fence = fenceMark;
      return;
    }
    if (isTableDivider(line) && index > 0 && lines[index - 1].includes('|')) {
      out[out.length - 1] = tableRow(lines[index - 1]);
      inTable = true;
      return;
    }
    if (inTable && line.includes('|')) {
      out.push(tableRow(line));
      return;
    }
    inTable = false;
    out.push(proseLine(line));
  });

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
