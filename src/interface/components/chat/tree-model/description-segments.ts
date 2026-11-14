export type DescriptionSegment = {
  readonly text: string;
  readonly link?: true;
  readonly bold?: true;
};

const INLINE = /\[([^\]]+)\]\([^)]*\)|\*\*([^*]+)\*\*/g;

/**
 * A model description's inline Markdown, as `AttributedString(markdown:)`
 * shows it in Latent Spaces' footer: links as tinted text, bold as bold,
 * everything else as written.
 */
export const toDescriptionSegments = (
  markdown: string
): readonly DescriptionSegment[] => {
  const segments: DescriptionSegment[] = [];
  let last = 0;
  for (const match of markdown.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({ text: markdown.slice(last, start) });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], link: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true });
    }
    last = start + match[0].length;
  }
  if (last < markdown.length) {
    segments.push({ text: markdown.slice(last) });
  }
  return segments;
};
