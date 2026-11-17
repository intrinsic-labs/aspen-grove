import { useSyncExternalStore } from 'react';

type DraftListener = () => void;

/**
 * What is typed in Home's composer, kept outside the composer so it can move:
 * a message typed before any model is set up goes into the first tree that
 * onboarding opens (`useFinishOnboarding`), rather than staying behind on Home,
 * and comes back if that tree is left unsent (`return-draft-to-home`). In
 * memory only, like the trees' drafts.
 */
let draft = '';
const listeners = new Set<DraftListener>();

export const getHomeDraft = (): string => draft;

export const setHomeDraft = (value: string): void => {
  if (draft === value) {
    return;
  }
  draft = value;
  listeners.forEach((listener) => listener());
};

export const subscribeHomeDraft = (listener: DraftListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useHomeDraft = (): string =>
  useSyncExternalStore(subscribeHomeDraft, getHomeDraft, getHomeDraft);
