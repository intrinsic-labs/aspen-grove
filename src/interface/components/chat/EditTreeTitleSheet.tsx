import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppInput, AppText } from '@/interface/ui/value-objects';

type EditTreeTitleSheetProps = {
  readonly visible: boolean;
  readonly initialTitle: string;
  readonly onCancel: () => void;
  readonly onSubmit: (title: string) => Promise<void>;
};

export const EditTreeTitleSheet = ({
  visible,
  initialTitle,
  onCancel,
  onSubmit,
}: EditTreeTitleSheetProps) => {
  const { colors } = useAspenGroveTheme();
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setError(null);
      setSaving(false);
    }
  }, [initialTitle, visible]);

  const trimmedTitle = title.trim();
  const canSave = trimmedTitle.length > 0 && !saving;

  const onSave = async () => {
    if (!canSave) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmedTitle);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View
        style={[styles.container, { backgroundColor: colors.oppositePrimary }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Pressable onPress={onCancel} hitSlop={8} disabled={saving}>
            <AppText variant="meta" tone="secondary">
              Cancel
            </AppText>
          </Pressable>
          <AppText variant="mono" style={styles.headerTitle}>
            Edit Title
          </AppText>
          <Pressable onPress={onSave} hitSlop={8} disabled={!canSave}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppText
                variant="meta"
                style={{
                  color: canSave ? colors.primary : colors.secondaryVariant,
                }}
              >
                Save
              </AppText>
            )}
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          enabled
          extraKeyboardSpace={0}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.block}>
            <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
              TITLE
            </AppText>
            <AppInput
              autoFocus
              value={title}
              onChangeText={setTitle}
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={() => void onSave()}
              editable={!saving}
              selectTextOnFocus
            />
          </View>

          {error ? (
            <AppText variant="meta" tone="accent">
              {error}
            </AppText>
          ) : null}
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  block: {
    gap: 8,
  },
  blockLabel: {
    fontSize: 12,
  },
});
