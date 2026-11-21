import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { LmStudioTestFailureFooter } from './LmStudioTestFailureFooter';
import { showsLmStudioHint } from './lmstudio-hint';
import type {
  ConnectionsController,
  LmStudioConnectionStatus,
} from './useConnectionsController';
import { AppTextInput } from '@/interface/ui/components/AppTextInput';

const form = loomUiTokens.settingsForm;

const STATUS_TEXT: Record<LmStudioConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Not reachable',
  checking: 'Checking…',
  idle: 'Untested',
};

const STATUS_COLOR: Record<LmStudioConnectionStatus, string> = {
  connected: form.colors.statusConnected,
  disconnected: form.colors.statusDisconnected,
  checking: form.colors.tertiaryLabel,
  idle: form.colors.tertiaryLabel,
};

type LmStudioFormSectionProps = {
  readonly controller: ConnectionsController;
  /** The token and auto-load rows. Onboarding leaves them to Settings. */
  readonly showAdvanced?: boolean;
  readonly footer?: string;
};

/**
 * The LM Studio server in Form rows. Latent Spaces has no local provider;
 * this keeps Aspen Grove's fields and test in the API Keys page's style.
 */
export const LmStudioFormSection = ({
  controller,
  showAdvanced = true,
  footer = 'Connect to your LM Studio server for local inference. Models are picked when you create an agent.',
}: LmStudioFormSectionProps) => {
  const status = controller.lmstudioConnectionStatus;
  const failure =
    status === 'disconnected' ? controller.lmstudioConnectionError : null;
  const showHint = showsLmStudioHint(status);

  return (
    <FormSection
      testID="connections-lmstudio"
      header="LM Studio"
      footer={
        failure || showHint ? (
          <>
            {failure ? (
              <LmStudioTestFailureFooter
                key={`${failure}${controller.lmstudioConnectionErrorDetail ?? ''}`}
                message={failure}
                detail={controller.lmstudioConnectionErrorDetail}
                expandedByDefault={controller.verboseErrorAlerts}
              />
            ) : null}
            {showHint ? (
              <Text testID="connections-lmstudio-hint" style={formText.footer}>
                {footer}
              </Text>
            ) : null}
          </>
        ) : undefined
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
      {showAdvanced ? (
        <FormRow>
          <FormLabel title="API Token" hug />
          <AppTextInput
            testID="connections-lmstudio-token-input"
            value={controller.lmstudioApiTokenInput}
            onChangeText={controller.setLmstudioApiTokenInput}
            placeholder="Optional"
            placeholderTextColor={form.colors.tertiaryLabel}
            secureTextEntry={!controller.showLmstudioToken}
            autoCapitalize="none"
            autoCorrect={false}
            style={[formText.value, styles.tokenField]}
          />
          <Pressable
            testID="connections-lmstudio-token-reveal"
            onPress={() =>
              controller.setShowLmstudioToken((visible) => !visible)
            }
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
      ) : null}
      {showAdvanced ? (
        <FormToggleRow
          testID="connections-lmstudio-auto-load"
          title="Auto-load Models"
          value={controller.lmstudioAutoLoadModels}
          onValueChange={controller.setLmstudioAutoLoadModels}
        />
      ) : null}
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
});
