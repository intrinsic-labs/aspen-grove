import { StyleSheet, View } from 'react-native';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import { BufferFixtureLink } from './BufferFixtureLink';
import { hasWebEngine, type BufferEngine } from './BufferEditorSurface';
import type { BufferRenderVariant } from './BufferTextInput';
import { STRESS_FIXTURE_SIZES } from './buffer-preview-fixture';

const { control } = bufferTokens;

const NEXT_VARIANT: Record<BufferRenderVariant, BufferRenderVariant> = {
  spans: 'single',
  single: 'plain',
  plain: 'spans',
};

type BufferFixtureControlsProps = {
  readonly variant: BufferRenderVariant;
  readonly engine: BufferEngine;
  readonly onLoadSample: () => void;
  readonly onLoadStress: (length: number) => void;
  readonly onLoadParagraphs: () => void;
  readonly onVariant: (variant: BufferRenderVariant) => void;
  readonly onEngine: (engine: BufferEngine) => void;
};

/**
 * The developer-preview fixture links on an empty buffer: the review sample,
 * the long document at each measured size, the same 30,000 as real
 * paragraphs, a toggle for how the text is handed to the native input and, on
 * Android, one for the editor engine (native input or the CodeMirror WebView). `buffer-load-stress` stays the 30,000 link.
 */
export const BufferFixtureControls = ({
  variant,
  engine,
  onLoadSample,
  onLoadStress,
  onLoadParagraphs,
  onVariant,
  onEngine,
}: BufferFixtureControlsProps) => (
  <View style={styles.controls}>
    <View style={styles.row}>
      <BufferFixtureLink
        testID="buffer-load-sample"
        label="Load sample"
        onPress={onLoadSample}
      />
      <BufferFixtureLink
        testID="buffer-variant"
        label={`Mode: ${variant}`}
        onPress={() => onVariant(NEXT_VARIANT[variant])}
      />
      {hasWebEngine ? (
        <BufferFixtureLink
          testID="buffer-engine"
          label={`Engine: ${engine}`}
          onPress={() => onEngine(engine === 'native' ? 'web' : 'native')}
        />
      ) : null}
    </View>
    <View style={styles.row}>
      {STRESS_FIXTURE_SIZES.map((size) => (
        <BufferFixtureLink
          key={size}
          testID={
            size === 30_000
              ? 'buffer-load-stress'
              : `buffer-load-${size / 1000}k`
          }
          label={`Load ${size / 1000}k`}
          onPress={() => onLoadStress(size)}
        />
      ))}
    </View>
    <View style={styles.row}>
      <BufferFixtureLink
        testID="buffer-load-paragraphs"
        label="Load 30k paragraphs"
        onPress={onLoadParagraphs}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  controls: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: control.height / 2 },
});
