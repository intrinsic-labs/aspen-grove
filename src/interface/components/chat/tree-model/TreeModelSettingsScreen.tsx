import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import {
  FormLinkRow,
  FormSection,
  formText,
} from '@/interface/ui/components/form';
import { SettingsScreenScaffold } from '../../settings/SettingsScreenScaffold';
import { ParameterSections } from './ParameterSections';
import { ProviderOptionsSection } from './ProviderOptionsSection';
import { treeModelRoutes } from './tree-model-routes';
import { useTreeModelSettings } from './useTreeModelSettings';

/**
 * Latent Spaces' tree Model Settings (TreeModelSettingsView.swift), pushed
 * from the tree menu's Model: provider and model, parameters, and the
 * System Message editor. Edits reach only this tree (its agent is forked
 * first when shared; `UpdateTreeModelSettingsUseCase`).
 */
const TreeModelSettingsScreen = () => {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  const router = useRouter();
  const settings = useTreeModelSettings(treeId as ULID | undefined);

  return (
    <SettingsScreenScaffold
      testID="tree-model-screen"
      loading={!settings.loaded}
    >
      <ProviderOptionsSection
        settings={settings}
        onOpenModelList={() =>
          treeId && router.push(treeModelRoutes.openRouterModels(treeId))
        }
      />
      <ParameterSections settings={settings} />
      <FormSection>
        <FormLinkRow
          testID="tree-model-system-message"
          title="System Message"
          icon="document-text-outline"
          onPress={() =>
            treeId && router.push(treeModelRoutes.systemMessage(treeId))
          }
        />
      </FormSection>
      {settings.error ? (
        <Text testID="tree-model-error" style={[formText.footer, styles.error]}>
          {settings.error}
        </Text>
      ) : null}
    </SettingsScreenScaffold>
  );
};

export default TreeModelSettingsScreen;

const styles = StyleSheet.create({
  error: {
    color: '#FF453A',
    marginTop: 12,
    paddingHorizontal: 16,
  },
});
