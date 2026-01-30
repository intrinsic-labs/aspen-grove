/**
 * Error Screen Component
 *
 * Shown if app initialization fails.
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native';

export interface ErrorScreenProps {
  error: Error;
}

export function ErrorScreen({ error }: ErrorScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Initialization Error</Text>
        <Text style={styles.message}>
          Failed to initialize Aspen Grove. Please try restarting the app.
        </Text>
        <ScrollView style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
          {error.stack && <Text style={styles.stackTrace}>{error.stack}</Text>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#c41e3a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    borderLeftWidth: 4,
    borderLeftColor: '#c41e3a',
  },
  errorText: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'Courier New',
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Courier New',
  },
});
