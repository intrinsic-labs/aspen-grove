import { LmStudioConnectionSection } from './LmStudioConnectionSection';
import { OpenRouterConnectionSection } from './OpenRouterConnectionSection';
import type { ConnectionsController } from './useConnectionsController';

type ConnectionsSectionProps = {
  readonly controller: ConnectionsController;
};

/**
 * Provider connections: OpenRouter API key and the LM Studio server.
 * Model + generation configuration intentionally live on Agents instead.
 */
export const ConnectionsSection = ({ controller }: ConnectionsSectionProps) => (
  <>
    <OpenRouterConnectionSection controller={controller} />
    <LmStudioConnectionSection controller={controller} />
  </>
);
