/** A code span: its backticks, then its text (kept as typed). */
const CODE_SPAN = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g;

/** A backslash escape stands for the character alone. */
const ESCAPED = /\\([\\`*_{}[\]()#+\-.!|~>])/g;

/**
 * Emphasis, outermost first. A run only counts when its marks hug the text
 * (`*a*`, not `2 * 3 * 4`), and underscores only at word edges, so
 * `snake_case_name` is left alone.
 */
const EMPHASIS: readonly RegExp[] = [
  /\*\*(?=\S)(.+?)(?<=\S)\*\*/g,
  /(?<![\p{L}\p{N}])__(?=\S)(.+?)(?<=\S)__(?![\p{L}\p{N}])/gu,
  /~~(?=\S)(.+?)(?<=\S)~~/g,
  /\*(?=[^\s*])(.+?)(?<=[^\s*])\*/g,
  /(?<![\p{L}\p{N}])_(?=[^\s_])(.+?)(?<=[^\s_])_(?![\p{L}\p{N}])/gu,
];

/** Images and links read as their alt text or label; autolinks as the URL. */
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK = /\[([^\]]+)\]\([^)]*\)/g;
const AUTOLINK = /<((?:https?|mailto):[^>\s]+)>/g;

const ESCAPE_MARK = '\u0000';

const stripProse = (prose: string): string => {
  // Escaped characters are set aside, so they never read as marks.
  const escaped: string[] = [];
  let text = prose.replace(ESCAPED, (_, char: string) => {
    escaped.push(char);
    return `${ESCAPE_MARK}${escaped.length - 1}${ESCAPE_MARK}`;
  });
  text = text.replace(IMAGE, '$1').replace(LINK, '$1').replace(AUTOLINK, '$1');
  for (const pattern of EMPHASIS) {
    text = text.replace(pattern, '$1');
  }
  return text.replace(
    new RegExp(`${ESCAPE_MARK}(\\d+)${ESCAPE_MARK}`, 'g'),
    (_, index: string) => escaped[Number(index)]
  );
};

/**
 * One line of markdown prose as plain text: emphasis, links, images and
 * escapes gone, code spans kept as their text with nothing inside them
 * touched.
 */
export const stripInlineMarkdown = (line: string): string => {
  let result = '';
  let lastEnd = 0;
  for (const match of line.matchAll(CODE_SPAN)) {
    const start = match.index ?? 0;
    result += stripProse(line.slice(lastEnd, start)) + match[2];
    lastEnd = start + match[0].length;
  }
  return result + stripProse(line.slice(lastEnd));
};
