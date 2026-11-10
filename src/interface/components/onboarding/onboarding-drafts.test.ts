import { describe, expect, it } from '@jest/globals';
import { validateAgentDraft } from '../settings/agents/agent-editor-types';
import { lmStudioAgentDraft, lmStudioAgentName } from './onboarding-drafts';

describe('onboarding drafts', () => {
  it('names an LM Studio agent after the last part of the model key', () => {
    expect(lmStudioAgentName('qwen/qwen3-8b')).toBe('qwen3-8b');
    expect(lmStudioAgentName('gemma-3-12b')).toBe('gemma-3-12b');
  });

  it('builds a valid LM Studio draft once a model is picked', () => {
    const draft = lmStudioAgentDraft('qwen/qwen3-8b');
    expect(draft.provider).toBe('lmstudio');
    expect(draft.modelIdentifier).toBe('qwen/qwen3-8b');
    expect(validateAgentDraft(draft)).toBeNull();
  });

  it('is not valid before a model is picked', () => {
    expect(validateAgentDraft(lmStudioAgentDraft(''))).not.toBeNull();
  });
});
