import { StyleSheet, View, type TextStyle } from 'react-native';
import type { NodeViewStyle } from '@domain/entities';
import { FormSection } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import type { ChatFontFace } from '../types';
import { SampleNode } from './SampleNode';

const preview = loomUiTokens.settingsPreview;

/** LoomSettingsView.swift:287-290 */
const SAMPLES = [
  { author: 'user', text: 'Hello! How are you?' },
  { author: 'model', text: "I'm great. How are you doing today?" },
  {
    author: 'user',
    text: "Fine. Just contemplating the infinite possibilities within my grasp now that I'm talking to you via Aspen Grove.",
  },
  {
    author: 'model',
    text: 'To weave or not to weave, that is the question. (hint: weave)',
  },
] as const;

type InterfacePreviewSectionProps = {
  readonly fontFace: ChatFontFace;
  readonly fontSize: number;
  readonly nodeViewStyle: NodeViewStyle;
  readonly cornerRadius: number;
};

/**
 * "User Interface Preview": four sample messages drawn with the chosen
 * font, size, message style and corner radius, straight on the page
 * (LoomSettingsView.swift:284-299).
 */
export const InterfacePreviewSection = ({
  fontFace,
  fontSize,
  nodeViewStyle,
  cornerRadius,
}: InterfacePreviewSectionProps) => {
  // Cardo is drawn a little larger (LoomFont.swift:39); the line keeps the
  // font's natural leading, as SwiftUI does.
  const textStyle: TextStyle = {
    fontFamily: fontFace,
    fontSize:
      fontFace === 'Cardo-Regular'
        ? fontSize + preview.cardoSizeOffset
        : fontSize,
  };

  return (
    <FormSection
      testID="settings-typography-preview"
      header="User Interface Preview"
      plain
    >
      <View style={styles.samples}>
        {SAMPLES.map((sample) => (
          <SampleNode
            key={sample.text}
            text={sample.text}
            author={sample.author}
            textStyle={textStyle}
            nodeViewStyle={nodeViewStyle}
            cornerRadius={cornerRadius}
          />
        ))}
      </View>
    </FormSection>
  );
};

const styles = StyleSheet.create({
  samples: {
    gap: preview.rowGap,
    paddingVertical: preview.verticalPadding,
  },
});
