import { CODE_BLOCK_SPEECH, prepareSpeechText } from './prepare-speech-text';

describe('prepareSpeechText', () => {
  it('reads prose as written', () => {
    expect(prepareSpeechText('Hello there.\nHow are you?')).toBe(
      'Hello there.\nHow are you?'
    );
  });

  it('replaces a fenced code block with the Latent Spaces sentence', () => {
    const content =
      'Here is a loop:\n\n```swift\nfor i in 0..<3 {\n  print(i)\n}\n```\n\nThat prints three numbers.';

    expect(prepareSpeechText(content)).toBe(
      `Here is a loop:\n${CODE_BLOCK_SPEECH}\nThat prints three numbers.`
    );
  });

  it('replaces fences without a language tag and several blocks', () => {
    const content = '```\nls\n```\nand\n```js\n1\n```';

    expect(prepareSpeechText(content)).toBe(
      `${CODE_BLOCK_SPEECH}\nand\n${CODE_BLOCK_SPEECH}`
    );
  });

  it('leaves an unclosed fence as prose', () => {
    expect(prepareSpeechText('Start\n```py\nprint(1)')).toBe(
      'Start\n```py\nprint(1)'
    );
  });

  it('collapses blank-line runs and normalizes CRLF', () => {
    expect(prepareSpeechText('\r\n\r\nOne\r\n\r\n\r\nTwo\r\n\r\n')).toBe(
      'One\n\nTwo'
    );
  });

  it('returns empty text for whitespace', () => {
    expect(prepareSpeechText('  \n\n ')).toBe('');
  });
});
