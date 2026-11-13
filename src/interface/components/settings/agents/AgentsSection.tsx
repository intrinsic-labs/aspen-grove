import { Text } from 'react-native';
import {
  FormButtonRow,
  FormRow,
  FormSection,
  formText,
} from '@/interface/ui/components/form';
import { AgentRow } from './AgentRow';
import { useAgentsLibraryController } from './useAgentsLibraryController';

/**
 * Settings → Agents library, in Form rows. Shared agents are the reusable
 * "profiles" trees reference; each tree can also fork a private copy from
 * the chat ⚙️ sheet. Editing a shared agent here affects every tree that
 * uses it.
 */
export const AgentsSection = () => {
  const controller = useAgentsLibraryController();

  return (
    <>
      <FormSection
        testID="settings-agents-list"
        header="Agents"
        footer={
          <>
            {controller.error ? (
              <Text
                testID="settings-agents-error"
                style={[formText.footer, { color: '#FF453A' }]}
              >
                {controller.error}
              </Text>
            ) : null}
            <Text style={formText.footer}>
              Agents pair a model with a system prompt and generation settings.
              New trees use the default agent; each tree can switch or customize
              its own from the chat's settings.
            </Text>
          </>
        }
      >
        {controller.loading ? (
          <FormRow>
            <Text style={formText.value}>Loading…</Text>
          </FormRow>
        ) : null}
        {!controller.loading && controller.agents.length === 0 ? (
          <FormRow>
            <Text style={formText.value}>
              No agents yet. Create one to start weaving.
            </Text>
          </FormRow>
        ) : null}
        {controller.loading
          ? null
          : controller.agents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                isDefault={controller.defaultAgentId === agent.id}
                busy={controller.busyAgentId === agent.id}
                onEdit={() => controller.openEdit(agent)}
                onMakeDefault={() => controller.makeDefault(agent.id)}
                onDelete={() => controller.deleteAgent(agent)}
              />
            ))}
      </FormSection>

      {controller.loading ? null : (
        <FormSection>
          <FormButtonRow
            testID="settings-agents-new"
            title="New Agent"
            icon="add-circle-outline"
            onPress={controller.openCreate}
          />
        </FormSection>
      )}
    </>
  );
};
