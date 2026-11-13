import { StyleSheet, Text } from 'react-native';
import { formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { toDescriptionSegments } from './description-segments';

type ModelFooterProps = {
  readonly modelId: string | null;
  readonly description?: string;
};

/**
 * The Provider Options footer (TreeModelSettingsView.swift:131-142): the
 * model id in bold, then its description, 12 pt apart.
 */
export const ModelFooter = ({ modelId, description }: ModelFooterProps) => (
  <>
    {modelId ? (
      <Text testID="tree-model-footer-id" style={[formText.footer, styles.id]}>
        {modelId}
      </Text>
    ) : null}
    {description ? (
      <Text testID="tree-model-footer-description" style={formText.footer}>
        {toDescriptionSegments(description).map((segment, index) => (
          <Text
            key={index}
            style={
              segment.link ? styles.link : segment.bold ? styles.id : undefined
            }
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    ) : null}
  </>
);

const styles = StyleSheet.create({
  id: {
    fontWeight: '600',
  },
  link: {
    color: loomUiTokens.colors.accentColor,
  },
});
