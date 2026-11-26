import {
  isSelectableProvider,
  type SelectableProvider,
} from '@domain/entities';

/** The providers whose models open in the browser (LM Studio's is a menu). */
export type BrowsableProvider = Exclude<SelectableProvider, 'lmstudio'>;

/** A route's `provider` param as a browsable provider; OpenRouter when absent or unknown. */
export const browsableProvider = (
  param: string | undefined
): BrowsableProvider =>
  param && isSelectableProvider(param) && param !== 'lmstudio'
    ? param
    : 'openrouter';
