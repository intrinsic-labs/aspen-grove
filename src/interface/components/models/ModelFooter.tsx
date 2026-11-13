import { StyleSheet, Text } from 'react-native';
import { formText } from '@/interface/ui/components/form';
import { DescriptionText } from './DescriptionText';

type ModelFooterProps = {
  readonly modelId: string | null;
  readonly description?: string;
  /** Ids: `<prefix>-footer-id`, `<prefix>-footer-description`. */
  readonly testIDPrefix: string;
};

/**
 * The Provider Options footer (TreeModelSettingsView.swift:131-142): the
 * model id in bold, then its description, 12 pt apart.
 */
export const ModelFooter = ({
  modelId,
  description,
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
  </>
);

const styles = StyleSheet.create({
  id: {
    fontWeight: '600',
  },
});
