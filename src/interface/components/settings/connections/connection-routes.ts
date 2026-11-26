import type { SelectableProvider } from '@domain/entities';

/**
 * Connections shows in two places with the same screens: pushed from
 * Settings, and as a sheet over the current screen ("Add key", "Open
 * Connections"). The sheet is a stack of its own, so a provider's screen
 * pushes inside it.
 */
export type ConnectionsScope = 'settings' | 'sheet';

export const connectionRoutes = {
  provider: (scope: ConnectionsScope, provider: SelectableProvider) =>
    ({
      pathname:
        scope === 'sheet'
          ? '/connections/[provider]'
          : '/settings/connections/[provider]',
      params: { provider },
    }) as const,
};
