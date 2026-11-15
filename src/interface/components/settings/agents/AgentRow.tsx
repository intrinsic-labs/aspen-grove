import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Agent } from '@domain/entities';
import { FormRow, formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

type AgentRowProps = {
  readonly agent: Agent;
  readonly isDefault: boolean;
  readonly busy: boolean;
  readonly onEdit: () => void;
  readonly onMakeDefault: () => void;
  readonly onDelete: () => void;
};

const captionOf = (agent: Agent): string =>
  [
    agent.modelRef ?? '(no modelRef)',
    typeof agent.configuration.temperature === 'number'
      ? `temp ${agent.configuration.temperature}`
      : null,
    typeof agent.configuration.maxTokens === 'number'
      ? `max ${agent.configuration.maxTokens}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

/** One library agent as a Form row: name, model caption, then its actions. */
export const AgentRow = ({
  agent,
  isDefault,
  busy,
  onEdit,
  onMakeDefault,
  onDelete,
}: AgentRowProps) => (
  <FormRow
    testID={`settings-agents-row-${agent.id}`}
    onPress={onEdit}
    disabled={busy}
    accessibilityLabel={`Edit ${agent.name}`}
    style={styles.row}
  >
    <View style={styles.content}>
      <View style={styles.titleLine}>
        <Text numberOfLines={1} style={[formText.body, styles.name]}>
          {agent.name}
        </Text>
        {isDefault ? (
          <View style={styles.badge}>
            <Ionicons
              name="star"
              size={12}
              color={loomUiTokens.colors.accentColor}
            />
            <Text style={[formText.footer, styles.badgeText]}>Default</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={formText.footer}>
        {captionOf(agent)}
      </Text>
      <View style={styles.actions}>
        {!isDefault ? (
          <Pressable
            testID={`settings-agents-row-make-default-${agent.id}`}
            onPress={onMakeDefault}
            disabled={busy}
            hitSlop={6}
          >
            <Text style={[formText.footer, styles.accent]}>Make Default</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID={`settings-agents-row-delete-${agent.id}`}
          onPress={onDelete}
          disabled={busy}
          hitSlop={6}
        >
          <Text style={[formText.footer, styles.destructive]}>Delete</Text>
        </Pressable>
      </View>
    </View>
    <Ionicons
      name="chevron-forward"
      size={loomUiTokens.settingsForm.linkChevronSize}
      color={loomUiTokens.settingsForm.colors.tertiaryLabel}
    />
  </FormRow>
);

const styles = StyleSheet.create({
  row: {
    paddingVertical: 11,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: {
    color: loomUiTokens.colors.accentColor,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 5,
  },
  accent: {
    fontSize: 15,
    color: loomUiTokens.colors.accentColor,
  },
  destructive: {
    fontSize: 15,
    color: '#FF453A',
  },
});
