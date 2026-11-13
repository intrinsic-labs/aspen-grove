import { createContext, useContext } from 'react';
import type { AgentEditorState } from './useAgentEditorState';

const AgentEditorContext = createContext<AgentEditorState | null>(null);

/** Provided by the agent editor's stack to every page pushed inside it. */
export const AgentEditorProvider = AgentEditorContext.Provider;

export const useAgentEditor = (): AgentEditorState => {
  const editor = useContext(AgentEditorContext);
  if (!editor) {
    throw new Error('useAgentEditor must be used inside the agent editor.');
  }
  return editor;
};
