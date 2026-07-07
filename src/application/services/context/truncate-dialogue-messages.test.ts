import { describe, expect, it } from '@jest/globals';
import { ContextAssemblyError } from './context-assembly-error';
import type { DialogueMessage } from './dialogue-message';
import {
  TRUNCATION_MARKER,
  truncateDialogueMessages,
} from './truncate-dialogue-messages';

/** 400 chars => 100 estimated tokens (4 chars/token). */
const createMessage = (index: number): DialogueMessage => ({
  role: index % 2 === 0 ? 'user' : 'assistant',
  content: `msg${index}-`.padEnd(400, 'x'),
});

const createMessages = (count: number): DialogueMessage[] =>
  Array.from({ length: count }, (_, index) => createMessage(index));

describe('truncateDialogueMessages', () => {
  it('returns messages unchanged when under the limit', () => {
    const messages = createMessages(4);

    const result = truncateDialogueMessages({
      messages,
      options: { maxContextTokens: 4000, responseTokenBuffer: 0 },
    });

    expect(result.messages).toEqual(messages);
    expect(result.truncated).toBe(false);
    expect(result.droppedMessageCount).toBe(0);
  });

  it('truncateMiddle drops oldest-middle messages, keeping beginning and recent tail', () => {
    // 10 messages x 100 tokens = 1000 tokens; available = 700.
    const messages = createMessages(10);

    const result = truncateDialogueMessages({
      messages,
      options: {
        maxContextTokens: 700,
        responseTokenBuffer: 0,
        minimumRecentNodes: 4,
      },
    });

    // Tail (4 recent) = 400 tokens; marker = 9 tokens; head budget = 291,
    // so exactly msg0 + msg1 fit and msg2..msg5 are dropped.
    expect(result.truncated).toBe(true);
    expect(result.droppedMessageCount).toBe(4);
    expect(result.messages).toHaveLength(6);
    expect(result.messages[0]?.content.startsWith('msg0-')).toBe(true);
    expect(result.messages[1]?.content.startsWith('msg1-')).toBe(true);
    expect(result.messages[2]?.content.startsWith(TRUNCATION_MARKER)).toBe(
      true
    );
    expect(result.messages[2]?.content).toContain('msg6-');
    expect(result.messages[5]?.content.startsWith('msg9-')).toBe(true);
  });

  it('accounts for system context tokens when computing the budget', () => {
    // System (100 tokens) + tail (400) + marker leaves room for one head
    // message out of six: available = 800 - 100 = 700.
    const messages = createMessages(10);

    const result = truncateDialogueMessages({
      messages,
      systemContext: 's'.repeat(400),
      options: {
        maxContextTokens: 800,
        responseTokenBuffer: 0,
        minimumRecentNodes: 4,
      },
    });

    expect(result.truncated).toBe(true);
    expect(result.droppedMessageCount).toBe(4);
  });

  it('never truncates system context and throws when it alone exceeds the limit', () => {
    expect(() =>
      truncateDialogueMessages({
        messages: createMessages(2),
        systemContext: 's'.repeat(400),
        options: { maxContextTokens: 100, responseTokenBuffer: 0 },
      })
    ).toThrow(ContextAssemblyError);

    try {
      truncateDialogueMessages({
        messages: createMessages(2),
        systemContext: 's'.repeat(400),
        options: { maxContextTokens: 100, responseTokenBuffer: 0 },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ContextAssemblyError);
      expect((error as ContextAssemblyError).code).toBe(
        'systemContextTooLong'
      );
    }
  });

  it('reserves the response token buffer before fitting messages', () => {
    // 4 messages x 100 tokens = 400; limit 500 fits, but a 200-token
    // response buffer forces truncation of the single non-recent message.
    const messages = createMessages(4);

    const result = truncateDialogueMessages({
      messages,
      options: {
        maxContextTokens: 500,
        responseTokenBuffer: 200,
        minimumRecentNodes: 3,
      },
    });

    expect(result.truncated).toBe(true);
    expect(result.droppedMessageCount).toBe(1);
    expect(result.messages[0]?.content.startsWith(TRUNCATION_MARKER)).toBe(
      true
    );
  });

  it('always keeps the most recent messages even when they exceed the budget', () => {
    const messages = createMessages(3);

    const result = truncateDialogueMessages({
      messages,
      options: {
        maxContextTokens: 100,
        responseTokenBuffer: 0,
        minimumRecentNodes: 4,
      },
    });

    expect(result.messages).toEqual(messages);
    expect(result.truncated).toBe(false);
  });

  it('always includes at least one message', () => {
    const messages = createMessages(1);

    const result = truncateDialogueMessages({
      messages,
      options: {
        maxContextTokens: 10,
        responseTokenBuffer: 0,
        minimumRecentNodes: 1,
      },
    });

    expect(result.messages).toHaveLength(1);
  });

  it('throws for strategies that are not implemented yet', () => {
    try {
      truncateDialogueMessages({
        messages: createMessages(10),
        options: {
          strategy: 'rollingWindow',
          maxContextTokens: 100,
          responseTokenBuffer: 0,
        },
      });
      throw new Error('Expected truncateDialogueMessages to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(ContextAssemblyError);
      expect((error as ContextAssemblyError).code).toBe(
        'strategyNotImplemented'
      );
    }
  });
});
