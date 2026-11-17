import { describe, expect, it } from '@jest/globals';
import { modelChoiceChanges } from './model-choice';
import { maxTokensAllowed } from '../../models/model-max-tokens';
import { toTreeModelValues } from './tree-model-values';

const small = { id: 'small', label: 'Small', maxOutputTokens: 2048 };
const large = { id: 'large', label: 'Large', maxOutputTokens: 32768 };

describe('modelChoiceChanges', () => {
  it("holds a saved Maximum Output Tokens to a smaller model's limit", () => {
    const configuration = { maxTokens: 8192, useMaxTokens: false };

    const changes = modelChoiceChanges(
      'openrouter',
      small.id,
      small,
      configuration
    );

    expect(changes).toEqual({
      modelRef: 'openrouter:small',
      maxTokens: 2048,
    });
    // What is saved is what the form shows for the new model.
    expect(changes.maxTokens).toBe(
      toTreeModelValues(
        { ...configuration, ...changes },
        maxTokensAllowed(small)
      ).maxTokens
    );
  });

  it('keeps a saved value that fits the new model', () => {
    expect(
      modelChoiceChanges('openrouter', large.id, large, {
        maxTokens: 8192,
        useMaxTokens: false,
      })
    ).toEqual({ modelRef: 'openrouter:large' });
  });

  it("takes the new model's own limit with Always use maximum allowed on", () => {
    expect(
      modelChoiceChanges('lmstudio', large.id, large, {
        maxTokens: 2048,
        useMaxTokens: true,
      })
    ).toEqual({ modelRef: 'lmstudio:large', maxTokens: 32768 });
    expect(
      modelChoiceChanges('openrouter', small.id, small, {
        maxTokens: 32768,
        useMaxTokens: true,
      })
    ).toEqual({ modelRef: 'openrouter:small', maxTokens: 2048 });
  });

  it('leaves an agent that sets no Maximum Output Tokens with none', () => {
    // Its requests send no max_tokens; choosing a model must not start
    // sending one the reader never set.
    expect(modelChoiceChanges('lmstudio', large.id, large, {})).toEqual({
      modelRef: 'lmstudio:large',
    });
    expect(
      modelChoiceChanges('openrouter', small.id, small, { useMaxTokens: false })
    ).toEqual({ modelRef: 'openrouter:small' });
  });
});
