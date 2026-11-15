import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@interface/test-support/render-hook';
import type { ModelOption } from '../../../models/model-options';
import { EMPTY_AGENT_DRAFT } from '../agent-draft-from-agent';
import type { AgentDraft } from '../agent-editor-types';
import { useHoldMaxTokensToModel } from './useHoldMaxTokensToModel';

const small: ModelOption = {
  id: 'small',
  label: 'Small',
  maxOutputTokens: 2048,
};
const large: ModelOption = {
  id: 'large',
  label: 'Large',
  maxOutputTokens: 65536,
};

type Props = {
  readonly draft: AgentDraft;
  readonly selected: ModelOption | undefined;
};

const setup = (initial: Props) => {
  const patchDraft = jest.fn<(changes: Partial<AgentDraft>) => void>();
  const hook = renderHook(
    ({ draft, selected }: Props) =>
      useHoldMaxTokensToModel(draft, selected, patchDraft),
    initial
  );
  return { patchDraft, ...hook };
};

const draft = (changes: Partial<AgentDraft>): AgentDraft => ({
  ...EMPTY_AGENT_DRAFT,
  ...changes,
});

describe('useHoldMaxTokensToModel', () => {
  it('waits for the model list, then holds Max Tokens to the model', async () => {
    const start = draft({ modelIdentifier: 'large', maxTokensInput: '32768' });
    const { patchDraft, rerender } = setup({
      draft: start,
      selected: undefined,
    });
    await act(() => undefined);
    expect(patchDraft).not.toHaveBeenCalled();

    await rerender({ draft: start, selected: large });
    expect(patchDraft).not.toHaveBeenCalled();

    // Switched to a 2048-token model.
    const switched = { ...start, modelIdentifier: 'small' };
    await rerender({ draft: switched, selected: small });
    expect(patchDraft).toHaveBeenCalledWith({ maxTokensInput: '2048' });
  });

  it('holds once per model, so a value typed afterwards stays', async () => {
    const start = draft({
      modelIdentifier: 'small',
      maxTokensInput: '4096',
      useMaxTokens: true,
    });
    const { patchDraft, rerender } = setup({ draft: start, selected: small });
    await act(() => undefined);
    expect(patchDraft).toHaveBeenCalledTimes(1);
    expect(patchDraft).toHaveBeenCalledWith({ maxTokensInput: '2048' });

    await rerender({
      draft: { ...start, maxTokensInput: '1000', useMaxTokens: false },
      selected: small,
    });
    expect(patchDraft).toHaveBeenCalledTimes(1);
  });
});
