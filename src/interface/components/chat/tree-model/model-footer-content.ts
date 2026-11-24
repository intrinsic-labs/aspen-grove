import { formatContextLength } from '../../models/model-info-format';
import type { ModelOption } from '../../models/model-options';

const NO_MODEL_NOTE = 'Choose a model for this tree.';

/** The slice of the Model Settings form the footer reads. */
export type ModelFooterSource = {
  readonly provider: string;
  readonly modelId: string | null;
  readonly hasAgent: boolean;
  readonly selected: ModelOption | undefined;
  readonly picker: {
    readonly settledFor: string | null;
    readonly error: string | null;
  };
};

export type ModelFooterContent = {
  readonly description?: string;
  /** A catalog model's context window, as "Context: 128,000 tokens". */
  readonly context?: string;
};

/**
 * What the Provider Options footer shows under the model id: a catalog
 * model's description (OpenRouter's) and context window, LM Studio's detail
 * line (which carries its own context), the list's error, or a nudge to
 * choose a model.
 */
export const modelFooterContent = (
  source: ModelFooterSource
): ModelFooterContent => {
  if (source.picker.settledFor === source.provider && source.picker.error) {
    return { description: source.picker.error };
  }
  if (!source.modelId) {
    return source.hasAgent ? {} : { description: NO_MODEL_NOTE };
  }
  if (source.provider === 'lmstudio') {
    return { description: source.selected?.detail };
  }
  const contextLength = source.selected?.catalog?.contextLength;
  return {
    description: source.selected?.description,
    context: contextLength ? formatContextLength(contextLength) : undefined,
  };
};
