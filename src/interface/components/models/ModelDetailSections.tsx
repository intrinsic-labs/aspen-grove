import { Linking, StyleSheet, View } from 'react-native';
import type { OpenRouterCatalogModel } from '@application/services/llm';
import {
  FormButtonRow,
  FormSection,
  formText,
} from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import type { BrowsableProvider } from './browsable-provider';
import { DescriptionText } from './DescriptionText';
import {
  formatIsoDay,
  formatModalities,
  formatTokensFull,
  formatUnixDate,
  openRouterModelUrl,
} from './model-info-format';
import { pricingLines } from './model-price-format';
import { ModelInfoRow } from './ModelInfoRow';
import { ModelParameterChips } from './ModelParameterChips';

const browser = loomUiTokens.modelBrowser;

type ModelDetailSectionsProps = {
  readonly provider: BrowsableProvider;
  readonly model: OpenRouterCatalogModel;
};

const tokens = (count?: number): string | null =>
  count === undefined ? null : `${formatTokensFull(count)} tokens`;

/**
 * What a model's page tells a person choosing it: what it is, how much it
 * reads and writes, what it costs, what it takes in and puts out, which
 * parameters it accepts, when it arrived, and (OpenRouter's) a link to the
 * page itself. Sections without data are left out; Anthropic's and OpenAI's
 * lists carry no prices or descriptions, so those sections don't show.
 */
export const ModelDetailSections = ({
  model,
  provider,
}: ModelDetailSectionsProps) => {
  const context = tokens(model.contextLength);
  const maxOutput = tokens(model.maxCompletionTokens);
  const prices = pricingLines(model);
  const parameters = model.supportedParameters ?? [];
  const hasDetails =
    provider === 'openrouter' ||
    model.aliasOf !== undefined ||
    model.created !== undefined ||
    model.knowledgeCutoff !== undefined;

  return (
    <>
      {model.description ? (
        <FormSection header="About">
          <View style={styles.description}>
            <DescriptionText
              testID="model-detail-description"
              markdown={model.description}
              style={[formText.body, styles.descriptionText]}
            />
          </View>
        </FormSection>
      ) : null}

      {context || maxOutput ? (
        <FormSection header="Limits">
          {context ? (
            <ModelInfoRow
              testID="model-detail-context"
              title="Context"
              value={context}
            />
          ) : null}
          {maxOutput ? (
            <ModelInfoRow
              testID="model-detail-max-output"
              title="Max output"
              value={maxOutput}
            />
          ) : null}
        </FormSection>
      ) : null}

      {prices.length > 0 ? (
        <FormSection header="Pricing" testID="model-detail-pricing">
          {prices.map((line) => (
            <ModelInfoRow
              key={line.label}
              title={line.label}
              value={line.value}
            />
          ))}
        </FormSection>
      ) : null}

      {model.inputModalities || model.outputModalities ? (
        <FormSection header="Modalities">
          {model.inputModalities ? (
            <ModelInfoRow
              title="Input"
              value={formatModalities(model.inputModalities)}
            />
          ) : null}
          {model.outputModalities ? (
            <ModelInfoRow
              title="Output"
              value={formatModalities(model.outputModalities)}
            />
          ) : null}
        </FormSection>
      ) : null}

      {parameters.length > 0 ? (
        <FormSection header="Supported Parameters">
          <ModelParameterChips parameters={parameters} />
        </FormSection>
      ) : null}

      {hasDetails ? (
        <FormSection header="Details">
          {model.aliasOf ? (
            <ModelInfoRow title="Points to" value={model.aliasOf} />
          ) : null}
          {model.created !== undefined ? (
            <ModelInfoRow
              testID="model-detail-created"
              title="Added"
              value={formatUnixDate(model.created)}
            />
          ) : null}
          {model.knowledgeCutoff ? (
            <ModelInfoRow
              title="Knowledge cutoff"
              value={formatIsoDay(model.knowledgeCutoff)}
            />
          ) : null}
          {provider === 'openrouter' ? (
            <FormButtonRow
              testID="model-detail-link"
              title="View on OpenRouter"
              icon="open-outline"
              onPress={() => void Linking.openURL(openRouterModelUrl(model))}
            />
          ) : null}
        </FormSection>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  description: {
    paddingHorizontal: loomUiTokens.settingsForm.rowPaddingHorizontal,
    paddingVertical: browser.descriptionPadding,
  },
  descriptionText: {
    fontSize: browser.descriptionSize,
    lineHeight: browser.descriptionLineHeight,
  },
});
