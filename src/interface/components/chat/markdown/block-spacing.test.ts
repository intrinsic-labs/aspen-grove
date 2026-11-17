import { describe, expect, it } from '@jest/globals';
import { blockSpacing, CODE_BLOCK_SPACING } from './block-spacing';

describe('blockSpacing', () => {
  it('puts a blank line between prose blocks', () => {
    expect(blockSpacing('paragraph', 'bullet_list', 24)).toBe(24);
    expect(blockSpacing('heading2', 'paragraph', 24)).toBe(24);
  });

  it("uses Latent Spaces' 12 pt on either side of a code block", () => {
    expect(CODE_BLOCK_SPACING).toBe(12);
    expect(blockSpacing('paragraph', 'fence', 24)).toBe(12);
    expect(blockSpacing('fence', 'paragraph', 24)).toBe(12);
    expect(blockSpacing('code_block', 'fence', 24)).toBe(12);
  });
});
