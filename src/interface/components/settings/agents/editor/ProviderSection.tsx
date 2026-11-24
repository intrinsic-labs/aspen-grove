import { FormSection } from '@/interface/ui/components/form';
import { PROVIDER_LABELS } from '../../../models/provider-options';
import { FormCheckRow } from './FormCheckRow';

type ProviderSectionProps<P extends keyof typeof PROVIDER_LABELS> = {
  /** The providers offered, in order. */
  readonly providers: readonly P[];
  readonly provider: P;
  readonly onChange: (provider: P) => void;
  /** Rows are `<prefix>-<provider>`. */
  readonly testIDPrefix: string;
};

/**
 * The provider as an inline Form picker, as Latent Spaces' Provider picker
 * (LoomSettingsView.swift:122-134). Used by onboarding, with its two providers.
 */
export const ProviderSection = <P extends keyof typeof PROVIDER_LABELS>({
  providers,
  provider,
  onChange,
  testIDPrefix,
}: ProviderSectionProps<P>) => (
  <FormSection header="Provider">
    {providers.map((candidate) => (
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
