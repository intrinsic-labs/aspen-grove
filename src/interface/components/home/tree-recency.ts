import type { LoomTree } from '@domain/entities';

/**
 * When a tree was last used: its last message, or for a tree that has none
 * yet (or predates the field) its last metadata change.
 */
export const treeLastUsed = (tree: LoomTree): Date =>
  tree.lastMessageAt ?? tree.updatedAt;

/** Most recently used first. */
export const byRecency = (a: LoomTree, b: LoomTree): number =>
  treeLastUsed(b).getTime() - treeLastUsed(a).getTime();

/**
 * "3/4/2025, 2:01 PM": SwiftUI's `Date.formatted()` (numeric date, short
 * time) in the device locale (HomeScreenView.swift:73).
 */
export const treeRowDateText = (date: Date, locale?: string): string =>
  date.toLocaleString(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
