import { describe, expect, it } from '@jest/globals';
import { shouldDeleteTreeOnLeave } from './ephemeral-tree';

const emptyQuickTree = {
  quickCreated: true,
  hasUserSentMessage: false,
  hasMessages: false,
  hasTree: true,
};

describe('shouldDeleteTreeOnLeave', () => {
  it('deletes a quick-created tree left empty', () => {
    expect(shouldDeleteTreeOnLeave(emptyQuickTree)).toBe(true);
  });

  it('keeps a tree that has messages even when the sent flag was reset', () => {
    expect(
      shouldDeleteTreeOnLeave({ ...emptyQuickTree, hasMessages: true })
    ).toBe(false);
  });

  it('keeps a tree once the user has sent, before its rows reload', () => {
    expect(
      shouldDeleteTreeOnLeave({ ...emptyQuickTree, hasUserSentMessage: true })
    ).toBe(false);
  });

  it('keeps trees opened any other way, and does nothing without a tree', () => {
    expect(
      shouldDeleteTreeOnLeave({ ...emptyQuickTree, quickCreated: false })
    ).toBe(false);
    expect(shouldDeleteTreeOnLeave({ ...emptyQuickTree, hasTree: false })).toBe(
      false
    );
  });
});
