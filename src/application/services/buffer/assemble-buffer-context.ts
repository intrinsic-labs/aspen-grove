import { bufferPassageText } from './buffer-passage-text';
import type { Node } from '@domain/entities';
import {
  ContextAssemblyError,
  DEFAULT_RESPONSE_TOKEN_BUFFER,
  estimateTokens,
} from '../context';

/**
 * Buffer-mode prompt assembly (docs/architecture/specs/context-assembly.md,
 * "Buffer Mode Assembly"). The prompt is the document's literal text and
 * nothing else. The only bytes this file adds are the two documented
 * constants below, and only when a prefix or a truncation needs them.
 */

/** Separates an opted-in system prefix from the document: one blank line. */
export const BUFFER_PREFIX_SEPARATOR = '\n\n';

/** Replaces the one run of whole nodes dropped from the middle. */
export const BUFFER_TRUNCATION_MARKER =
  '\n\n[... part of the document omitted ...]\n\n';

/** Eligible nodes kept at each end of a truncated document. */
export const BUFFER_PROTECTED_NODE_COUNT = 4;

export type AssembleBufferContextInput = {
  /** The active path's resolved versions, root first. */
  readonly resolvedNodes: readonly Node[];
  /** The working buffer: uncommitted text after the last committed node. */
  readonly tail: string;
  /** The tree's system context. Sent only when `includeSystemPrefix` is true. */
  readonly systemPrefix?: string;
  readonly includeSystemPrefix?: boolean;
  readonly maxContextTokens: number;
  /** Requested output length; the reserve is `max(maxTokens, 1024)`. */
  readonly maxTokens: number;
};

export type AssembledBufferContext = {
  readonly prompt: string;
  /** Whole nodes removed from the middle (0 when nothing was truncated). */
  readonly droppedNodeCount: number;
  readonly estimatedPromptTokens: number;
  /** Context window minus the output reserve. */
  readonly promptBudgetTokens: number;
};

const eligibleTexts = (nodes: readonly Node[]): string[] =>
  nodes
    .filter((node) => !node.metadata.excluded && !node.metadata.pruned)
    .map(bufferPassageText)
    .filter((text) => text.length > 0);

export const assembleBufferContext = (
  input: AssembleBufferContextInput
): AssembledBufferContext => {
  const reserve = Math.max(input.maxTokens, DEFAULT_RESPONSE_TOKEN_BUFFER);
  const budget = input.maxContextTokens - reserve;
  const prefix =
    input.includeSystemPrefix && input.systemPrefix
      ? input.systemPrefix + BUFFER_PREFIX_SEPARATOR
      : '';
  const { tail } = input;

  const refuse = (code: 'systemContextTooLong' | 'contextExceedsLimit') => {
    throw new ContextAssemblyError({
      code,
      message:
        code === 'systemContextTooLong'
          ? 'The system prefix alone exceeds the prompt budget (context window minus output reserve).'
          : 'The working text and the protected first and last nodes exceed the prompt budget (context window minus output reserve); no node is split.',
    });
  };

  if (budget <= 0 || estimateTokens(prefix) > budget) {
    return refuse('systemContextTooLong');
  }

  const texts = eligibleTexts(input.resolvedNodes);
  const whole = prefix + texts.join('') + tail;
  const wholeTokens = estimateTokens(whole);
  if (wholeTokens <= budget) {
    return {
      prompt: whole,
      droppedNodeCount: 0,
      estimatedPromptTokens: wholeTokens,
      promptBudgetTokens: budget,
    };
  }

  const keep = BUFFER_PROTECTED_NODE_COUNT;
  if (texts.length <= keep * 2) return refuse('contextExceedsLimit');

  const recent = texts.slice(texts.length - keep).join('');
  const middleCount = texts.length - keep * 2;
  // `extra` leading middle nodes stay; the rest of the middle is one gap.
  const build = (extra: number): string =>
    prefix +
    texts.slice(0, keep + extra).join('') +
    BUFFER_TRUNCATION_MARKER +
    recent +
    tail;
  const fits = (extra: number): boolean =>
    estimateTokens(build(extra)) <= budget;

  if (!fits(0)) return refuse('contextExceedsLimit');
  let low = 0;
  let high = middleCount - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(mid)) low = mid;
    else high = mid - 1;
  }
  const prompt = build(low);
  return {
    prompt,
    droppedNodeCount: middleCount - low,
    estimatedPromptTokens: estimateTokens(prompt),
    promptBudgetTokens: budget,
  };
};
