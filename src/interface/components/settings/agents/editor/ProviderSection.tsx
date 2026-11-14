import {
  SELECTABLE_PROVIDERS,
  type SelectableProvider,
} from '@domain/entities';
import { FormSection } from '@/interface/ui/components/form';
import { FormCheckRow } from './FormCheckRow';

export const PROVIDER_LABELS: Record<SelectableProvider, string> = {
  openrouter: 'OpenRouter',
  lmstudio: 'LM Studio',
};

type ProviderSectionProps = {
  readonly provider: SelectableProvider;
  readonly onChange: (provider: SelectableProvider) => void;
  /** Rows are `<prefix>-<provider>`. */
  readonly testIDPrefix: string;
};

/**
 * The provider as an inline Form picker, as Latent Spaces' Provider picker
 * (LoomSettingsView.swift:122-134). Used by the agent editor and onboarding.
 */
export const ProviderSection = ({
  provider,
  onChange,
  testIDPrefix,
}: ProviderSectionProps) => (
  <FormSection header="Provider">
    {SELECTABLE_PROVIDERS.map((candidate) => (
      <FormCheckRow
        key={candidate}
        testID={`${testIDPrefix}-${candidate}`}
        title={PROVIDER_LABELS[candidate]}
        selected={candidate === provider}
        onPress={() => {
          if (candidate !== provider) {
            onChange(candidate);
          }
        }}
      />
    ))}
  </FormSection>
);
