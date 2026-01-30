/**
 * Grove Screen
 *
 * Displays a list of Loom Trees in the user's default Grove.
 * Allows navigation to individual trees for interaction.
 */

import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@interface/context/app-context';
import type { LoomTree } from '@domain/entities';

/**
 * Single tree item component
 */
function TreeItem({ tree, onPress }: { tree: LoomTree; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.treeItem} onPress={onPress}>
      <View style={styles.treeItemContent}>
        <Text style={styles.treeName}>{tree.title}</Text>
        <Text style={styles.treeTime}>{new Date(tree.updatedAt).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  );
}

export default function GroveScreen() {
  const { repositories, initializationResult, isLoading } = useAppContext();
  const [trees, setTrees] = useState<LoomTree[]>([]);
  const [loadingTrees, setLoadingTrees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrees = async () => {
      try {
        if (!initializationResult?.grove) {
          throw new Error('Grove not initialized');
        }

        const result = await repositories.loomTreeRepository.findByGrove(
          initializationResult.grove.id
        );

        setTrees(result.items);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load trees';
        setError(message);
        console.error('[GroveScreen] Error loading trees:', err);
      } finally {
        setLoadingTrees(false);
      }
    };

    if (!isLoading) {
      loadTrees();
    }
  }, [repositories, initializationResult, isLoading]);

  if (loadingTrees) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A7C59" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (trees.length === 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="leaf-outline" size={64} color="#ddd" />
        <Text style={styles.emptyTitle}>Your Grove is Empty</Text>
        <Text style={styles.emptySubtitle}>Create a new Loom Tree to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Grove</Text>
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={trees}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TreeItem tree={item} onPress={() => {}} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  createButton: {
    backgroundColor: '#4A7C59',
    borderRadius: 20,
    padding: 8,
  },
  listContent: {
    paddingTop: 80,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  treeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  treeItemContent: {
    flex: 1,
  },
  treeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  treeTime: {
    fontSize: 13,
    color: '#999',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#c41e3a',
    textAlign: 'center',
  },
});
