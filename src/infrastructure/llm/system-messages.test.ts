import type { Message } from '@application/services/llm';
import { toLMStudioMessages } from './lmstudio/helpers';
import { toOpenRouterMessages } from './openrouter/helpers';

const messages: readonly Message[] = [
  { role: 'user', content: 'Hi' },
  { role: 'assistant', content: 'Hello' },
  { role: 'system', content: 'Be terse.' },
  { role: 'user', content: 'Why?' },
];

const expected = [
  { role: 'system', content: 'Agent prompt' },
  { role: 'user', content: 'Hi' },
  { role: 'assistant', content: 'Hello' },
  { role: 'system', content: 'Be terse.' },
  { role: 'user', content: 'Why?' },
];

describe('system node messages on the wire', () => {
  it('OpenRouter sends the prompt first and a system node in place', () => {
    expect(toOpenRouterMessages(messages, 'Agent prompt')).toEqual(expected);
  });

  it('LM Studio sends the prompt first and a system node in place', () => {
    expect(toLMStudioMessages(messages, 'Agent prompt')).toEqual(expected);
  });
});
