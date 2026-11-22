import * as Application from 'expo-application';
import { Linking } from 'react-native';
import {
  FormLabel,
  FormLinkRow,
  FormRow,
  FormSection,
} from '@/interface/ui/components/form';
import { APP_INFO_LINKS } from './app-info-links';
import { appVersionLabel } from './app-version-label';

const VERSION_LABEL = appVersionLabel(
  Application.nativeApplicationVersion,
  Application.nativeBuildVersion
);

/**
 * Latent Spaces' "App Info" section (LoomSettingsView.swift:329-351): the
 * version and build, then links out to the author, the Open Loom spec, the
 * repository and the project that inspired Loom.
 */
export const AppInfoSection = () => (
  <FormSection testID="settings-app-info" header="App Info">
    {/* cube.box */}
    <FormRow testID="settings-app-info-version" separatorInset="icon">
      <FormLabel
        title={VERSION_LABEL}
        icon="cube-outline"
        systemIcon="cube.box"
      />
    </FormRow>
    {APP_INFO_LINKS.map((link) => (
      <FormLinkRow
        key={link.slug}
        testID={`settings-app-info-${link.slug}`}
        title={link.title}
        icon={link.icon}
        systemIcon={link.systemIcon}
        onPress={() => void Linking.openURL(link.url)}
      />
    ))}
  </FormSection>
);
