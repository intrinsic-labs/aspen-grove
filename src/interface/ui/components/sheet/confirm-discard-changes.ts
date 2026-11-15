import { Alert } from 'react-native';

/**
 * Asks before a sheet's unsaved edits are dropped, as iOS does when a sheet
 * holding edits is pulled down: Keep Editing (the default) or Discard
 * Changes, which runs `discard`.
 */
export const confirmDiscardChanges = (discard: () => void): void =>
  Alert.alert('Discard changes?', 'Your edits in this sheet are not saved.', [
    { text: 'Keep Editing', style: 'cancel' },
    { text: 'Discard Changes', style: 'destructive', onPress: discard },
  ]);
