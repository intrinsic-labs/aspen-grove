import { StyleSheet, View } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

type ComposerBottomBandProps = {
  /** From the field's bottom edge to the composer's bottom. */
  readonly height: number;
};

/** How far the band runs on past the composer's bottom edge. */
const OVERHANG = 200;
/** Up behind the field's rounded bottom corners, which would show text. */
const UNDERLAP = loomUiTokens.composer.fieldRadius;

/**
 * The opaque strip under the composer's field. Messages scroll on under the
 * composer, and its field's material blurs them, but nothing may show
 * below the field: Latent Spaces fades its screen to the background there
 * (MessageInputView.swift:24-34), and with the keyboard up the strip
 * between the field and the keyboard has no fade at all. Drawn inside the
 * keyboard-sticky composer, behind the field, it moves with the keyboard and
 * runs on past the screen's bottom edge. It starts a corner radius up
 * behind the field, so nothing shows past the field's rounded corners.
 */
export const ComposerBottomBand = ({ height }: ComposerBottomBandProps) => {
  const { colors } = useAspenGroveTheme();
  return (
    <View
      testID="chat-composer-bottom-band"
      pointerEvents="none"
      style={[
        styles.band,
        {
          height: height + UNDERLAP + OVERHANG,
          backgroundColor: colors.oppositePrimary,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -OVERHANG,
  },
});
