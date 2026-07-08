import { useSyncExternalStore } from 'react';

type DraftListener = () => void;

const drafts = new Map<string, string>();
const listeners = new Map<string, Set<DraftListener>>();

const emitDraftChange = (treeId: string) => {
  listeners.get(treeId)?.forEach((listener) => listener());
};

export const getDialogueDraft = (treeId?: string): string => {
  if (!treeId) {
    return '';
  }
  return drafts.get(treeId) ?? '';
};

export const setDialogueDraft = (treeId: string | undefined, value: string) => {
  if (!treeId) {
    return;
  }
  if (drafts.get(treeId) === value) {
    return;
  }
  drafts.set(treeId, value);
  emitDraftChange(treeId);
};

export const subscribeDialogueDraft = (
  treeId: string | undefined,
  listener: DraftListener
): (() => void) => {
  if (!treeId) {
    return () => undefined;
  }

  const treeListeners = listeners.get(treeId) ?? new Set<DraftListener>();
  treeListeners.add(listener);
  listeners.set(treeId, treeListeners);

  return () => {
    treeListeners.delete(listener);
    if (treeListeners.size === 0) {
      listeners.delete(treeId);
    }
  };
};

export const useDialogueDraft = (treeId?: string): string =>
  useSyncExternalStore(
    (listener) => subscribeDialogueDraft(treeId, listener),
    () => getDialogueDraft(treeId),
    () => getDialogueDraft(treeId)
  );
