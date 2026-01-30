import { create } from 'zustand';

/**
 * App Store
 *
 * Global application state managed with Zustand.
 * This store handles UI state that doesn't belong in WatermelonDB.
 *
 * WatermelonDB handles:
 * - Persisted entity data (trees, nodes, documents, etc.)
 * - Observable queries for reactive UI updates
 *
 * Zustand handles:
 * - Ephemeral UI state (which tree is open, active path selection)
 * - Modal/sheet visibility
 * - Loading states
 * - Error states
 * - Voice mode state
 */

// ============================================
// Types
// ============================================

export interface ActivePath {
  /** The ID of the current leaf node in the path */
  currentNodeId: string | null;
  /** Ordered array of node IDs from root to current */
  nodeIds: string[];
  /** Version selections for Buffer Mode (position -> selected nodeId) */
  versionSelections: Record<string, string>;
}

export interface AppState {
  // ----------------------------------------
  // Navigation State
  // ----------------------------------------

  /** Currently open Loom Tree ID, or null if on Grove screen */
  activeTreeId: string | null;

  /** Active path within the current tree */
  activePath: ActivePath;

  /** Currently open document ID, or null */
  activeDocumentId: string | null;

  // ----------------------------------------
  // UI State
  // ----------------------------------------

  /** Whether the app is in a loading state */
  isLoading: boolean;

  /** Loading message to display */
  loadingMessage: string | null;

  /** Global error message */
  errorMessage: string | null;

  /** Whether voice mode is enabled */
  voiceModeEnabled: boolean;

  /** Whether currently listening for voice input */
  isListening: boolean;

  /** Whether TTS is currently playing */
  isSpeaking: boolean;

  // ----------------------------------------
  // Initialization State
  // ----------------------------------------

  /** Whether the app has been initialized (DB ready, etc.) */
  isInitialized: boolean;

  /** Whether this is the first launch (no grove exists) */
  isFirstLaunch: boolean;

  /** The user's grove ID (singleton) */
  groveId: string | null;

  /** The owner agent ID (human agent) */
  ownerAgentId: string | null;
}

export interface AppActions {
  // ----------------------------------------
  // Navigation Actions
  // ----------------------------------------

  /** Open a Loom Tree */
  setActiveTree: (treeId: string | null) => void;

  /** Update the active path */
  setActivePath: (path: ActivePath) => void;

  /** Navigate to a specific node in the active path */
  navigateToNode: (nodeId: string, pathToNode: string[]) => void;

  /** Set a version selection for Buffer Mode */
  setVersionSelection: (position: string, nodeId: string) => void;

  /** Open a document */
  setActiveDocument: (documentId: string | null) => void;

  // ----------------------------------------
  // UI Actions
  // ----------------------------------------

  /** Set loading state */
  setLoading: (isLoading: boolean, message?: string | null) => void;

  /** Set error message */
  setError: (message: string | null) => void;

  /** Toggle voice mode */
  setVoiceMode: (enabled: boolean) => void;

  /** Set listening state */
  setListening: (isListening: boolean) => void;

  /** Set speaking state */
  setSpeaking: (isSpeaking: boolean) => void;

  // ----------------------------------------
  // Initialization Actions
  // ----------------------------------------

  /** Mark app as initialized */
  setInitialized: (groveId: string, ownerAgentId: string, isFirstLaunch: boolean) => void;

  /** Reset all state (for testing/logout) */
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: AppState = {
  // Navigation
  activeTreeId: null,
  activePath: {
    currentNodeId: null,
    nodeIds: [],
    versionSelections: {},
  },
  activeDocumentId: null,

  // UI
  isLoading: false,
  loadingMessage: null,
  errorMessage: null,
  voiceModeEnabled: false,
  isListening: false,
  isSpeaking: false,

  // Initialization
  isInitialized: false,
  isFirstLaunch: true,
  groveId: null,
  ownerAgentId: null,
};

// ============================================
// Store
// ============================================

export const useAppStore = create<AppState & AppActions>((set) => ({
  ...initialState,

  // ----------------------------------------
  // Navigation Actions
  // ----------------------------------------

  setActiveTree: (treeId) =>
    set({
      activeTreeId: treeId,
      // Reset path when changing trees
      activePath: {
        currentNodeId: null,
        nodeIds: [],
        versionSelections: {},
      },
    }),

  setActivePath: (path) =>
    set({
      activePath: path,
    }),

  navigateToNode: (nodeId, pathToNode) =>
    set((state) => ({
      activePath: {
        ...state.activePath,
        currentNodeId: nodeId,
        nodeIds: pathToNode,
      },
    })),

  setVersionSelection: (position, nodeId) =>
    set((state) => ({
      activePath: {
        ...state.activePath,
        versionSelections: {
          ...state.activePath.versionSelections,
          [position]: nodeId,
        },
      },
    })),

  setActiveDocument: (documentId) =>
    set({
      activeDocumentId: documentId,
    }),

  // ----------------------------------------
  // UI Actions
  // ----------------------------------------

  setLoading: (isLoading, message = null) =>
    set({
      isLoading,
      loadingMessage: message,
    }),

  setError: (message) =>
    set({
      errorMessage: message,
    }),

  setVoiceMode: (enabled) =>
    set({
      voiceModeEnabled: enabled,
      // Stop listening/speaking when voice mode is disabled
      isListening: enabled ? undefined : false,
      isSpeaking: enabled ? undefined : false,
    }),

  setListening: (isListening) =>
    set({
      isListening,
    }),

  setSpeaking: (isSpeaking) =>
    set({
      isSpeaking,
    }),

  // ----------------------------------------
  // Initialization Actions
  // ----------------------------------------

  setInitialized: (groveId, ownerAgentId, isFirstLaunch) =>
    set({
      isInitialized: true,
      groveId,
      ownerAgentId,
      isFirstLaunch,
    }),

  reset: () => set(initialState),
}));

// ============================================
// Selectors (for optimized re-renders)
// ============================================

/** Select just the active tree ID */
export const selectActiveTreeId = (state: AppState) => state.activeTreeId;

/** Select just the active path */
export const selectActivePath = (state: AppState) => state.activePath;

/** Select loading state */
export const selectIsLoading = (state: AppState) => state.isLoading;

/** Select voice mode state */
export const selectVoiceMode = (state: AppState) => ({
  enabled: state.voiceModeEnabled,
  isListening: state.isListening,
  isSpeaking: state.isSpeaking,
});

/** Select initialization state */
export const selectInitState = (state: AppState) => ({
  isInitialized: state.isInitialized,
  isFirstLaunch: state.isFirstLaunch,
  groveId: state.groveId,
  ownerAgentId: state.ownerAgentId,
});
