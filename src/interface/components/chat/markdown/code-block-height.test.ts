import { codeBlockHeight, withoutTrailingNewline } from './code-block-height';

describe('code block height', () => {
  it('counts only the lines shown, not the fence’s trailing newline', () => {
    const shown = withoutTrailingNewline(
      "const loom = weave('aspen');\nloom.branch(3);\n"
    );
    expect(shown.split('\n')).toHaveLength(2);
    expect(codeBlockHeight(shown)).toBe(2 * 20 + 24);
  });

  it('keeps a block without a trailing newline as it is', () => {
    expect(withoutTrailingNewline('one line')).toBe('one line');
    expect(codeBlockHeight('one line')).toBe(20 + 24);
  });
});
