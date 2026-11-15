import { StyleSheet, Text } from 'react-native';
import { formText } from '@/interface/ui/components/form';
import { DescriptionText } from './DescriptionText';

type ModelFooterProps = {
  readonly modelId: string | null;
  readonly description?: string;
  /** "Context: 128,000 tokens", for an OpenRouter model. */
  readonly context?: string;
  /**
   * Ids: `<prefix>-footer-id`, `<prefix>-footer-description`,
   * `<prefix>-footer-context`.
   */
  readonly testIDPrefix: string;
};

/**
 * The Provider Options footer (TreeModelSettingsView.swift:131-142): the
 * model id in bold, then its description, 12 pt apart. Aspen Grove adds the
 * model's context window last.
 */
export const ModelFooter = ({
  modelId,
  description,
  context,
  testIDPrefix,
}: ModelFooterProps) => (
  <>
    {modelId ? (
      <Text
        testID={`${testIDPrefix}-footer-id`}
        style={[formText.footer, styles.id]}
      >
        {modelId}
      </Text>
    ) : null}
    {description ? (
      <DescriptionText
        testID={`${testIDPrefix}-footer-description`}
        markdown={description}
        style={formText.footer}
      />
    ) : null}
    {context ? (
      <Text testID={`${testIDPrefix}-footer-context`} style={formText.footer}>
        {context}
      </Text>
    ) : null}
  </>
);

const styles = StyleSheet.create({
  id: {
    fontWeight: '600',
  },
});
