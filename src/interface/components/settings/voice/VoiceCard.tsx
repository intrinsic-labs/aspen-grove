import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { LoomVoice } from '@domain/value-objects';
import { AppText } from '@/interface/ui/value-objects';
import { VOICE_APPEARANCE } from '../../voice';

type VoiceCardProps = {
  readonly voice: LoomVoice;
  readonly width: number;
  /** Tap on the circle: stop if speaking, otherwise play this voice. */
  readonly onPressPortrait: (voice: LoomVoice) => void;
};

/** One page of the voice chooser (Latent Spaces' `VoiceCard`). */
export const VoiceCard = ({
  voice,
  width,
  onPressPortrait,
}: VoiceCardProps) => {
  const appearance = VOICE_APPEARANCE[voice.name];

  return (
    <View style={[styles.page, { width }]}>
      <Pressable
        testID={`settings-voice-${voice.name.toLowerCase()}`}
        accessibilityRole="button"
        accessibilityLabel={`Play ${voice.name}`}
        onPress={() => onPressPortrait(voice)}
        style={[styles.portrait, { backgroundColor: appearance.color }]}
      >
        <Ionicons name={appearance.icon} size={65} color="#fff" />
      </Pressable>
      <AppText variant="body" tone="primary" style={styles.name}>
        {voice.name}
      </AppText>
      <AppText variant="mono" tone="secondary" style={styles.description}>
        {voice.description}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  portrait: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontFamily: 'Cardo-Regular',
    fontSize: 32,
    lineHeight: 40,
    marginBottom: 16,
  },
  description: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
