import { Pressable, StyleSheet } from 'react-native';
import type { Agent } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';

type AgentCandidateListProps = {
  readonly candidates: readonly Agent[];
  readonly busy: boolean;
  readonly emptyText: string;
  readonly onPick: (agentId: ULID) => void;
};

/**
 * The shared model agents a tree can switch to, one row each
 * (`dialogue-settings-switch-agent-row-<agentId>`).
 */
export const AgentCandidateList = ({
  candidates,
  busy,
  emptyText,
  onPick,
}: AgentCandidateListProps) => {
  const { colors } = useAspenGroveTheme();

  if (candidates.length === 0) {
    return (
      <AppText variant="meta" style={{ color: colors.secondary }}>
        {emptyText}
      </AppText>
    );
  }

  return (
    <>
      {candidates.map((candidate) => (
        <Pressable
          key={candidate.id}
          testID={`dialogue-settings-switch-agent-row-${candidate.id}`}
          onPress={() => onPick(candidate.id)}
          disabled={busy}
          style={({ pressed }) => [
            styles.candidateRow,
            { borderBottomColor: colors.line },
            { opacity: busy ? 0.5 : pressed ? 0.65 : 1 },
          ]}
        >
          <AppText variant="body" style={styles.agentName}>
            {candidate.name}
          </AppText>
          <AppText
            variant="meta"
            style={{ color: colors.secondary, marginTop: 2 }}
          >
            {candidate.modelRef}
          </AppText>
        </Pressable>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  candidateRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  agentName: {
    fontWeight: '500',
  },
});
