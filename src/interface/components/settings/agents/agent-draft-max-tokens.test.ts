import { describe, expect, it } from '@jest/globals';
import { modelChoiceChanges } from '../../chat/tree-model/model-choice';
import {
  maxTokensForChosenModel,
  parseMaxTokensInput,
  typedMaxTokens,
} from './agent-draft-max-tokens';
import { agentDraftToConfig } from './agent-draft-to-config';
import { EMPTY_AGENT_DRAFT } from './agent-draft-from-agent';

const small = { id: 'small', label: 'Small', maxOutputTokens: 2048 };
const large = { id: 'large', label: 'Large', maxOutputTokens: 65536 };

describe('parseMaxTokensInput', () => {
  it('reads a positive whole number and nothing else', () => {
    expect(parseMaxTokensInput(' 2048 ')).toBe(2048);
    expect(parseMaxTokensInput('')).toBeUndefined();
    expect(parseMaxTokensInput('0')).toBeUndefined();
    expect(parseMaxTokensInput('1.5')).toBeUndefined();
    expect(parseMaxTokensInput('abc')).toBeUndefined();
  });
});

describe('maxTokensForChosenModel', () => {
  it("holds a typed value to a smaller model's limit", () => {
    expect(maxTokensForChosenModel({ maxTokensInput: '32768' }, small)).toEqual(
      { maxTokensInput: '2048' }
    );
  });

  it("takes the model's limit with Always use maximum allowed on", () => {
    expect(
      maxTokensForChosenModel(
        { maxTokensInput: '32768', useMaxTokens: true },
        small
      )
    ).toEqual({ maxTokensInput: '2048' });
    expect(
      maxTokensForChosenModel({ maxTokensInput: '', useMaxTokens: true }, large)
    ).toEqual({ maxTokensInput: '65536' });
  });

  it('leaves a value that fits, and the provider default, alone', () => {
    expect(maxTokensForChosenModel({ maxTokensInput: '1024' }, small)).toBe(
      null
    );
    expect(maxTokensForChosenModel({ maxTokensInput: '' }, small)).toBe(null);
  });

  it("matches what a tree's Model Settings saves for the same choice", () => {
    for (const [maxTokens, useMaxTokens] of [
      [32768, false],
      [32768, true],
      [1024, false],
      [1024, true],
    ] as const) {
      const tree = modelChoiceChanges('openrouter', small.id, small, {
        maxTokens,
        useMaxTokens,
      });
      const agent = maxTokensForChosenModel(
        { maxTokensInput: String(maxTokens), useMaxTokens },
        small
      );
      expect(agent?.maxTokensInput ?? String(maxTokens)).toBe(
        String(tree.maxTokens ?? maxTokens)
      );
    }
  });
});

describe('typedMaxTokens', () => {
  it("caps a typed value at a known model's limit", () => {
    expect(typedMaxTokens('40000', small)).toEqual({
      maxTokensInput: '2048',
      useMaxTokens: false,
    });
    expect(typedMaxTokens('2000', small).maxTokensInput).toBe('2000');
  });

  it('takes what is typed when the model is unknown, or not a number', () => {
    expect(typedMaxTokens('40000', undefined).maxTokensInput).toBe('40000');
    expect(typedMaxTokens('', small).maxTokensInput).toBe('');
    expect(typedMaxTokens('4x', small).maxTokensInput).toBe('4x');
  });

  it('turns Always use maximum allowed off, and saving says so', () => {
    const draft = {
      ...EMPTY_AGENT_DRAFT,
      name: 'A',
      modelIdentifier: small.id,
      useMaxTokens: true,
      ...typedMaxTokens('1000', small),
    };
    expect(agentDraftToConfig(draft).configuration).toMatchObject({
      maxTokens: 1000,
      useMaxTokens: false,
    });
  });

  it("keeps the stored flag when the draft doesn't set it", () => {
    expect(
      agentDraftToConfig({ ...EMPTY_AGENT_DRAFT, modelIdentifier: 'x' })
        .configuration
    ).not.toHaveProperty('useMaxTokens');
  });
});
