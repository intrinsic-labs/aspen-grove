import {
  isSelectableProvider,
  type SelectableProvider,
} from '@domain/entities';
import { PROVIDER_LABELS } from '../../models/provider-options';

/** A route's `provider` param as a provider Connections has a screen for. */
export const connectionProvider = (
  param: string | undefined
): SelectableProvider | null =>
  param && isSelectableProvider(param) ? param : null;

/** The provider screen's title: the provider's name, empty for an unknown one. */
export const connectionProviderTitle = (param: string | undefined): string => {
  const provider = connectionProvider(param);
  return provider ? PROVIDER_LABELS[provider] : '';
};
