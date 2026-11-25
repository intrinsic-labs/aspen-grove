import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/interface/ui/value-objects';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';

const { control } = bufferTokens;

type BufferFixtureLinkProps = {
  readonly testID: string;
  readonly label: string;
  readonly onPress: () => void;
};

/** A developer-preview action on an empty buffer: load a review fixture. */
export const BufferFixtureLink = ({
  testID,
  label,
  onPress,
}: BufferFixtureLinkProps) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    hitSlop={control.hitSlop}
    style={styles.link}
  >
    <AppText variant="mono" tone="secondary" style={styles.text}>
      {label}
    </AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  link: {
    minHeight: control.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: control.labelSize },
});
