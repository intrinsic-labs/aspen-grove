import { useRouter } from 'expo-router';
import { FormLinkRow, FormSection } from '@/interface/ui/components/form';
import { SELECTABLE_PROVIDERS } from '@domain/entities';
import { PROVIDER_LABELS } from '../../models/provider-options';
import { connectionRoutes, type ConnectionsScope } from './connection-routes';
import { useConnectionStatuses } from './useConnectionStatuses';

type ConnectionsListProps = {
  readonly scope: ConnectionsScope;
};

/**
 * One row per provider (OpenRouter, Anthropic, OpenAI, LM Studio), each
 * saying where it stands and pushing that provider's screen. Latent Spaces'
 * API Keys page is one flat Form of two providers; with four, Aspen Grove
 * keeps the page short and puts each provider's settings behind a row, as
 * Settings does for Agents and Connections. Ids: `connections-row-<provider>`.
 */
export const ConnectionsList = ({ scope }: ConnectionsListProps) => {
  const router = useRouter();
  const statuses = useConnectionStatuses();
  return (
    <FormSection testID="connections-list">
      {SELECTABLE_PROVIDERS.map((provider) => (
        <FormLinkRow
          key={provider}
          testID={`connections-row-${provider}`}
          title={PROVIDER_LABELS[provider]}
          value={statuses[provider]}
          onPress={() =>
            router.push(connectionRoutes.provider(scope, provider))
          }
        />
      ))}
    </FormSection>
  );
};
