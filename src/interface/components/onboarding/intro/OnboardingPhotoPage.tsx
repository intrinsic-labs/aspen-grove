import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { onboardingText } from './onboarding-text';

const page = loomUiTokens.onboarding.page;

type OnboardingPhotoPageProps = {
  readonly image: ImageSourcePropType;
  /** The photo's layout height; the circle sits centered in it. */
  readonly imageFrameHeight: number;
  readonly text: string;
};

/**
 * Pages 1-3 (LoomOnboarding.swift:28-61): a photo in a 180 pt circle over
 * Cardo text, at most 300 pt wide, centered in the page.
 */
export const OnboardingPhotoPage = ({
  image,
  imageFrameHeight,
  text,
}: OnboardingPhotoPageProps) => (
  <View style={styles.page}>
    <View style={[styles.imageFrame, { height: imageFrameHeight }]}>
      <Image source={image} style={styles.image} resizeMode="cover" />
    </View>
    <Text style={[onboardingText.body, styles.text]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: page.imageTextGap,
    maxWidth: page.maxTextWidth + 2 * page.paddingHorizontal,
    paddingHorizontal: page.paddingHorizontal,
  },
  imageFrame: {
    justifyContent: 'center',
  },
  image: {
    width: page.imageSize,
    height: page.imageSize,
    borderRadius: page.imageSize / 2,
  },
  text: {
    alignSelf: 'stretch',
  },
});
