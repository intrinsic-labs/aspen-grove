import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { toDescriptionSegments } from './description-segments';

type DescriptionTextProps = {
  /** OpenRouter's description, in inline Markdown. */
  readonly markdown: string;
  readonly style: StyleProp<TextStyle>;
  readonly testID?: string;
};

/** A model description: links tinted, bold as bold, the rest as written. */
export const DescriptionText = ({
  markdown,
  style,
  testID,
}: DescriptionTextProps) => (
  <Text testID={testID} style={style}>
    {toDescriptionSegments(markdown).map((segment, index) => (
      <Text
        key={index}
        style={
          segment.link ? styles.link : segment.bold ? styles.bold : undefined
        }
      >
        {segment.text}
      </Text>
    ))}
  </Text>
);

const styles = StyleSheet.create({
  bold: {
    fontWeight: '600',
  },
  link: {
    color: loomUiTokens.colors.accentColor,
  },
});
