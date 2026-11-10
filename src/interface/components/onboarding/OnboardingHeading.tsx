import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';

type OnboardingHeadingProps = {
  readonly title: string;
  readonly lead: string;
  readonly showLeaf?: boolean;
};

/** A step's Cardo title and its one quiet mono line. */
export const OnboardingHeading = ({
  title,
  lead,
  showLeaf = false,
}: OnboardingHeadingProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <View style={styles.container}>
      {showLeaf ? (
        <Ionicons name="leaf" size={28} color={colors.accentColor} />
      ) : null}
      <AppText variant="body" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="meta" tone="secondary">
        {lead}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
  },
});
