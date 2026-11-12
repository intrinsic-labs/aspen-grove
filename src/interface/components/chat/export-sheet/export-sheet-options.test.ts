import { describe, expect, it } from '@jest/globals';
import { initialExportDraft, toExportOptions } from './export-sheet-options';

describe('export sheet options', () => {
  it('starts from the saved title and description, everything included', () => {
    expect(initialExportDraft({ title: 'Tree' })).toEqual({
      title: 'Tree',
      description: '',
      includeSystemMessage: true,
      includeBookmarks: true,
    });
  });

  it('leaves an empty description out and maps the toggles', () => {
    expect(
      toExportOptions({
        title: 'Renamed',
        description: '',
        includeSystemMessage: false,
        includeBookmarks: false,
      })
    ).toEqual({
      title: 'Renamed',
      description: null,
      includeSystemContext: false,
      includeAgentSystemPrompts: false,
      includeBookmarks: false,
    });
  });

  it('keeps a description that was typed', () => {
    const draft = {
      ...initialExportDraft({ title: 'Tree', description: 'About' }),
    };
    expect(toExportOptions(draft).description).toBe('About');
  });
});
