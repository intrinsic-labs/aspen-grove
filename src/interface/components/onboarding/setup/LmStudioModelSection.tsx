import { StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  FormButtonRow,
  FormSection,
  formText,
} from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { FormCheckRow } from '../../settings/agents/editor/FormCheckRow';
import { useModelPickerData } from '../../settings/agents/useModelPickerData';

type LmStudioModelSectionProps = {
  readonly modelId: string;
  readonly onSelect: (modelId: string) => void;
};

/**
 * The models the LM Studio server reports, as an inline Form picker. Shown
 * once a connection test succeeds, it loads the list as it mounts.
 */
export const LmStudioModelSection = ({
  modelId,
  onSelect,
}: LmStudioModelSectionProps) => {
  const picker = useModelPickerData('lmstudio');
  const { refresh } = picker;

  const footer = picker.error ? (
    <Text
      testID="onboarding-lmstudio-model-error"
      style={[formText.footer, styles.error]}
    >
      {picker.error}
    </Text>
  ) : picker.loading ? (
    'Looking for models…'
  ) : picker.options.length === 0 ? (
    'No models found. Load a model in LM Studio, then refresh.'
  ) : undefined;

  return (
    <FormSection
      testID="onboarding-lmstudio-models"
      header="Model"
      footer={footer}
    >
      {picker.options.map((option) => (
        <FormCheckRow
          key={option.id}
          testID={`onboarding-lmstudio-model-${option.id}`}
          title={option.label}
          detail={option.detail ? `${option.id} · ${option.detail}` : option.id}
          badge={
            option.loaded ? (
              <Ionicons
                name="flash"
                size={13}
                color={loomUiTokens.colors.accentColor}
              />
            ) : null
          }
          selected={option.id === modelId}
          onPress={() => onSelect(option.id)}
        />
      ))}
      <FormButtonRow
        testID="onboarding-lmstudio-model-refresh"
        title="Refresh Models"
        disabled={picker.loading}
        onPress={() => void refresh()}
      />
    </FormSection>
  );
};

const styles = StyleSheet.create({
  error: {
    color: '#FF453A',
  },
});
