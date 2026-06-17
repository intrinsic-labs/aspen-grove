import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Agent } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { AppText, SettingsSection } from '@/interface/ui/value-objects';

type AgentsSectionProps = {
  readonly colors: {
    readonly line: string;
    readonly primary: string;
    readonly secondary: string;
  };
};

/**
 * Placeholder Agents UI.
 *
 * Lists shared (library) model agents the user has configured. Lets them
 * switch the default agent for new trees and delete agents that aren't
 * in use. Intentionally minimal — Phase 5 will replace this with a proper
 * Agents library screen.
 *
 * Self-contained: does its own loading and mutation so the main settings
 * controller doesn't have to grow another concern.
 */
export const AgentsSection = ({ colors }: AgentsSectionProps) => {
  const { repositories, useCases } = useAppServices();
  const [agents, setAgents] = useState<readonly Agent[]>([]);
  const [defaultAgentId, setDefaultAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [sharedAgents, prefs] = await Promise.all([
        repositories.agentRepo.findSharedModels(true),
        repositories.userPreferencesRepo.get(),
      ]);
      setAgents(sharedAgents);
      setDefaultAgentId(prefs.defaultModelAgentId ?? null);
    } catch (error) {
      console.warn('[settings:agents] refresh failed', error);
    } finally {
      setLoading(false);
    }
  }, [repositories.agentRepo, repositories.userPreferencesRepo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Refresh whenever the screen comes back into focus, so newly-configured
  // agents (from a different settings save in this same session) show up.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return undefined;
    }, [refresh])
  );

  const onMakeDefault = useCallback(
    async (agentId: string) => {
      if (busyAgentId) {
        return;
      }
      setBusyAgentId(agentId);
      try {
        await repositories.userPreferencesRepo.update({
          defaultModelAgentId: agentId as Agent['id'],
        });
        setDefaultAgentId(agentId);
      } catch (error) {
        Alert.alert(
          'Could not set default',
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        setBusyAgentId(null);
      }
    },
    [busyAgentId, repositories.userPreferencesRepo]
  );

  const onDelete = useCallback(
    (agent: Agent) => {
      if (busyAgentId) {
        return;
      }
      Alert.alert(
        'Delete agent?',
        `"${agent.name}" will be removed. Any trees that reference it will block the deletion.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setBusyAgentId(agent.id);
              try {
                await useCases.deleteAgentUseCase.execute({
                  agentId: agent.id,
                });
                if (defaultAgentId === agent.id) {
                  setDefaultAgentId(null);
                }
                await refresh();
              } catch (error) {
                Alert.alert(
                  'Could not delete agent',
                  error instanceof Error ? error.message : String(error)
                );
              } finally {
                setBusyAgentId(null);
              }
            },
          },
        ]
      );
    },
    [busyAgentId, defaultAgentId, refresh, useCases.deleteAgentUseCase]
  );

  return (
    <SettingsSection title="Agents (placeholder)">
      <View style={styles.list}>
        {loading ? (
          <AppText variant="meta" style={{ color: colors.secondary }}>
            Loading…
          </AppText>
        ) : agents.length === 0 ? (
          <AppText variant="meta" style={{ color: colors.secondary }}>
            No agents yet. Configure OpenRouter or LM Studio above and save to
            create one.
          </AppText>
        ) : (
          agents.map((agent) => {
            const isDefault = defaultAgentId === agent.id;
            const isBusy = busyAgentId === agent.id;

            return (
              <View
                key={agent.id}
                style={[
                  styles.agentRow,
                  {
                    borderColor: isDefault ? colors.primary : colors.line,
                    backgroundColor: isDefault
                      ? `${colors.primary}10`
                      : 'transparent',
                    opacity: isBusy ? 0.5 : 1,
                  },
                ]}
              >
                <View style={styles.agentHeader}>
                  <AppText variant="body" style={styles.agentName}>
                    {agent.name}
                  </AppText>
                  {isDefault && (
                    <View style={styles.defaultBadge}>
                      <Ionicons
                        name="star"
                        size={12}
                        color={colors.primary}
                      />
                      <AppText
                        variant="meta"
                        style={[styles.defaultLabel, { color: colors.primary }]}
                      >
                        Default
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText
                  variant="meta"
                  style={{ color: colors.secondary, marginTop: 2 }}
                >
                  {agent.modelRef ?? '(no modelRef)'}
                </AppText>
                {(typeof agent.configuration.temperature === 'number' ||
                  typeof agent.configuration.maxTokens === 'number') && (
                  <AppText
                    variant="meta"
                    style={{ color: colors.secondary, marginTop: 2 }}
                  >
                    {typeof agent.configuration.temperature === 'number'
                      ? `temp ${agent.configuration.temperature}`
                      : ''}
                    {typeof agent.configuration.temperature === 'number' &&
                    typeof agent.configuration.maxTokens === 'number'
                      ? '  ·  '
                      : ''}
                    {typeof agent.configuration.maxTokens === 'number'
                      ? `max ${agent.configuration.maxTokens}`
                      : ''}
                  </AppText>
                )}

                <View style={styles.actionRow}>
                  {!isDefault && (
                    <Pressable
                      onPress={() => onMakeDefault(agent.id)}
                      disabled={isBusy}
                      style={({ pressed }) => [
                        styles.actionButton,
                        {
                          borderColor: colors.primary,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <AppText
                        variant="meta"
                        style={{ color: colors.primary }}
                      >
                        Make default
                      </AppText>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => onDelete(agent)}
                    disabled={isBusy}
                    style={({ pressed }) => [
                      styles.actionButton,
                      {
                        borderColor: colors.line,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <AppText
                      variant="meta"
                      style={{ color: colors.secondary }}
                    >
                      Delete
                    </AppText>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  agentRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentName: {
    fontWeight: '500',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defaultLabel: {
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
});
