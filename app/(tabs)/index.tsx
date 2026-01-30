import { StyleSheet, Text, View } from 'react-native';

export default function GroveScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Grove</Text>
      <Text style={styles.subtitle}>Loom Trees will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
