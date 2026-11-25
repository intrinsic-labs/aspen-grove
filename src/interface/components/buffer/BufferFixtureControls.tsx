import { StyleSheet, View } from 'react-native';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import { BufferFixtureLink } from './BufferFixtureLink';
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
  readonly onLoadSample: () => void;
  readonly onLoadStress: (length: number) => void;
  readonly onVariant: (variant: BufferRenderVariant) => void;
};

/**
 * The developer-preview fixture links on an empty buffer: the review sample,
 * the long document at each measured size, and a toggle for how the text is
 * handed to the native input. `buffer-load-stress` stays the 30,000 link.
 */
export const BufferFixtureControls = ({
  variant,
  onLoadSample,
  onLoadStress,
  onVariant,
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
  </View>
);

const styles = StyleSheet.create({
  controls: { alignItems: 'center' },
  row: { flexDirection: 'row', gap: control.height / 2 },
});
