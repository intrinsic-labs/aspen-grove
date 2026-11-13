import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  FormButtonRow,
  FormLabel,
  FormRow,
  FormSection,
  FormTextFieldRow,
  FormToggleRow,
  formText,
} from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import type {
  ConnectionsController,
  LmStudioConnectionStatus,
} from './useConnectionsController';

const form = loomUiTokens.settingsForm;

const STATUS_TEXT: Record<LmStudioConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Not reachable',
  checking: 'Checking…',
  idle: 'Untested',
};

// systemGreen / systemRed, dark
const STATUS_COLOR: Record<LmStudioConnectionStatus, string> = {
  connected: '#30D158',
  disconnected: '#FF453A',
  checking: form.colors.tertiaryLabel,
  idle: form.colors.tertiaryLabel,
};

type LmStudioFormSectionProps = {
  readonly controller: ConnectionsController;
};

/**
 * The LM Studio server in Form rows. Latent Spaces has no local provider;
 * this keeps Aspen Grove's fields and test in the API Keys page's style.
 */
export const LmStudioFormSection = ({
  controller,
}: LmStudioFormSectionProps) => {
  const status = controller.lmstudioConnectionStatus;
  const showError =
    status === 'disconnected' && controller.lmstudioConnectionError;

  return (
    <FormSection
      testID="connections-lmstudio"
      header="LM Studio"
      footer={
        <>
          {showError ? (
            <Text
              testID="connections-lmstudio-error"
              style={[formText.footer, styles.error]}
            >
              {controller.lmstudioConnectionError}
            </Text>
          ) : null}
          <Text style={formText.footer}>
            Connect to your LM Studio server for local inference. Models are
            picked when you create an agent.
          </Text>
        </>
      }
    >
      <FormTextFieldRow
        testID="connections-lmstudio-endpoint-input"
        title="Server"
        value={controller.lmstudioEndpointInput}
        onChangeText={controller.setLmstudioEndpointInput}
        placeholder="http://localhost:1234"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <FormRow>
        <FormLabel title="API Token" />
        <TextInput
          testID="connections-lmstudio-token-input"
          value={controller.lmstudioApiTokenInput}
          onChangeText={controller.setLmstudioApiTokenInput}
          placeholder="Optional"
          placeholderTextColor={form.colors.tertiaryLabel}
          selectionColor={loomUiTokens.colors.accentColor}
          keyboardAppearance="dark"
          secureTextEntry={!controller.showLmstudioToken}
          autoCapitalize="none"
          autoCorrect={false}
          style={[formText.value, styles.tokenField]}
        />
        <Pressable
          testID="connections-lmstudio-token-reveal"
          onPress={() => controller.setShowLmstudioToken((visible) => !visible)}
          accessibilityLabel={
            controller.showLmstudioToken ? 'Hide token' : 'Show token'
          }
          hitSlop={8}
        >
          <Ionicons
            name={controller.showLmstudioToken ? 'eye-off' : 'eye'}
            size={18}
            color={form.colors.secondaryLabel}
          />
        </Pressable>
      </FormRow>
      <FormToggleRow
        testID="connections-lmstudio-auto-load"
        title="Auto-load Models"
        value={controller.lmstudioAutoLoadModels}
        onValueChange={controller.setLmstudioAutoLoadModels}
      />
      <FormRow>
        <FormLabel title="Status" />
        <View style={styles.status}>
          <View
            testID="connections-lmstudio-status-dot"
            style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]}
          />
          <Text testID="connections-lmstudio-status" style={formText.value}>
            {STATUS_TEXT[status]}
          </Text>
        </View>
      </FormRow>
      <FormButtonRow
        testID="connections-lmstudio-test"
        title={status === 'disconnected' ? 'Test Again' : 'Test Connection'}
        disabled={status === 'checking'}
        onPress={() => void controller.testLmstudioConnection()}
      />
    </FormSection>
  );
};

const styles = StyleSheet.create({
  tokenField: {
    flex: 1,
    textAlign: 'right',
    paddingVertical: 15,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  error: {
    color: '#FF453A',
  },
});
