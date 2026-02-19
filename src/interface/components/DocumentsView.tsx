import { View, StyleSheet } from 'react-native';
import { AppScreen, AppText, Hairline } from '../ui/system';

const DocumentsView = () => {
  return (
    <AppScreen style={styles.container}>
      <View style={styles.content}>
        <AppText variant="title" tone="primary">
          Documents
        </AppText>
        <Hairline style={styles.divider} />
        <AppText variant="meta" tone="secondary">
          This surface is intentionally minimal while we finish dialogue plumbing.
        </AppText>
      </View>
    </AppScreen>
  );
};

export default DocumentsView;

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
