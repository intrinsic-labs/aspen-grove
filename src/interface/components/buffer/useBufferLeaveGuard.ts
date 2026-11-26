import { useEffect, useRef, useState } from 'react';
import {
  type NavigationAction,
  useNavigation,
  usePreventRemove,
} from 'expo-router/react-navigation';
import { afterSave, decideLeave } from './buffer-leave-decision';

type Options = {
  /** Typing on screen that is not yet a saved version. */
  readonly dirty: boolean;
  /** Saves it as versions; false if anything is left unsaved. */
  readonly commit: () => Promise<boolean>;
};

/**
 * Saves a dirty buffer before the screen goes away: Android's back key, iOS
 * swipe-back and the header's back button all arrive as `beforeRemove`, and
 * `usePreventRemove` is how the native stack learns not to dismiss the screen
 * itself. The navigation is held, the typing committed, and the original
 * action dispatched once the screen no longer prevents it. A failed save
 * leaves you here, with the notice and the text. A clean document is never
 * intercepted, so native swipe-back stays.
 */
export const useBufferLeaveGuard = ({ dirty, commit }: Options) => {
  const navigation = useNavigation();
  const [released, setReleased] = useState<NavigationAction | null>(null);
  const saving = useRef(false);

  usePreventRemove(dirty && released === null, ({ data }) => {
    if (decideLeave({ dirty, saving: saving.current }) !== 'save') return;
    saving.current = true;
    commit()
      .then((saved) => {
        if (afterSave(saved) === 'leave') setReleased(data.action);
      })
      .catch(() => undefined)
      .finally(() => {
        saving.current = false;
      });
  });

  // Runs after the render that stopped preventing, so it is let through.
  useEffect(() => {
    if (released) navigation.dispatch(released);
  }, [navigation, released]);
};
