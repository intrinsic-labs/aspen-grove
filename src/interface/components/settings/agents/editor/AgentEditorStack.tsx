import { Stack } from 'expo-router';
import { FormSurfaceProvider } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { AgentEditorProvider } from './agent-editor-context';
import { useAgentEditorState } from './useAgentEditorState';

const sheet = loomUiTokens.settingsForm.colors.sheetBackground;

/**
 * The agent editor's sheet: a stack of its own, so the model browser and a
 * model's page push inside the sheet, all sharing one draft. The Form keeps
 * its glass Cancel and Save bar; the pushed pages get the system bar.
 */
export const AgentEditorStack = () => {
  const editor = useAgentEditorState();
  return (
    <FormSurfaceProvider value="sheet">
      <AgentEditorProvider value={editor}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: sheet },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { color: '#FFFFFF' },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: sheet },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="models" options={{ title: 'Model' }} />
          <Stack.Screen name="detail" options={{ title: '' }} />
        </Stack>
      </AgentEditorProvider>
    </FormSurfaceProvider>
  );
};
