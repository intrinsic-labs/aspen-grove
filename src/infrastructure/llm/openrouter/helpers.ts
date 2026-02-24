import type {
  CompletionResponse,
  Message,
  ToolCall,
} from '@application/services/llm';
import type {
  OpenRouterMessagePayload,
  OpenRouterResponsePayload,
  OpenRouterToolCall,
} from './types';

export const toJsonString = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const headersToString = (headers: Headers): string => {
  const lines: string[] = [];
  headers.forEach((value, key) => {
    lines.push(`${key}: ${value}`);
  });
  lines.sort((a, b) => a.localeCompare(b));
  return lines.join('\n');
};

export const parseRetryAfterMs = (headers: Headers): number | undefined => {
  const retryAfter = headers.get('retry-after');
  if (!retryAfter) {
    return undefined;
  }

  const seconds = Number(retryAfter);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const date = new Date(retryAfter);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
};

const toOpenRouterContent = (
  message: Message
): OpenRouterMessagePayload['content'] => {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content.map((block) => {
    if (block.type === 'text') {
      return {
        type: 'text',
        text: block.text,
      };
    }

    if (block.source.type === 'url') {
      return {
        type: 'image_url',
        image_url: { url: block.source.data },
      };
    }

    const dataUrl = `data:${block.source.mediaType};base64,${block.source.data}`;
    return {
      type: 'image_url',
      image_url: { url: dataUrl },
    };
  });
};

export const toOpenRouterMessages = (
  messages: readonly Message[],
  systemPrompt?: string
): OpenRouterMessagePayload[] => {
  const next: OpenRouterMessagePayload[] = [];
  const trimmedSystem = systemPrompt?.trim();
  if (trimmedSystem) {
    next.push({
      role: 'system',
      content: trimmedSystem,
    });
  }

  for (const message of messages) {
    next.push({
      role: message.role,
      content: toOpenRouterContent(message),
    });
  }

  return next;
};

const parseToolCallArguments = (raw?: string): Record<string, unknown> => {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

export const toToolCalls = (
  toolCalls: OpenRouterToolCall[] | undefined
): ToolCall[] | undefined => {
  if (!toolCalls || toolCalls.length === 0) {
    return undefined;
  }

  const mapped = toolCalls
    .map((toolCall, index) => {
      const name = toolCall.function?.name;
      if (!name) {
        return null;
      }

      return {
        id: toolCall.id ?? `tool-call-${index}`,
        name,
        arguments: parseToolCallArguments(toolCall.function?.arguments),
      };
    })
    .filter((toolCall): toolCall is ToolCall => Boolean(toolCall));

  return mapped.length > 0 ? mapped : undefined;
};

export const toCompletionText = (
  content: string | Array<Record<string, unknown>> | null | undefined
): string => {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((chunk) => {
      const text = chunk['text'];
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean)
    .join('');
};

export const toFinishReason = (
  finishReason: string | null | undefined
): CompletionResponse['finishReason'] => {
  switch (finishReason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'toolUse';
    default:
      return 'error';
  }
};

export const toTokenUsage = (usage: OpenRouterResponsePayload['usage']) => {
  if (!usage) {
    return undefined;
  }

  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    totalTokens:
      usage.total_tokens ??
      (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
  };
};

