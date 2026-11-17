const CODE_BLOCK_TYPES = new Set(['fence', 'code_block']);

/**
 * Latent Spaces sets prose and code blocks in a `VStack(spacing: 12)`
 * (CodeBlockView.swift:25), its prose trimmed of blank lines at the edges.
 */
export const CODE_BLOCK_SPACING = 12;

/**
 * The space between two neighbouring blocks of a message: a blank line
 * (`lineHeight`) between prose blocks, as Latent Spaces' text reads, and
 * Latent Spaces' 12 pt where either side is a code block.
 */
export const blockSpacing = (
  previousType: string,
  nextType: string,
  lineHeight: number
): number =>
  CODE_BLOCK_TYPES.has(previousType) || CODE_BLOCK_TYPES.has(nextType)
    ? CODE_BLOCK_SPACING
    : lineHeight;
