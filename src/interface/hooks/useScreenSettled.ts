import {
  type NavigationProp,
  type NavigationState,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useEffect, useState } from 'react';

/** The stack's transition events (native stack emits these). */
type TransitionEventMap = {
  transitionEnd: { data: { closing: boolean } };
};

type StackNavigation = NavigationProp<
  ParamListBase,
  string,
  undefined,
  NavigationState,
  object,
  TransitionEventMap
>;

/** A screen shown without a stack transition never gets transitionEnd. */
const SETTLE_FALLBACK_MS = 800;

/**
 * False while the screen is still sliding in, true once its push
 * transition has ended (or after a short fallback). Work that can wait,
 * such as mounting rows above the fold, waits for it so it doesn't compete
 * with the transition and the first paint.
 */
export const useScreenSettled = (): boolean => {
  const navigation = useNavigation<StackNavigation>();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (settled) {
      return;
    }
    const settle = () => setSettled(true);
    const fallback = setTimeout(settle, SETTLE_FALLBACK_MS);
    const unsubscribe = navigation.addListener('transitionEnd', (event) => {
      if (!event.data.closing) {
        settle();
      }
    });
    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [navigation, settled]);

  return settled;
};
