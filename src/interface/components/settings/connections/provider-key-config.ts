import type { KeyedProvider } from '@domain/entities';
import type { FormIconName } from '@/interface/ui/components/form';

type KeyLink = {
  readonly title: string;
  readonly icon: FormIconName;
  readonly url: string;
  /** testID suffix: `connections-<provider>-link-<suffix>`. */
  readonly suffix: 'docs' | 'keys' | 'credits';
};

/** What differs between the hosted providers' key sections and sheets. */
export type ProviderKeyConfig = {
  readonly provider: KeyedProvider;
  /** As people know it: the section header and the sheet's title. */
  readonly name: string;
  /** Shown while the field is empty, hinting what a key looks like. */
  readonly placeholder: string;
  /** What a missing key costs, for the section footer. */
  readonly needsKeyCopy: string;
  /** Whether a stored key can be checked with an authenticated call. */
  readonly canTest: boolean;
  /** Where to get, manage and fund a key (Latent Spaces' three links). */
  readonly links: readonly KeyLink[];
};

/**
 * The key sections, in the order Settings shows them. Latent Spaces' API
 * Keys page has Anthropic and OpenRouter (APIKeySettingsView.swift:85-131);
 * Aspen Grove adds OpenAI. OpenRouter's catalog is public, so its key has no
 * authenticated call to test with.
 */
export const PROVIDER_KEY_CONFIGS: readonly ProviderKeyConfig[] = [
  {
    provider: 'openrouter',
    name: 'OpenRouter',
    placeholder: 'Enter Key',
    needsKeyCopy: 'No key stored yet. Models through OpenRouter need one.',
    canTest: false,
    links: [
      {
        title: "I Don't Have A Key",
        icon: 'help-circle-outline',
        url: 'https://openrouter.ai/docs/api-keys',
        suffix: 'docs',
      },
      {
        title: 'Manage Keys (openrouter.ai)',
        icon: 'key-outline',
        url: 'https://openrouter.ai/settings/keys',
        suffix: 'keys',
      },
      {
        title: 'Manage Credit Balance (openrouter.ai)',
        icon: 'card-outline',
        url: 'https://openrouter.ai/credits',
        suffix: 'credits',
      },
    ],
  },
  {
    provider: 'anthropic',
    name: 'Anthropic',
    placeholder: 'Enter Key (sk-ant-…)',
    needsKeyCopy: 'No key stored yet. Claude models from Anthropic need one.',
    canTest: true,
    links: [
      {
        title: "I Don't Have A Key",
        icon: 'help-circle-outline',
        url: 'https://platform.claude.com/docs/en/get-started',
        suffix: 'docs',
      },
      {
        title: 'Manage Keys (claude.com)',
        icon: 'key-outline',
        url: 'https://platform.claude.com/settings/keys',
        suffix: 'keys',
      },
      {
        title: 'Manage Credit Balance (claude.com)',
        icon: 'card-outline',
        url: 'https://platform.claude.com/settings/billing',
        suffix: 'credits',
      },
    ],
  },
  {
    provider: 'openai',
    name: 'OpenAI',
    placeholder: 'Enter Key (sk-…)',
    needsKeyCopy: 'No key stored yet. GPT models from OpenAI need one.',
    canTest: true,
    links: [
      {
        title: "I Don't Have A Key",
        icon: 'help-circle-outline',
        url: 'https://developers.openai.com/api/docs/quickstart',
        suffix: 'docs',
      },
      {
        title: 'Manage Keys (openai.com)',
        icon: 'key-outline',
        url: 'https://platform.openai.com/api-keys',
        suffix: 'keys',
      },
      {
        title: 'Manage Credit Balance (openai.com)',
        icon: 'card-outline',
        url: 'https://platform.openai.com/settings/organization/billing/overview',
        suffix: 'credits',
      },
    ],
  },
];

export const providerKeyConfig = (provider: KeyedProvider): ProviderKeyConfig =>
  PROVIDER_KEY_CONFIGS.find((config) => config.provider === provider) ??
  PROVIDER_KEY_CONFIGS[0]!;
