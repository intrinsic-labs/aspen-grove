import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { LoomVoice } from '@domain/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
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
        <Ionicons
          name={appearance.icon}
          size={chooser.portraitIconSize}
          color="#fff"
        />
      </Pressable>
      <Text style={styles.name}>{voice.name}</Text>
      {/* Calling Code in Latent Spaces; Aspen Grove ships IBM Plex Mono. */}
      <Text style={styles.description}>{voice.description}</Text>
    </View>
  );
};

const chooser = loomUiTokens.voiceChooser;

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  portrait: {
    width: chooser.portraitSize,
    height: chooser.portraitSize,
    borderRadius: chooser.portraitSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: chooser.portraitBottomGap,
  },
  name: {
    fontFamily: 'Cardo-Regular',
    fontSize: chooser.nameSize,
    color: '#FFFFFF',
    marginBottom: chooser.nameBottomGap,
  },
  description: {
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: chooser.descriptionSize,
    color: loomUiTokens.settingsForm.colors.secondaryLabel,
    textAlign: 'center',
    paddingHorizontal: chooser.descriptionInset,
  },
});
