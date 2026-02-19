import { View, StyleSheet } from 'react-native';
import { AppScreen, AppText, Hairline } from '../ui/system';

const SettingsView = () => {
  return (
    <AppScreen style={styles.container}>
      <View style={styles.content}>
        <AppText variant="title" tone="primary">
          Settings
        </AppText>
        <Hairline style={styles.divider} />
        <AppText variant="meta" tone="secondary">
          Provider and model controls will land here next.
        </AppText>
      </View>
    </AppScreen>
  );
};

export default SettingsView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    marginTop: 32,
    marginHorizontal: 18,
    gap: 10,
  },
  divider: {
    marginVertical: 4,
  },
});
