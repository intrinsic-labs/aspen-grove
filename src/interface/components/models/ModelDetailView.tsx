import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OpenRouterCatalogModel } from '@application/services/llm';
import { formText, useFormColors } from '@/interface/ui/components/form';
import { AppScreen } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { OnboardingButton } from '../onboarding/OnboardingButton';
import { splitModelName } from './model-info-format';
import { ModelDetailHero } from './ModelDetailHero';
import { ModelDetailSections } from './ModelDetailSections';
import { ScrollBottomFade } from './ScrollBottomFade';

const form = loomUiTokens.settingsForm;
const browser = loomUiTokens.modelBrowser;
const button = loomUiTokens.onboarding.button;

export type ModelDetailViewProps = {
  readonly model: OpenRouterCatalogModel | undefined;
  readonly loading: boolean;
  readonly error: string | null;
  /** The model already chosen: the button says so instead. */
  readonly isCurrent: boolean;
  /** Choose this model; resolves once it's saved, false when it wasn't. */
  readonly onUse: () => Promise<boolean>;
};

/**
 * A model's page in the OpenRouter browser: name, maker and id, then what
 * OpenRouter's site shows about it, with "Use This Model" pinned under the
 * Form, which chooses it and goes back.
 */
export const ModelDetailView = ({
  model,
  loading,
  error,
  isCurrent,
  onUse,
}: ModelDetailViewProps) => {
  const colors = useFormColors();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  if (!model) {
    return (
      <AppScreen
        testID="model-detail-screen"
        style={[styles.center, { backgroundColor: colors.page }]}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={formText.footer}>
            {error ?? 'OpenRouter no longer lists this model.'}
          </Text>
        )}
      </AppScreen>
    );
  }

  const name = splitModelName(model);
  const use = () => {
    setBusy(true);
    void onUse().then((saved) => !saved && setBusy(false));
  };

  return (
    <AppScreen
      testID="model-detail-screen"
      style={{ backgroundColor: colors.page }}
    >
      <View style={styles.scrollArea}>
        <ScrollView
          testID="model-detail-scroll"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          <ModelDetailHero
            title={name.title}
            author={name.author}
            id={model.id}
          />
          <ModelDetailSections model={model} />
        </ScrollView>
        <ScrollBottomFade
          color={colors.page}
          height={browser.useButtonFadeHeight}
        />
      </View>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.page,
            // The capsule's own margin already stands off the Form.
            paddingBottom:
              Math.max(insets.bottom - button.margin, 0) +
              browser.useButtonBottomGap,
          },
        ]}
      >
        <OnboardingButton
          testID="model-detail-use"
          label={isCurrent ? 'Current Model' : 'Use This Model'}
          prominent={!isCurrent}
          busy={busy}
          onPress={use}
        />
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: form.sectionInset,
    paddingBottom: form.sectionGap,
  },
  footer: {
    paddingHorizontal: form.sectionInset - button.margin,
  },
});
