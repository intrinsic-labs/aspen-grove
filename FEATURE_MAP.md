---
feature-map: 1
root: .
revision: 9b26e3090a5a6317927c71cb9a5b2b62f6dfc0ed
reconciled: 2026-11-10
---
# Aspen Grove feature map

One entry per user-visible feature of the Aspen Grove mobile app (Expo / React Native, one
tree for iOS and Android): where it is on screen, how to reach it from a cold start, the
`testID` to drive it by, the code that owns it and what it reads or writes. The app has no
server. "Backend" means the LLM provider call (OpenRouter or LM Studio) or the on-device
WatermelonDB table and repository behind the feature. To start, sign in to and drive the app,
see [VERIFY.md](VERIFY.md).

**State of this map.** It was built from source at `revision:`. Every `working` selector was
confirmed by reading that its `testID` lands on a host element (`View`, `Pressable`, `Text`,
`TextInput`, `ScrollView`/`FlatList`/`SectionList`, `Switch`, `Slider`), directly or through a
wrapper that forwards it. **A first rendered simulator walk on 2026-11-10, at main
9b26e30, matched the map on every path walked**: onboarding skip, Connections, the agent
editor, trees menu → new tree, send, the parallel rail, the voice chooser lookup and the export
lookup. Paths not in that list are still read from code, not observed.

**Maintenance rule.** If you change a route, a screen or a feature, update its entry in the
same change: add entries for new features, remove entries for removed ones, and keep `testID`s
and their entries in step. Then run `npm run check:map` (the vendored checker in
`scripts/check-feature-map.py`, over `src/app/**/*.tsx`; CI fails on errors and unmapped routes
and shows drift as a warning). `main` is squash-merged, so `revision:` must always name a
commit already on `main`, never one on your branch: bump it in a follow-up once the change has
landed, and only after re-reading every entry the drift warnings name; `npm run
check:map:strict` then passes. Bump `reconciled:` only after a full walk of
every entry on a device or simulator.

**Scope.** v1 is branching dialogue, inline continuations, edit-as-branch, bookmarks,
provenance as it stands, Open Loom import and export, and OpenRouter and LM Studio as
providers. None of the cut features (sync, sharing or publishing, Field Guide, memory or stash,
the documents editor, RFC 3161 timestamps) has UI in the app today, so none is mapped. Export
uses the OS share sheet only to hand off the Open Loom file. That is the in-scope export, not
the cut "sharing" feature. Code for cut features that exists only in the domain, schema or
repositories (documents, links, timestamp certificates) is not user-visible and is not
listed here.

**First-launch state and the two prerequisite paths.**

A fresh install, with no keys, no model agent and no trees, opens on **Home**
(`home-welcome`) and Home at once opens **onboarding** (`onboarding-screen`) over it, once:
connect a provider, choose an agent, land in a first tree. Startup creates the human owner
agent and a grove named "My Grove", but **no model agent**. Onboarding shows only while
`user_preferences.onboarding_completed_at` is unset and there is no shared model agent
(`src/application/services/onboarding/first-run.ts`); finishing or skipping sets the date,
so an install that skipped, or one that already had an agent, stays on Home. After a skip,
Home and an empty Loom Trees list show a one-line setup hint with its action
(`home-setup-hint` / `home-setup-action`, `trees-setup-hint` / `trees-setup-action`):
"Set up" reopens onboarding when there is no agent, "Add key" opens the Connections sheet
when the default agent is on OpenRouter and no key is stored. Two paths unlock everything
else, and the Reach lines below refer to them:

- **P1, create an agent:** the onboarding path (`onboarding-provider-openrouter` → paste a
  key into `connections-openrouter-key-input` → `onboarding-continue` → keep the
  preselected `onboarding-template-claude-sonnet-balanced` → `onboarding-begin`), which
  also lands in a tree (P2). From Settings instead: `drawer-menu-button` →
  `drawer-nav-settings` → `settings-link-agents` → `settings-agents-new` → pick a template
  (`agent-editor-template-*`) or a provider tab (`agent-editor-model-provider-openrouter` /
  `-lmstudio`) and a model row (`agent-editor-model-option-<model id>`, or type an id into
  `agent-editor-model-search-input` and tap `agent-editor-model-custom`) →
  `agent-editor-submit`. The first agent becomes the default. Generating replies also needs a
  key: the OpenRouter key in Connections, or a reachable LM Studio server. A build with
  `EXPO_PUBLIC_OPENROUTER_API_KEY` set falls back to that key (`provider-key.ts`).
- **P2, open a tree:** onboarding's `onboarding-begin` opens one. Otherwise, after P1:
  `home-new-tree-button` on Home, `trees-empty-new-tree` on an empty Loom Trees list, or
  `drawer-menu-button` → `drawer-nav-trees` → `trees-menu-button` → "New Tree". This opens
  the Dialogue screen (`chat-screen`) on an empty, *ephemeral* tree. If you go back without
  sending, the tree is deleted (see `chat.ephemeral-discard`). Once a tree exists,
  `drawer-recents-row-<treeId>` or `trees-list-row-<treeId>` reopens it.

Startup does not seed a tree: `runStartupOrchestrator` can create a "First Loom Tree", but
`AppServicesProvider` calls it with `ensureDialogueSmokeTreeIfEmpty: false`. So "no trees"
stays until the user makes one.

**Driving notes (selectors).**

- Selectors are React Native `testID`s. On iOS they surface as `accessibilityIdentifier`
  (Detox `by.id`, Maestro `id:`). The map writes them bare, for example `chat-composer-input`.
- A few ids exist in code only as templates (`settings-link-${route}`,
  `settings-voice-${name}`), so grepping for the literal id finds nothing. The entries name the
  template; search for its prefix.
- An id written like `trees-list-row-<treeId>` has a ULID or other runtime suffix. Find the
  static parent (`trees-list`) first, then the row by its visible text, or read ids from the
  database.
- **Native context-menu items have no testID** (`react-native-context-menu-view`). Long-press
  the trigger (for a message or a continuation card), or tap it for the `···` header menus,
  then pick the item by its visible title. Those entries say `none — native context menu
  item; reach via long-press on <testID>`.
- The three `···` header triggers (`trees-menu-button`, `chat-menu-button`,
  `node-detail-menu-button`) are `HeaderIconButton` Pressables with no `onPress`, inside a
  native `ContextMenu` in `dropdownMenuMode`. A tap on them reaches the native view, which opens
  the menu.
- **Nested Pressables on iOS.** A `Pressable` is `accessible` by default. On iOS that can hide
  a nested Pressable's identifier from XCUITest-based drivers such as Maestro (Detox walks the
  view tree and is less affected). Two places nest a Pressable this way:
  `bookmarks-sheet-row-details-<nodeId>` inside `bookmarks-sheet-row-<nodeId>`, and
  `settings-agents-row-make-default-<agentId>` / `settings-agents-row-delete-<agentId>`
  inside `settings-agents-row-<agentId>`. They were left as they are, because changing
  `accessible` would change VoiceOver behavior. If the inner id isn't found, tap its visible
  text ("Details", "Make Default", "Delete").
- Settings screens **autosave** about 450 ms after the last change. There is no Save button,
  except in the OpenRouter key sheet (`connections-openrouter-key-save`), as in Latent Spaces.
  `settings-status-saving` shows while a save runs and `settings-status-error` shows if it
  fails.
- System dialogs (`Alert.alert`, the document picker, the share sheet) are native and have no
  testIDs.

## App shell

### Startup gate
- **ID:** `app.bootstrap`
- **Purpose:** On launch, opens the database and creates the defaults (preferences, human
  owner agent, grove), showing a spinner and then the app or an error.
- **Where:** Full screen, before any route renders.
- **Reach:** Cold start the app.
- **Requires:** none
- **Selector:** working — `app-bootstrap-loading` (spinner), `app-bootstrap-error` (failure text)
- **Code:** `src/interface/composition/AppServicesProvider.tsx#AppBootstrapGate`, `src/infrastructure/bootstrap/run-startup-orchestrator.ts`, `src/application/use-cases/InitializeAppDefaultsUseCase.ts`, `src/app/_layout.tsx`
- **Backend:** WatermelonDB `user_preferences`, `agents`, `groves`, through the Watermelon
  repositories (schema v9 adds `user_preferences.onboarding_completed_at`)
- **Status:** live
- **Notes:** The gate wraps the root `Stack`, so no route mounts until bootstrap is `ready`.
  The smoke-tree seeding in the orchestrator is switched off (see the first-launch notes).

### Navigation drawer
- **ID:** `nav.drawer`
- **Purpose:** A slide-out drawer with the main destinations: Loom Trees, Search and Settings.
  Home is reached through the drawer route `index`.
- **Where:** Hamburger at the top left of Home, Loom Trees, Search and Settings. The drawer
  slides in from the left over 82% of the width.
- **Reach:** Cold start → `drawer-menu-button`.
- **Requires:** none
- **Selector:** working — `drawer-menu-button` (opens), `drawer-root` (drawer panel), `drawer-nav-trees`, `drawer-nav-search`, `drawer-nav-settings`
- **Code:** `src/interface/components/drawer/AppDrawerContent.tsx`, `src/interface/components/drawer/DrawerMenuButton.tsx`, `src/interface/components/drawer/useDrawerHeaderStyle.ts`, `src/app/(drawer)/_layout.tsx`
- **Backend:** none — client-only
- **Status:** live
- **Notes:** The drawer has no Home row. `NAV_ITEMS` holds trees, search and settings only,
  although `(drawer)/_layout.tsx` declares `index` with the label "Home". Once you leave
  Home, iOS has no in-app way back to it. Android's back button returns to the drawer's first
  route (Home). To reach Home on iOS, relaunch the app. Confirm on the first walk.

### Recent trees (drawer)
- **ID:** `nav.recents`
- **Purpose:** Lists dialogue trees by most recent message, so you can jump straight into one.
- **Where:** Drawer, under the "Recents" label.
- **Reach:** Cold start → `drawer-menu-button`. Rows appear once a tree exists (P2, then send).
- **Requires:** At least one non-archived dialogue tree, for rows to show.
- **Selector:** working — `drawer-recents-list`, rows `drawer-recents-row-<treeId>`
- **Code:** `src/interface/components/drawer/AppDrawerContent.tsx`
- **Backend:** WatermelonDB `loom_trees` via `WatermelonLoomTreeRepository#findByMode`
- **Status:** live
- **Notes:** The list reloads each time the drawer opens. When empty it shows "No loom trees yet."

## Home and trees

### Home (welcome)
- **ID:** `home.welcome`
- **Purpose:** A quiet landing screen with a greeting and one entry point into a new tree. Until
  a tree can start, the entry point is the step that unblocks it (`setup.hints`). On a first
  run it opens onboarding.
- **Where:** The drawer's initial screen.
- **Reach:** Cold start, then `onboarding-skip` on a fresh install. The drawer has no Home row
  (see `nav.drawer`).
- **Requires:** none
- **Selector:** working — `home-welcome` (screen), `home-new-tree-button` (only once ready), `home-setup-hint`, `home-setup-action`, `home-error`
- **Code:** `src/interface/components/home/WelcomeView.tsx`, `src/interface/components/onboarding/useFirstRunRedirect.ts`, `src/app/(drawer)/index.tsx`
- **Backend:** WatermelonDB `user_preferences.display_name` via `WatermelonUserPreferencesRepository#get`; setup status as in `setup.hints`
- **Status:** live
- **Notes:** The greeting changes with the time of day ("Up late", "Morning", "Afternoon",
  "Evening"). No screen sets `displayName`, so no name is shown. Nothing shows under the
  greeting for the moment the setup status takes to load.

### Create a loom tree
- **ID:** `trees.create`
- **Purpose:** Creates a new dialogue tree with the default model agent and opens it with the
  composer focused.
- **Where:** The New Loom Tree button on Home, or the "New Tree" item in the Loom Trees `···`
  menu.
- **Reach:** P1, then `drawer-menu-button` → `drawer-nav-trees` → `trees-menu-button` →
  "New Tree". From a cold start you can use Home's `home-new-tree-button` instead.
- **Requires:** A model agent (P1). Without one, the menu's "New Tree" opens onboarding
  instead (there is no "No agents yet" error any more).
- **Selector:** working — `home-new-tree-button`, `trees-empty-new-tree`; menu item none — native context menu item; reach via a tap on `trees-menu-button`
- **Code:** `src/interface/hooks/useCreateLoomTree.ts`, `src/application/use-cases/CreateDialogueLoomTreeUseCase.ts`, `src/application/services/resolve-default-model-agent.ts`
- **Backend:** WatermelonDB `loom_trees`, `nodes` (root), `paths`, `path_states`; reads `agents`
  and `user_preferences.default_model_agent_id`
- **Status:** live
- **Notes:** The new tree opens with `ephemeral: '1'` and is deleted if you go back before
  sending (`chat.ephemeral-discard`).

### Loom tree list
- **ID:** `trees.list`
- **Purpose:** All dialogue trees in the grove, most recent first, each with its last-message
  time. Tap a row to open it.
- **Where:** Drawer → Loom Trees.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-trees`.
- **Requires:** none. When empty it shows "No loom trees yet." with a New Loom Tree button
  (`trees-empty-new-tree`), or, before a tree can start, the setup hint (`setup.hints`).
  With a tag filter on and no match it shows "No trees with this tag."
- **Selector:** working — `trees-screen`, `trees-list`, rows `trees-list-row-<treeId>`, `trees-empty`, `trees-empty-new-tree`, `trees-setup-hint`, `trees-setup-action`, `trees-error`, `trees-menu-button`
- **Code:** `src/interface/components/LoomTreeListView.tsx`, `src/interface/components/trees/TreesEmptyState.tsx`, `src/app/(drawer)/trees.tsx`
- **Backend:** WatermelonDB `loom_trees` via `WatermelonLoomTreeRepository#findByMode`; `tags` via `WatermelonTagRepository#findTagsByGroveId`
- **Status:** live

### Filter trees by tag
- **ID:** `trees.tag-filter`
- **Purpose:** Narrows the tree list to trees carrying one tag. Tap the active chip again to
  clear it.
- **Where:** A row of tag chips above the Loom Trees list.
- **Reach:** P2 → `chat-menu-button` → "Tags" → create a tag (see `chat.tags`) → back →
  `drawer-menu-button` → `drawer-nav-trees` → `trees-tag-filter-chip-<tagId>`.
- **Requires:** At least one tag in the grove. The chip row is hidden otherwise.
- **Selector:** working — `trees-tag-filter`, chips `trees-tag-filter-chip-<tagId>`
- **Code:** `src/interface/components/LoomTreeListView.tsx`
- **Backend:** WatermelonDB `tag_assignments` via `WatermelonTagRepository#findItemsByTag`
- **Status:** live

### Import a tree (Open Loom and loom formats)
- **ID:** `trees.import`
- **Purpose:** Picks a file and imports it as one or more dialogue trees. It accepts Open Loom
  v1 and v2, and the legacy MiniLoom, Socketteer Loom and Loomsidian formats, then reports
  what was imported.
- **Where:** The "Import Tree" item in the Loom Trees `···` menu. The result appears in a
  native "Import complete" alert.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-trees` → `trees-menu-button` →
  "Import Tree" → OS document picker.
- **Requires:** A file on the device, simulator or Files app. No agent needed.
- **Selector:** none — native context menu item; reach via a tap on `trees-menu-button`; the picker and the alert are native
- **Code:** `src/interface/components/LoomTreeListView.tsx#onImportTree`, `src/interface/services/loom-file-sharing.ts#pickAndReadTextFile`, `src/application/use-cases/ImportLoomTreeUseCase.ts`, `src/application/services/open-loom/import/`
- **Backend:** WatermelonDB `loom_trees`, `nodes`, `edges`, `edge_sources`, `paths`, `path_states`
- **Status:** live
- **Notes:** Errors land in `trees-error`. The format is sniffed from content
  (`detect.ts`), not from the file extension.

### Setup hints (no agent, no key)
- **ID:** `setup.hints`
- **Purpose:** Where a tree can't start yet, one line says what to do and the action sits
  under it: "Choose a model to start your first tree." with "Set up" (opens onboarding),
  or "Add your OpenRouter key to start a tree." with "Add key" (opens the Connections
  sheet).
- **Where:** Home, in place of New Loom Tree; the empty Loom Trees list, under "No loom
  trees yet."
- **Reach:** Fresh install → `onboarding-skip` → Home shows `home-setup-hint`. For "no key":
  create an OpenRouter agent in Settings → Agents without storing a key.
- **Requires:** Not ready to start a tree: no model agent, or an OpenRouter default agent and
  no key. LM Studio reachability is not checked here; a server that is down is reported
  when generation fails (`chat.dialogue`).
- **Selector:** working — `home-setup-hint`, `home-setup-action`, `trees-setup-hint`, `trees-setup-action`
- **Code:** `src/interface/components/setup/SetupHint.tsx`, `src/interface/components/setup/setup-hint-copy.ts`, `src/interface/hooks/useSetupStatus.ts`, `src/application/use-cases/GetSetupStatusUseCase.ts`, `src/application/services/onboarding/setup-status.ts`
- **Backend:** WatermelonDB `agents`, `user_preferences` (`default_model_agent_id`,
  `onboarding_completed_at`); `expo-secure-store` `openrouter_api_key` (read only)
- **Status:** live
- **Notes:** Re-read on every focus, so returning from onboarding or Connections updates it.

## Onboarding

### First-run setup
- **ID:** `onboarding.first-run`
- **Purpose:** On a fresh install, a two-step setup (connect a provider, choose an agent) that
  ends in a first tree. Skippable from every step.
- **Where:** Route `onboarding`, a full screen over Home with no stack header. "1 of 2" /
  "2 of 2" at the top, Back (step 2) at the left, Skip at the right, the step's button at
  the bottom.
- **Reach:** Cold start of a fresh install (it opens by itself), or `home-setup-action` /
  `trees-setup-action` after a skip.
- **Requires:** none
- **Selector:** working — `onboarding-screen`, `onboarding-step-indicator`, `onboarding-skip`, `onboarding-back`, `onboarding-error`
- **Code:** `src/interface/components/onboarding/OnboardingView.tsx`, `src/interface/components/onboarding/useOnboardingFlow.ts`, `src/interface/components/onboarding/OnboardingHeading.tsx`, `src/application/services/onboarding/first-run.ts`, `src/app/onboarding.tsx`
- **Backend:** WatermelonDB `user_preferences.onboarding_completed_at` (set on finish and on
  skip)
- **Status:** live
- **Notes:** Skip goes back to Home, which then shows the setup hint. It opens once per launch
  at most, and never again after a finish or skip.

### Onboarding: connect a provider
- **ID:** `onboarding.connect`
- **Purpose:** Step 1. Choose OpenRouter (paste a key) or LM Studio (a server address and a
  connection test), using the same fields and storage as Settings → Connections.
- **Where:** `onboarding` step 1.
- **Reach:** Fresh install → `onboarding-provider-openrouter` →
  `connections-openrouter-key-input` → `onboarding-continue`; or
  `onboarding-provider-lmstudio` → `connections-lmstudio-endpoint-input` →
  `connections-lmstudio-test` → `onboarding-continue`.
- **Requires:** none. Continue needs a key (OpenRouter) or an address (LM Studio); a
  failing LM Studio test does not block it.
- **Selector:** working — `onboarding-step-provider`, `onboarding-provider-openrouter`, `onboarding-provider-lmstudio`, `onboarding-continue`, plus the reused `connections-openrouter-key-input`, `connections-openrouter-key-reveal`, `connections-lmstudio-endpoint-input`, `connections-lmstudio-test`, `connections-lmstudio-status`, `connections-lmstudio-error`
- **Code:** `src/interface/components/onboarding/ProviderStep.tsx`, `src/interface/components/onboarding/ProviderOption.tsx`, `src/interface/components/settings/connections/OpenRouterConnectionSection.tsx`, `src/interface/components/settings/connections/LmStudioConnectionSection.tsx`, `src/interface/components/settings/connections/useConnectionsController.ts`
- **Backend:** As `settings.connections.openrouter` and `settings.connections.lmstudio`
  (secure store and `user_preferences.lmstudio_settings`); Continue saves at once
- **Status:** live
- **Notes:** The LM Studio token and auto-load rows are left out here; they stay in Settings.

### Onboarding: choose an agent
- **ID:** `onboarding.agent`
- **Purpose:** Step 2. OpenRouter: the agent templates with the first ("Claude Sonnet
  (Balanced)") preselected, plus "Customize…" for the full agent editor. LM Studio: the
  models the server reports. Begin creates the agent (the first becomes the default), marks
  onboarding done and replaces onboarding with a new tree.
- **Where:** `onboarding` step 2.
- **Reach:** `onboarding.connect` → `onboarding-continue` → (optionally
  `onboarding-template-<key>`, or `onboarding-agent-customize` → edit → `agent-editor-submit`
  "Use"; for LM Studio `onboarding-agent-model-option-<model id>`) → `onboarding-begin`.
- **Requires:** LM Studio: a reachable server to list models. When it isn't,
  `onboarding-agent-model-error` says so in plain words with a refresh button
  (`onboarding-agent-model-refresh`).
- **Selector:** working — `onboarding-step-agent`, `onboarding-template-<key>`, `onboarding-agent-customize`, `onboarding-agent-custom`, `onboarding-begin`, LM Studio picker with prefix `onboarding-agent` (as in `settings.agents.model-picker`, provider tabs hidden); the customize sheet is `agent-editor-*` (`settings.agents.editor`)
- **Code:** `src/interface/components/onboarding/AgentStep.tsx`, `src/interface/components/onboarding/onboarding-drafts.ts`, `src/interface/components/settings/agents/AgentTemplateList.tsx`, `src/interface/components/settings/agents/useCreateAgentFromDraft.ts`, `src/interface/hooks/useCreateLoomTree.ts`
- **Backend:** WatermelonDB `agents`, `user_preferences` (`default_model_agent_id`,
  `onboarding_completed_at`), then the tree tables as in `trees.create`
- **Status:** live
- **Notes:** Back from the new tree without sending discards it (`chat.ephemeral-discard`)
  and returns to Home, which shows New Loom Tree.

## Search

### Search node content
- **ID:** `search.nodes`
- **Purpose:** Full-text search across every tree's nodes, grouped by tree. Tap a result to
  open its node detail, or tap a tree header to open the tree.
- **Where:** Drawer → Search. The search bar is at the top.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-search` → type at least two
  characters into `search-input`.
- **Requires:** Nodes to search. When empty it prompts "Type at least two characters".
- **Selector:** working — `search-screen`, `search-input`, `search-clear-button`, `search-done-button`, `search-results-list`, tree headers `search-results-tree-<treeId>`, rows `search-results-row-<nodeId>`
- **Code:** `src/interface/components/SearchView.tsx`, `src/app/(drawer)/search.tsx`
- **Backend:** WatermelonDB `nodes` via `WatermelonNodeRepository#searchByContent` (limit 100);
  `loom_trees` for titles
- **Status:** live
- **Notes:** The query is debounced by 250 ms. Archived trees are dropped from results.

## Dialogue

### Dialogue view
- **ID:** `chat.dialogue`
- **Purpose:** Shows the active path of a tree as a conversation: human bubbles on the right,
  model text in markdown on the left, and a caption under each node for bookmarks,
  continuation count and pruned state.
- **Where:** Route `tree/[treeId]`, a full screen with a transparent header (title is the tree
  title, `···` at the right).
- **Reach:** P2, or `drawer-recents-row-<treeId>` / `trees-list-row-<treeId>`.
- **Requires:** A tree. Sending also needs a model agent and a key or server (P1).
- **Selector:** working — `chat-screen`, `chat-message-list`, `chat-message-list-loading`, message rows `chat-message-row-<nodeId>`, `chat-streaming-message`, `chat-error`, `chat-error-action`
- **Code:** `src/interface/components/LoomTreeChatView.tsx`, `src/interface/components/chat/ChatMessageList.tsx`, `src/interface/components/chat/message-list/`, `src/interface/components/chat/ChatErrorNotice.tsx`, `src/interface/components/chat/turns/useProviderErrorNotice.ts`, `src/application/services/llm/describe-provider-error.ts`, `src/interface/components/chat/MarkdownText.tsx`, `src/interface/components/chat/markdown/`, `src/interface/components/chat/message-type.ts`, `src/interface/components/chat/useLoomTreeChatController.ts`, `src/interface/components/chat/session/`, `src/interface/components/chat/session-helpers.ts`, `src/interface/components/chat/scroll/`, `src/app/tree/*.tsx`
- **Backend:** WatermelonDB `loom_trees`, `paths`, `path_nodes`, `path_states`, `nodes`, `edges`
  via the Watermelon repositories
- **Status:** live
- **Notes:** Tapping a message row opens that node's continuation rail
  (`chat.continuation-rail`). A long-press opens the message menu (`chat.message-menu`).
  With Voice Mode on, a double-tap reads the row aloud instead (`chat.read-aloud`).
  A long path mounts its last rows first and fills in the earlier ones once the screen has
  slid in, so a row far up the path can take a moment to exist in the hierarchy.
  A failed send or regenerate shows a plain message in `chat-error`. When the fix is in
  Connections (LM Studio not answering, no OpenRouter key, key refused),
  `chat-error-action` ("Open Connections") opens the Connections sheet over the tree. Other
  provider errors keep their `[provider:code]` detail.

### Compose and send
- **ID:** `chat.composer`
- **Purpose:** Types a message and sends it. The model's reply streams in under it, and both
  are saved as nodes on the active path.
- **Where:** A sticky composer at the bottom of the Dialogue screen. The send button sits at
  the right of the input.
- **Reach:** P2 → `chat-composer-input` → `chat-composer-send`.
- **Requires:** A model agent whose provider is reachable: an OpenRouter key, or an LM Studio
  server at the configured endpoint.
- **Selector:** working — `chat-composer` (container), `chat-composer-input`, `chat-composer-send`
- **Code:** `src/interface/components/chat/ChatComposer.tsx`, `src/interface/components/chat/composer/ComposerSendButton.tsx`, `src/interface/components/chat/composer/composer-mode.ts`, `src/interface/components/chat/turns/useSendTurn.ts`, `src/interface/components/chat/composer/useComposerDraft.ts`, `src/interface/components/chat/useStreamingAssistantRow.ts`, `src/application/use-cases/SendDialogueTurnUseCase.ts`, `src/application/services/context/`, `src/infrastructure/llm/`
- **Backend:** OpenRouter `POST https://openrouter.ai/api/v1/chat/completions` (streaming) or
  LM Studio `POST <endpoint>/v1/chat/completions` (OpenAI-compatible). Writes WatermelonDB
  `nodes`, `edges`, `edge_sources`, `raw_api_responses`, `path_nodes` and `path_states`, and
  updates `loom_trees.last_message_at`.
- **Status:** live
- **Notes:** The placeholder reads "Reply to <agent name>". The send button is hidden
  while the input is empty; it shows `···` while sending and a checkmark while editing
  (label "Save"). The provider key is read from SecureStore first, then from
  `EXPO_PUBLIC_*` env vars (`src/interface/components/chat/provider-key.ts`). A missing
  OpenRouter key throws `MissingProviderKeyError`, shown as "Add your OpenRouter key in
  Connections to generate." with `chat-error-action`.

### Expanded composer
- **ID:** `chat.composer-expanded`
- **Purpose:** Full-screen draft editing for long messages. The draft is shared with the inline
  composer.
- **Where:** Route `tree/[treeId]/compose`, with no stack header. "Draft" and a collapse button
  sit at the top.
- **Reach:** P2 → type more than about 6 lines into `chat-composer-input` →
  `chat-composer-expand`.
- **Requires:** Enough text to overflow the collapsed input. The expand button is hidden
  otherwise.
- **Selector:** working — `chat-composer-expand`, `compose-screen`, `compose-input`, `compose-collapse`
- **Code:** `src/interface/components/chat/ExpandedDialogueComposerView.tsx`, `src/interface/components/chat/dialogue-draft-store.ts`, `src/app/tree/*/compose.tsx`
- **Backend:** none — client-only (an in-memory draft store)
- **Status:** live

### Message menu (copy, node info)
- **ID:** `chat.message-menu`
- **Purpose:** The long-press menu on a message, titled with its local id. It offers
  Regenerate (model rows only), Continuations, Edit, Rewind To Node, Copy Text, Node Info,
  Bookmark / Remove Bookmark, and Prune / Restore.
- **Where:** A native context menu over the message bubble.
- **Reach:** P2 → send once → long-press `chat-message-row-<nodeId>`.
- **Requires:** At least one message on the path.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<nodeId>`
- **Code:** `src/interface/components/chat/message-list/message-menu.ts#buildMessageMenuItems`, `src/interface/components/chat/node-actions/useMessageActions.ts#onMessageAction`
- **Backend:** Copy Text: none — client-only (`expo-clipboard`). Node Info pushes the node
  detail route (`node.detail`). The other items have their own entries below.
- **Status:** live

### Regenerate a response
- **ID:** `chat.regenerate`
- **Purpose:** Replaces a model response with a new sibling generation from the same context.
  Both are kept as branches.
- **Where:** The "Regenerate" item in a model message's long-press menu.
- **Reach:** P2 → send once → long-press the model row `chat-message-row-<nodeId>` →
  "Regenerate".
- **Requires:** A model message, plus a reachable provider.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<nodeId>`
- **Code:** `src/interface/components/chat/turns/useRegenerateFromNode.ts`, `src/interface/components/chat/turns/regenerate-plan.ts`, `src/application/use-cases/GenerateDialogueContinuationUseCase.ts`, `src/application/services/create-verified-model-continuation-node.ts`
- **Backend:** The same provider call as `chat.composer`. Writes `nodes`, `edges`,
  `raw_api_responses` and `path_states`.
- **Status:** live

### Edit as branch
- **ID:** `chat.edit-branch`
- **Purpose:** Edits a message. Saving creates an edited sibling node, so the original branch
  is kept, and the active path moves onto the edit.
- **Where:** The "Edit" item in a message's long-press menu, or in the node detail `···` menu.
  An "Editing <localId>" banner appears above the composer.
- **Reach:** P2 → send once → long-press `chat-message-row-<nodeId>` → "Edit" → change text
  in `chat-composer-input` → `chat-composer-send` (Save). Cancel with
  `chat-composer-edit-cancel`.
- **Requires:** At least one message.
- **Selector:** working — `chat-composer-edit-banner`, `chat-composer-edit-cancel`, `chat-composer-input`, `chat-composer-send`; menu item none — native context menu item; reach via long-press on `chat-message-row-<nodeId>`
- **Code:** `src/interface/components/chat/composer/useEditNode.ts#startEditForNode`, `src/interface/components/chat/turns/useSendTurn.ts`, `src/application/use-cases/EditDialogueNodeUseCase.ts`
- **Backend:** WatermelonDB `nodes` (new node with `edited_from`), `edges`, `path_nodes`,
  `path_states`. Editing a human turn then generates a reply through the provider call in
  `chat.composer`.
- **Status:** live
- **Notes:** Edit from node detail navigates back to `tree/[treeId]` with
  `editNodeId` / `editRequestId` params, which start the same flow.

### Read a message aloud (Voice Mode)
- **ID:** `chat.read-aloud`
- **Purpose:** With Voice Mode on, reads messages aloud in the chosen character voice (Latent
  Spaces' voices): a double-tap on a message reads it, each new model response is read once it
  has finished generating, and a tap on any message stops speech. The message being read is
  drawn in its voice's color. Fenced code blocks are read as "You can see the code on this loom
  tree branch." The `···` menu's "Voice Mode" item (checked when on) toggles Voice Mode app-wide.
- **Where:** Message rows on the Dialogue screen; "Voice Mode" in the Dialogue `···` menu.
- **Reach:** P2 → `chat-menu-button` → "Voice Mode" (or `settings.voice`) → send once → wait
  for the reply to finish (it is read aloud) → double-tap `chat-message-row-<nodeId>` to hear
  it again → tap any row to stop.
- **Requires:** Voice Mode on, and at least one message. Sound needs the device's media volume
  up; it plays with the iOS silent switch on, as in Latent Spaces.
- **Selector:** working — `chat-message-row-<nodeId>` (double-tap, tap); menu item none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/read-aloud/useChatReadAloud.ts`, `src/interface/components/chat/read-aloud/useReadAloudTaps.ts`, `src/interface/components/chat/ChatHeaderMenu.tsx`, `src/interface/components/voice/VoiceModeProvider.tsx`, `src/interface/components/voice/useReadAloudPlayback.ts`, `src/application/services/speech/ReadAloudService.ts`, `src/application/services/speech/prepare-speech-text.ts`, `src/application/services/speech/resolve-system-voice.ts`, `src/infrastructure/speech/ExpoSpeechSynthesizer.ts`
- **Backend:** none — on-device text-to-speech (`expo-speech`, audio session via `expo-audio`; AVSpeechSynthesizer on iOS,
  TextToSpeech on Android). Reads `nodes` for the finished response.
- **Status:** live
- **Notes:** With Voice Mode on, a single tap waits 320 ms (the double-tap window) before it
  opens the rail; with it off taps are immediate. Each voice uses its Latent Spaces iOS voice
  when installed, otherwise a voice with the same name and language, then any voice in that
  language (en-GB, en-AU, en-IE), then the system default. Leaving the Dialogue screen stops
  speech. Parallel continuations are not read aloud. The first utterance sets the shared audio
  session to playback with duck-others (expo-audio, no microphone permission), so the silent
  switch doesn't mute it.

### Rewind to a node
- **ID:** `chat.rewind`
- **Purpose:** Makes an earlier node, or a node on another branch, the current one, so the
  active path is re-pointed through it.
- **Where:** "Rewind To Node" in the message menu. Also "Make Current Node" on a continuation
  card or in the node detail menu, a double-tap on a continuation card, or a tap on a
  bookmark row.
- **Reach:** P2 → send twice → long-press an earlier `chat-message-row-<nodeId>` →
  "Rewind To Node".
- **Requires:** More than one node.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<nodeId>`
- **Code:** `src/interface/components/chat/node-actions/useRewindToNode.ts`, `src/application/use-cases/SwitchDialoguePathUseCase.ts`, `src/application/services/resolve-continuation-path.ts`
- **Backend:** WatermelonDB `path_states`, `path_nodes`, `path_selections` via `WatermelonPathRepository` and `WatermelonPathStateRepository`
- **Status:** live

### Inline continuation rail
- **ID:** `chat.continuation-rail`
- **Purpose:** Shows a node's continuations (its child branches) inline as a horizontal row of
  cards. A tap opens a card's node detail, a double-tap retraces that branch, and a long-press
  gives Make Current Node, Copy Text and Bookmark. Its header also holds the generate control
  (`chat.parallel-continuations`).
- **Where:** A band directly under the tapped message, inside the message list.
- **Reach:** P2 → send once → tap `chat-message-row-<nodeId>`, or long-press it and choose
  "Continuations". Tap the same row again to close the rail.
- **Requires:** A node. It shows "No continuations yet." until the node has children.
- **Selector:** working — `chat-continuation-rail`, `chat-continuation-rail-list`, cards `chat-continuation-card-<nodeId>`, `chat-continuation-rail-loading`, `chat-continuation-rail-empty`, `chat-continuation-rail-error`; card menu items none — native context menu item; reach via long-press on `chat-continuation-card-<nodeId>`
- **Code:** `src/interface/components/chat/ContinuationRail.tsx`, `src/interface/components/chat/ContinuationCardShell.tsx`, `src/interface/components/chat/SavedContinuationCard.tsx`, `src/interface/components/chat/continuation-menu.ts`, `src/interface/components/chat/useNodeContinuations.ts`, `src/interface/components/chat/node-actions/useContinuationGestures.ts#onContinuationSelect`
- **Backend:** WatermelonDB `edges` and `nodes` via `WatermelonEdgeRepository` and `WatermelonNodeRepository`
- **Status:** live
- **Notes:** A single tap waits 320 ms to rule out a double-tap, so a driver should wait about
  half a second before asserting on `node-detail-screen`. A double-tap needs two taps less than
  300 ms apart (`src/interface/components/chat/node-actions/double-tap.ts`). With Voice Mode on,
  a tap on a message row waits the same 320 ms before the rail opens.

### Generate several continuations at once
- **ID:** `chat.parallel-continuations`
- **Purpose:** From any node, starts 1 to 4 continuations with one action. Each streams at the
  same time into its own card in that node's continuation rail, after the node's existing
  siblings. A card can be stopped on its own; one failing or being stopped doesn't stop the
  others. Each finished (or stopped-with-text) card is saved as a sibling model node with its
  own raw response and hash chain, and a double-tap on it makes it current like any sibling.
- **Where:** The control row under the rail's "Continuations for …" title: `−` count `+` and
  "Generate N" (green). While that node's cards stream it becomes "Stop all". Cards stream in
  the rail's card row.
- **Reach:** P2 → send once → tap a message row `chat-message-row-<nodeId>` (the rail opens) →
  `chat-continuation-count-increase` / `chat-continuation-count-decrease` →
  `chat-continuation-generate-button`. Stop one card with `chat-continuation-slot-stop-<slot>`,
  all with `chat-continuation-stop-all`. Choose a finished card by double-tapping its
  `chat-continuation-card-<nodeId>`.
- **Requires:** A model agent with a reachable provider (an OpenRouter key, or an LM Studio
  server). Generate is disabled while a single send or regenerate runs; send and regenerate
  wait while several stream.
- **Selector:** working — `chat-continuation-generate` (control row), `chat-continuation-count-decrease`, `chat-continuation-count-value`, `chat-continuation-count-increase`, `chat-continuation-generate-button`, `chat-continuation-stop-all`, cards `chat-continuation-slot-<slot>` (slot 0 to 3), card state `chat-continuation-slot-state-<slot>-<state>` (state is `pending`, `streaming`, `stopping`, `done`, `stopped`, `interrupted` or `failed`), `chat-continuation-slot-stop-<slot>`, `chat-continuation-slot-error-<slot>`; once saved, the card's pressable is `chat-continuation-card-<nodeId>`
- **Code:** `src/interface/components/chat/parallel/useParallelRail.ts`, `src/interface/components/chat/parallel/useParallelContinuations.ts`, `src/interface/components/chat/parallel/parallel-slots-state.ts`, `src/interface/components/chat/parallel/rail-cards.ts`, `src/interface/components/chat/parallel/slot-card-state.ts`, `src/interface/components/chat/parallel/useContinuationCount.ts`, `src/interface/components/chat/parallel/describe-slot-failure.ts`, `src/interface/components/chat/parallel/ContinuationGenerateControl.tsx`, `src/interface/components/chat/parallel/StreamingContinuationCard.tsx`, `src/application/use-cases/GenerateParallelContinuationsUseCase.ts`, `src/application/services/dialogue-continuation/`, `src/infrastructure/persistence/watermelon/repositories/WatermelonContinuationCountPreferenceRepository.ts`
- **Backend:** N separate streaming requests to the provider call in `chat.composer` (OpenRouter
  or LM Studio), one per card, not the provider's `n`. Writes WatermelonDB `nodes`, `edges`,
  `edge_sources` and `raw_api_responses` per saved card and touches
  `loom_trees.last_message_at`; the active path changes only when a card is made current. The
  count is remembered app-wide in WatermelonDB local storage
  (`aspen_grove.parallel_continuations.count`, default 1).
- **Status:** live
- **Notes:** Card states: `pending` ("Waiting for the model…", request sent, no text yet),
  `streaming` (text plus a character count), `stopping`, `done`, `stopped`, `interrupted
  (reason)` and `failed` (the error in the card, dimmed). Saving follows the single-generation
  convention: a stop or interruption after text saves the partial text with a
  `[stream interrupted: <reason>]` line appended (so a stopped node stays marked after a
  restart); a failure or stop before any text saves nothing. A finished run's cards stay while
  the rail shows that node; once the rail closes or moves, the saved ones show as ordinary
  sibling cards. Closing the rail, or making a card current (which closes it), leaves the
  others streaming; leaving the Dialogue screen stops them all. A saved card reloads the rail
  only while it is still open on the run's node: it never reopens a closed rail or replaces
  the node you moved to. When the run ends the rows reload against the session as it is then,
  so an agent switched mid-run stays switched. A failed card's error uses the same plain
  wording as a failed send (missing or rejected key, LM Studio not answering). LM Studio gets N concurrent
  requests; a server that runs one prediction at a time queues them, so cards sit in
  `pending` and stream in turn. LM Studio's 60 s request timeout covers queueing too, so a
  late card in a long queue can end `interrupted (timeout)` or `failed`. To provoke a failure,
  point the tree's agent at a model id that doesn't exist (`agent-editor-model-custom`).
  Parallel continuations are not read aloud.

### Bookmark a node
- **ID:** `chat.bookmark`
- **Purpose:** Toggles a bookmark on a node. Bookmarked nodes show a bookmark glyph in their
  caption and are listed in the Bookmarks sheet.
- **Where:** "Bookmark" / "Remove Bookmark" in the message menu, on a continuation card's menu
  or in the node detail menu.
- **Reach:** P2 → send once → long-press `chat-message-row-<nodeId>` → "Bookmark".
- **Requires:** A node.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<nodeId>`
- **Code:** `src/interface/components/chat/node-actions/useNodeActions.ts#toggleBookmark`, `src/interface/components/chat/useNodeContinuations.ts#toggleBookmark`
- **Backend:** WatermelonDB `nodes` metadata (`bookmarked`) via `WatermelonNodeRepository#updateMetadata`
- **Status:** live

### Bookmarks sheet
- **ID:** `chat.bookmarks`
- **Purpose:** Lists this tree's bookmarked nodes, newest first. Tap a row to rewind to it, or
  tap "Details" to open its node detail.
- **Where:** A page sheet from the Dialogue `···` menu.
- **Reach:** P2 → `chat-menu-button` → "Bookmarks".
- **Requires:** A tree. When empty it shows the "No bookmarks in this tree yet" hint.
- **Selector:** working — `bookmarks-sheet`, `bookmarks-sheet-done`, `bookmarks-sheet-list`, rows `bookmarks-sheet-row-<nodeId>`, `bookmarks-sheet-row-details-<nodeId>` (nested, see the driving notes), `bookmarks-sheet-empty`, `bookmarks-sheet-error`; menu item none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/bookmarks/BookmarksSheet.tsx`, `src/interface/components/chat/ChatHeaderMenu.tsx`, `src/interface/components/chat/header-actions/useChatSheets.ts`
- **Backend:** WatermelonDB `nodes` via `WatermelonNodeRepository#findBookmarked`
- **Status:** live

### Prune or restore a node
- **ID:** `chat.prune`
- **Purpose:** Marks a node as pruned, which dims it and captions it "Pruned", or restores it.
- **Where:** "Prune" (destructive) / "Restore" in the message menu or the node detail menu.
- **Reach:** P2 → send once → long-press `chat-message-row-<nodeId>` → "Prune".
- **Requires:** A node.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<nodeId>`
- **Code:** `src/interface/components/chat/node-actions/useNodeActions.ts#togglePrune`
- **Backend:** WatermelonDB `nodes` metadata (`pruned`) via `WatermelonNodeRepository#updateMetadata`
- **Status:** live

### Edit tree title
- **ID:** `chat.title-edit`
- **Purpose:** Renames the tree.
- **Where:** A page sheet from the Dialogue `···` menu.
- **Reach:** P2 → `chat-menu-button` → "Edit Title" → `chat-title-sheet-input` →
  `chat-title-sheet-save`.
- **Requires:** A tree.
- **Selector:** working — `chat-title-sheet`, `chat-title-sheet-input`, `chat-title-sheet-save`, `chat-title-sheet-cancel`, `chat-title-sheet-error`; menu item none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/EditTreeTitleSheet.tsx`, `src/interface/components/chat/header-actions/useTreeTitle.ts`
- **Backend:** WatermelonDB `loom_trees.title` via `WatermelonLoomTreeRepository`
- **Status:** live

### Auto-title after the first reply
- **ID:** `chat.auto-title`
- **Purpose:** After the first model response, asks the tree's model for a short title and
  shows it in the header.
- **Where:** The Dialogue screen's native header title.
- **Reach:** P2 → send the first message → wait for the reply.
- **Requires:** "Auto-Title Conversations" on (`settings.behavior.auto-title`), plus a
  reachable provider.
- **Selector:** none — renders into the native stack header title, which has no testID; assert on the visible title text
- **Code:** `src/application/use-cases/GenerateTreeTitleUseCase.ts`, `src/application/use-cases/TitleTreeFromFirstMessageUseCase.ts`, `src/application/services/tree-title.ts`, `src/interface/components/chat/header-actions/useAutoTreeTitle.ts`, `src/interface/components/chat/header-actions/useFirstMessageTreeTitle.ts`
- **Backend:** The same provider chat-completions call as `chat.composer`. Writes
  `loom_trees.title`.
- **Status:** live
- **Notes:** A new tree shows a blank header title until the first message. Sending it
  titles the tree with that message's first four words (plus "..." when longer), as Latent
  Spaces does, whether or not auto-title is on. Auto-title then replaces that provisional
  title, or a default one. It fails silently and keeps the current title on any error.

### Discard an empty new tree
- **ID:** `chat.ephemeral-discard`
- **Purpose:** A tree created with New Loom Tree is deleted if you leave it without sending a
  message, so empty trees don't pile up.
- **Where:** Dialogue screen, on navigating back.
- **Reach:** P2 → native back without sending.
- **Requires:** A tree opened with the `ephemeral` param, which only `trees.create` sets.
- **Selector:** none — triggered by the native back button or gesture; assert that the tree is absent from `trees-list`
- **Code:** `src/interface/components/chat/useDeleteEphemeralTreeOnBack.ts`
- **Backend:** WatermelonDB `loom_trees` via `WatermelonLoomTreeRepository#hardDelete`
- **Status:** live

### Dialogue settings (agent and tree system context)
- **ID:** `chat.dialogue-settings`
- **Purpose:** Shows this tree's agent (name, model, shared or private) and edits the
  tree-level system context, which is added after the agent's system prompt.
- **Where:** A page sheet from the Dialogue `···` menu ("Dialogue Settings").
- **Reach:** P2 → `chat-menu-button` → "Dialogue Settings".
- **Requires:** A tree.
- **Selector:** working — `dialogue-settings-sheet`, `dialogue-settings-done`, `dialogue-settings-system-context-input`, `dialogue-settings-system-context-save` (shown once edited), `dialogue-settings-error`; menu item none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/dialogue-settings/DialogueSettingsSheet.tsx`, `src/interface/components/chat/dialogue-settings/useDialogueSettingsController.ts`
- **Backend:** WatermelonDB `loom_trees` (system context) and `agents`, via `WatermelonLoomTreeRepository` and `WatermelonAgentRepository`
- **Status:** live

### Edit or fork this tree's agent
- **ID:** `chat.dialogue-settings.edit-agent`
- **Purpose:** Edits the tree's agent: model, name, temperature, max tokens and system prompt.
  A shared agent first asks whether to edit the shared agent or fork a private copy for this
  tree.
- **Where:** "Edit agent" in Dialogue Settings. A native alert offers the shared-or-fork
  choice, and then the sheet shows the Edit Agent sub-view.
- **Reach:** P2 → `chat-menu-button` → "Dialogue Settings" →
  `dialogue-settings-edit-agent` → (alert) → edit the fields →
  `dialogue-settings-edit-agent-save`.
- **Requires:** A tree with an agent.
- **Selector:** working — `dialogue-settings-edit-agent`, `dialogue-settings-back`, `dialogue-settings-edit-agent-save`, `dialogue-settings-edit-agent-error`, fields `dialogue-settings-edit-agent-name-input`, `-temperature`, `-max-tokens-input`, `-system-prompt-input`, model picker `dialogue-settings-edit-agent-model*` (as in `settings.agents.model-picker`); the shared-or-fork alert is native
- **Code:** `src/interface/components/chat/dialogue-settings/DialogueSettingsSheet.tsx#renderEditAgent`, `src/interface/components/chat/dialogue-settings/useDialogueSettingsController.ts`, `src/application/use-cases/ForkAgentForTreeUseCase.ts`, `src/application/use-cases/UpdateAgentConfigurationUseCase.ts`
- **Backend:** WatermelonDB `agents` (a fork sets `owner_tree_id`) and `loom_trees`
  (re-pointed agent)
- **Status:** live

### Switch this tree's agent
- **ID:** `chat.dialogue-settings.switch-agent`
- **Purpose:** Points the tree at another shared agent. The history is unchanged.
- **Where:** "Switch agent" in Dialogue Settings.
- **Reach:** P2 → `chat-menu-button` → "Dialogue Settings" →
  `dialogue-settings-switch-agent` → `dialogue-settings-switch-agent-row-<agentId>`.
- **Requires:** At least two shared agents. Otherwise it says "No other shared agents".
- **Selector:** working — `dialogue-settings-switch-agent`, rows `dialogue-settings-switch-agent-row-<agentId>`, `dialogue-settings-back`
- **Code:** `src/interface/components/chat/dialogue-settings/DialogueSettingsSheet.tsx#renderSwitchAgent`, `src/interface/components/chat/dialogue-settings/AgentCandidateList.tsx`, `src/application/use-cases/UpdateTreeDefaultAgentUseCase.ts`
- **Backend:** WatermelonDB `loom_trees` (default agent) via `WatermelonLoomTreeRepository`
- **Status:** live

### Tree without an agent
- **ID:** `chat.needs-agent`
- **Purpose:** A tree with no usable model agent (imported before any agent existed, its
  agent since deleted or archived, or a legacy agent on a provider the app can't route, such
  as `anthropic:` or `openai:`) still opens and reads normally. On open it adopts the user's
  default model agent, or else the first shared one it can use, if there is one. Otherwise the composer says the tree needs an
  agent to continue, with a button that opens Dialogue Settings to pick one.
- **Where:** In place of the composer input on the Dialogue screen, and at the top of
  Dialogue Settings.
- **Reach:** Cold start → import a tree before creating any agent (`trees.import`) →
  `trees-list-row-<treeId>` → `chat-needs-agent-choose` →
  `dialogue-settings-switch-agent-row-<agentId>`.
- **Requires:** A tree without a usable agent, and no default model agent to adopt.
- **Selector:** working — `chat-needs-agent` (the message), `chat-needs-agent-choose`, `dialogue-settings-needs-agent`, rows `dialogue-settings-switch-agent-row-<agentId>`
- **Code:** `src/application/services/resolve-tree-model-agent.ts`, `src/interface/components/chat/session-helpers.ts#initializeDialogueChatSession`, `src/interface/components/chat/session/session-model.ts`, `src/interface/components/chat/composer/NeedsAgentNotice.tsx`, `src/interface/components/chat/composer/can-submit-composer.ts`, `src/interface/components/chat/dialogue-settings/DialogueSettingsSheet.tsx#renderNeedsAgent`
- **Backend:** WatermelonDB `loom_trees` (default agent), `agents`, `user_preferences`
  (default agent)
- **Status:** live
- **Notes:** Editing a message still works, Save included (it generates nothing). Only
  OpenRouter and LM Studio agents count as usable. Regenerate and the rail's
  Generate wait for an agent. Coming back to the tree from creating an agent in Settings
  makes it adopt that agent.

### Tree tags
- **ID:** `chat.tags`
- **Purpose:** Toggles grove tags on this tree, or creates a new tag and assigns it.
- **Where:** A page sheet from the Dialogue `···` menu ("Tags").
- **Reach:** P2 → `chat-menu-button` → "Tags" → `tags-sheet-new-input` →
  `tags-sheet-new-add`. Toggle an existing tag with `tags-sheet-row-<tagId>`.
- **Requires:** A tree.
- **Selector:** working — `tags-sheet`, `tags-sheet-done`, `tags-sheet-new-input`, `tags-sheet-new-add`, `tags-sheet-list`, rows `tags-sheet-row-<tagId>`, `tags-sheet-empty`, `tags-sheet-error`; menu item none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/tags/TreeTagsSheet.tsx`
- **Backend:** WatermelonDB `tags` and `tag_assignments` via `WatermelonTagRepository`
- **Status:** live

### Export tree (Open Loom)
- **ID:** `chat.export-tree`
- **Purpose:** Exports the whole tree as an Open Loom JSON file and hands it to the OS share
  sheet.
- **Where:** "Export Tree (OpenLoom)" in the Dialogue `···` menu.
- **Reach:** P2 → `chat-menu-button` → "Export Tree (OpenLoom)" → share sheet.
- **Requires:** A tree, and sharing available on the device.
- **Selector:** none — native context menu item; reach via a tap on `chat-menu-button`; the share sheet is native
- **Code:** `src/application/use-cases/ExportLoomTreeUseCase.ts`, `src/application/services/open-loom/export-open-loom.ts`, `src/interface/services/loom-file-sharing.ts#shareTextAsFile`, `src/interface/components/chat/ChatHeaderMenu.tsx`, `src/interface/components/chat/header-actions/useTreeExports.ts`
- **Backend:** Reads WatermelonDB `loom_trees`, `nodes`, `edges`, `edge_sources`, `paths`. Writes
  a cache file (`expo-file-system`), then calls `expo-sharing`.
- **Status:** live
- **Notes:** Errors land in `chat-error`.

### Export path (Markdown)
- **ID:** `chat.export-path`
- **Purpose:** Exports the active path as a Markdown transcript through the share sheet.
- **Where:** "Export Path (Markdown)" in the Dialogue `···` menu.
- **Reach:** P2 → `chat-menu-button` → "Export Path (Markdown)" → share sheet.
- **Requires:** A tree with a loaded session.
- **Selector:** none — native context menu item; reach via a tap on `chat-menu-button`; the share sheet is native
- **Code:** `src/application/use-cases/ExportPathMarkdownUseCase.ts`, `src/application/services/open-loom/export-markdown.ts`, `src/interface/services/loom-file-sharing.ts#shareTextAsFile`, `src/interface/components/chat/header-actions/useTreeExports.ts`
- **Backend:** Reads WatermelonDB `paths`, `path_nodes`, `nodes`. Writes a cache file and calls
  `expo-sharing`.
- **Status:** live

## Node detail

### Node detail
- **ID:** `node.detail`
- **Purpose:** One node in full: its text (selectable, with Copy), its metadata (local id,
  author, created time, edited-from, flags, content hash) and, for model nodes, its generation
  info (provider, model, request id, latency, tokens).
- **Where:** Route `tree/[treeId]/node/[nodeId]`, a stack screen titled "Node <localId>".
- **Reach:** P2 → send once → long-press `chat-message-row-<nodeId>` → "Node Info". Or tap a
  continuation card, a search result (`search-results-row-<nodeId>`) or a bookmark's
  "Details".
- **Requires:** A node.
- **Selector:** working — `node-detail-screen`, `node-detail-content`, `node-detail-text`, `node-detail-copy`, `node-detail-generation`, `node-detail-error`, `node-detail-action-error`, `node-detail-not-found`
- **Code:** `src/interface/components/chat/node-detail/NodeDetailView.tsx`, `src/interface/components/chat/node-detail/useNodeDetailData.ts`, `src/app/tree/*/node/*.tsx`
- **Backend:** WatermelonDB `nodes`, `edges`, `raw_api_responses` via the Watermelon repositories
- **Status:** live

### Node actions menu
- **ID:** `node.menu`
- **Purpose:** From node detail: Make Current Node (returns to the dialogue), Edit (returns to
  the dialogue in edit mode), Copy Text, Bookmark / Remove Bookmark, Prune / Restore.
- **Where:** `···` at the right of the node detail header.
- **Reach:** Open `node.detail` → `node-detail-menu-button`.
- **Requires:** A loaded node. The button is hidden while loading.
- **Selector:** working — `node-detail-menu-button`; items none — native context menu item; reach via a tap on `node-detail-menu-button`
- **Code:** `src/app/tree/*/node/*.tsx`, `src/interface/components/chat/node-detail/NodeDetailView.tsx#buildDetailMenuItems`
- **Backend:** Make Current uses `SwitchDialoguePathUseCase` (`path_states`). Bookmark and
  Prune update `nodes` metadata via `WatermelonNodeRepository#updateMetadata`. Copy is
  client-only.
- **Status:** live

### Provenance verification
- **ID:** `node.provenance`
- **Purpose:** For a model node, re-verifies the hash chain against the stored raw API
  response and shows Verified or the failure reason, plus chain details (parent count, raw
  response id and hash, expected hash on a mismatch).
- **Where:** The PROVENANCE block at the bottom of node detail.
- **Reach:** P2 → send once → long-press the model `chat-message-row-<nodeId>` →
  "Node Info" → scroll `node-detail-content`.
- **Requires:** A model-authored node. The block is absent for human nodes.
- **Selector:** working — `node-detail-provenance`, `node-detail-provenance-status`
- **Code:** `src/application/services/provenance/verify-model-node-provenance.ts`, `src/application/services/content-hash-service.ts`, `src/interface/components/chat/node-detail/useNodeDetailData.ts`
- **Backend:** WatermelonDB `raw_api_responses`, `nodes` via `WatermelonRawApiResponseRepository` and `WatermelonNodeRepository`
- **Status:** live
- **Notes:** "Provenance as it stands": hash-chain verification only. There is no RFC 3161
  timestamping (cut).

## Settings

### Settings home
- **ID:** `settings.home`
- **Purpose:** Latent Spaces' one settings Form (`LoomSettingsView.swift`): links to
  Connections ("API Settings") and Agents ("New loom tree Settings"), then the User Interface
  settings, their live preview and Voice Mode, all edited in place.
- **Where:** Drawer → Settings, a nested stack with its own header and drawer button. A 34 pt
  "Settings" large title scrolls away and becomes the inline header title.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-settings`.
- **Requires:** none
- **Selector:** working — `settings-screen`, `settings-link-connections`, `settings-link-agents`
- **Code:** `src/interface/components/settings/SettingsHomeView.tsx`, `src/interface/components/settings/home/SettingsLinkSections.tsx`, `src/interface/components/settings/SettingsScreenScaffold.tsx`, `src/interface/components/drawer/DrawerScreenHeader.tsx`, `src/interface/ui/components/form/`, `src/app/(drawer)/settings/index.tsx`, `src/app/(drawer)/settings/_layout.tsx`
- **Backend:** none — client-only
- **Status:** live
- **Notes:** Its header is the drawer's JS header (`DrawerScreenHeader`), not the native
  stack header, so its hamburger matches Home, Loom Trees and Search. A native `headerLeft`
  gets a round Liquid Glass background on iOS 26, and react-native-screens 4.16 can't turn
  it off. The pushed sub-screens keep native headers with a system back button. The former
  sub-screens Message Typography, App Behavior and Voice Mode (routes `settings/typography`,
  `settings/behavior`, `settings/voice`) are now sections of this Form, so
  `settings-link-typography`, `settings-link-behavior`, `settings-link-voice`,
  `settings-typography-screen`, `settings-behavior-screen` and `settings-voice-screen` are gone.
### Agents library
- **ID:** `settings.agents`
- **Purpose:** Lists the shared model agents with their model and settings. Tap one to edit
  it, "Make Default" to pin it for new trees, "Delete" to remove it (after a native confirm),
  or "New Agent" to create one.
- **Where:** Settings → Agents.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-settings` →
  `settings-link-agents`.
- **Requires:** none. A fresh install shows "No agents yet. Create one to start weaving."
- **Selector:** working — `settings-agents-screen`, `settings-agents-list`, `settings-agents-new`, rows `settings-agents-row-<agentId>`, `settings-agents-row-make-default-<agentId>` and `settings-agents-row-delete-<agentId>` (nested, see the driving notes), `settings-agents-error`
- **Code:** `src/interface/components/settings/agents/AgentsSection.tsx`, `src/interface/components/settings/agents/AgentRow.tsx`, `src/interface/components/settings/agents/useAgentsLibraryController.ts`, `src/interface/components/settings/screens/AgentsSettingsScreen.tsx`, `src/app/(drawer)/settings/agents.tsx`, `src/application/use-cases/DeleteAgentUseCase.ts`
- **Backend:** WatermelonDB `agents` via `WatermelonAgentRepository#findSharedModels`;
  `user_preferences.default_model_agent_id` for the default
- **Status:** live

### Agent editor
- **ID:** `settings.agents.editor`
- **Purpose:** Creates or edits a shared agent: quick-start templates (create only), model,
  name, temperature, max tokens and system prompt.
- **Where:** A page sheet over Settings → Agents, titled "New Agent" or "Edit Agent"; also
  onboarding's "Customize Agent". A Form in a sheet: glass Cancel and Create/Save capsules
  either side of the title, the error pinned under the bar.
- **Reach:** `settings-link-agents` → `settings-agents-new`, or tap a
  `settings-agents-row-<agentId>`.
- **Requires:** none
- **Selector:** working — `agent-editor-sheet`, `agent-editor-cancel`, `agent-editor-submit`, `agent-editor-templates`, `agent-editor-template-<key>` (keys `claude-sonnet-balanced`, `claude-sonnet-creative`, `claude-haiku-fast`, `gpt-sol-balanced`), `agent-editor-name-input`, `agent-editor-temperature`, `agent-editor-max-tokens-input`, `agent-editor-system-prompt-input`, `agent-editor-error`
- **Code:** `src/interface/components/settings/agents/AgentEditorSheet.tsx`, `src/interface/components/settings/agents/editor/TemplateSection.tsx`, `src/interface/components/settings/agents/editor/GenerationSections.tsx`, `src/interface/components/settings/agents/editor/FormCheckRow.tsx`, `src/interface/components/settings/agents/agent-templates.ts`, `src/interface/components/settings/agents/useCreateAgentFromDraft.ts`, `src/interface/components/settings/agents/agent-draft-to-config.ts`, `src/interface/components/settings/agents/agent-editor-types.ts`, `src/application/use-cases/CreateSharedAgentUseCase.ts`, `src/application/use-cases/UpdateAgentConfigurationUseCase.ts`
- **Backend:** WatermelonDB `agents` via `WatermelonAgentRepository`
- **Status:** live
- **Notes:** Template keys come from `agent-templates.ts`. Templates are Form rows (name,
  then model id and temperature) with the gold checkmark in its own trailing column. Their
  model ids are OpenRouter `~…-latest` aliases. Validation errors show in
  `agent-editor-error`, pinned under the sheet's bar so they are always in view.

### Model picker
- **ID:** `settings.agents.model-picker`
- **Purpose:** Picks the provider (OpenRouter or LM Studio) and a model: from the cached,
  searchable OpenRouter catalog, from live LM Studio discovery, or by typing a custom
  OpenRouter id.
- **Where:** The Provider and Model sections of the agent editor (Form rows), and the MODEL
  block of Dialogue Settings → Edit agent and onboarding's LM Studio step (`ModelPickerField`).
- **Reach:** `settings-agents-new` → `agent-editor-model-provider-openrouter` →
  `agent-editor-model-search-input` → `agent-editor-model-option-<model id>`.
- **Requires:** OpenRouter: network for the catalog. LM Studio: a reachable endpoint (set in
  `settings.connections.lmstudio`).
- **Selector:** working — with prefix `agent-editor` (or `dialogue-settings-edit-agent`): `<prefix>-model`, `<prefix>-model-provider-openrouter`, `<prefix>-model-provider-lmstudio`, `<prefix>-model-search-input`, `<prefix>-model-refresh`, `<prefix>-model-option-<model id>`, `<prefix>-model-custom`, `<prefix>-model-selected`, `<prefix>-model-clear`, `<prefix>-model-error`
- **Code:** `src/interface/components/settings/agents/ModelPickerField.tsx`, `src/interface/components/settings/agents/editor/ModelSections.tsx`, `src/interface/components/settings/agents/editor/ModelSearchRow.tsx`, `src/interface/components/settings/agents/model-option-filter.ts`, `src/interface/components/settings/agents/useModelPickerData.ts`, `src/infrastructure/llm/OpenRouterModelCatalog.ts`, `src/infrastructure/llm/openrouter/catalog.ts`, `src/infrastructure/llm/lmstudio/models.ts`
- **Backend:** OpenRouter `GET https://openrouter.ai/api/v1/models` (cached for 24 h); LM
  Studio `GET <endpoint>/api/v1/models`
- **Status:** live
- **Notes:** Model ids contain `/` and `:`, so `<prefix>-model-option-<id>` ids do too. At most
  25 options render at once, so search to narrow. The OpenRouter search placeholder is
  "Search or paste a model id". A failed LM Studio discovery reads "LM Studio isn't
  answering…" in `<prefix>-model-error`, not the raw fetch error.

### OpenRouter connection
- **ID:** `settings.connections.openrouter`
- **Purpose:** Latent Spaces' API Keys page (`APIKeySettingsView.swift`) for OpenRouter: a
  card on how keys are kept, "Edit OpenRouter API Key" (a sheet with one secure field,
  Cancel and Save) and links to OpenRouter's key docs, keys and credits pages.
- **Where:** Settings → Connections, the top card and the OpenRouter section.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-settings` →
  `settings-link-connections` → `connections-openrouter-edit` →
  `connections-openrouter-key-input` → `connections-openrouter-key-save`.
- **Requires:** none
- **Selector:** working — `settings-connections-screen`, `connections-hero`, `connections-openrouter`, `connections-openrouter-edit`, `connections-openrouter-link-docs`, `connections-openrouter-link-keys`, `connections-openrouter-link-credits`, `connections-openrouter-key-sheet`, `connections-openrouter-key-input`, `connections-openrouter-key-cancel`, `connections-openrouter-key-save`, `settings-status-saving`, `settings-status-error`
- **Code:** `src/interface/components/settings/connections/ApiKeysHeroSection.tsx`, `src/interface/components/settings/connections/OpenRouterKeySection.tsx`, `src/interface/components/settings/connections/OpenRouterKeySheet.tsx`, `src/interface/components/settings/connections/useConnectionsController.ts`, `src/interface/components/settings/screens/ConnectionsSettingsScreen.tsx`, `src/infrastructure/security/ExpoSecureCredentialStore.ts`, `src/app/(drawer)/settings/connections.tsx`
- **Backend:** `expo-secure-store` (key `openrouter_api_key`), not WatermelonDB; the provider
  registry is reconfigured on save
- **Status:** live
- **Notes:** Save stores the key (about 450 ms later, or at once if the screen closes);
  Cancel or a swipe down discards the edit. Saving an empty field removes the key. The
  section footer says whether a key is stored. Settings has no show/hide button any more
  (`connections-openrouter-key-reveal` lives on in onboarding only), as Latent Spaces'
  SecureField has none. The links open Safari.
### Connections sheet
- **ID:** `settings.connections.sheet`
- **Purpose:** The Connections screen as a sheet over the current screen, so a missing key or
  an LM Studio server that is down can be fixed without leaving a tree.
- **Where:** Route `connections`, a modal page sheet with "Connections" and a Done capsule at
  the top.
- **Reach:** `home-setup-action` ("Add key"), `trees-setup-action` ("Add key") or
  `chat-error-action` ("Open Connections").
- **Requires:** none
- **Selector:** working — `connections-sheet`, `connections-sheet-done`, plus every selector of `settings.connections.openrouter` and `settings.connections.lmstudio`
- **Code:** `src/interface/components/settings/screens/ConnectionsSheetScreen.tsx`, `src/app/connections.tsx`
- **Backend:** As `settings.connections.openrouter` and `settings.connections.lmstudio`
- **Status:** live
- **Notes:** Swipe down also closes it.

### LM Studio connection
- **ID:** `settings.connections.lmstudio`
- **Purpose:** Sets the LM Studio server address and an optional API token, toggles model
  auto-load, and tests the connection.
- **Where:** Settings → Connections, the LM Studio section below OpenRouter (scroll down).
- **Reach:** `settings-link-connections` → `connections-lmstudio-endpoint-input` →
  `connections-lmstudio-test`.
- **Requires:** A reachable LM Studio server for "Connected". On the iOS Simulator,
  `localhost` is the Mac.
- **Selector:** working — `connections-lmstudio`, `connections-lmstudio-endpoint-input`, `connections-lmstudio-status-dot`, `connections-lmstudio-token-input`, `connections-lmstudio-token-reveal`, `connections-lmstudio-auto-load`, `connections-lmstudio-status`, `connections-lmstudio-test`, `connections-lmstudio-error`
- **Code:** `src/interface/components/settings/connections/LmStudioFormSection.tsx`, `src/interface/components/settings/connections/LmStudioConnectionSection.tsx`, `src/interface/components/settings/connections/connection-styles.ts`, `src/interface/components/settings/connections/useConnectionsController.ts`, `src/application/services/llm/describe-provider-error.ts`, `src/infrastructure/llm/LMStudioAdapter.ts`, `src/infrastructure/llm/lmstudio/`
- **Backend:** Test: LM Studio `GET <endpoint>/api/v1/models` (`LMStudioAdapter#fetchModels`).
  Settings go to WatermelonDB `user_preferences.lmstudio_settings`, and the token to
  `expo-secure-store`.
- **Status:** live
- **Notes:** In Settings the fields are Form rows (`LmStudioFormSection`); onboarding keeps
  `LmStudioConnectionSection` with the same ids. `connections-lmstudio-status` reads one of
  Untested, Checking…, Connected or Not reachable (onboarding prefixes "Status: "). When the
  test fails, the button reads "Test Again" and `connections-lmstudio-error` explains it in
  the footer: "LM Studio isn't answering at <address>. Start its local server, then try
  again.", plus a phone hint when the address is localhost. The Auto-load toggle is gold
  when on.

### Message typography
- **ID:** `settings.typography`
- **Purpose:** Sets the dialogue font (IBM Plex Mono, Cardo or Open Sans), the font size, the
  user-bubble style (Filled or Outlined) and the corner radius, with a live preview of four
  sample messages.
- **Where:** Settings, the "User Interface Settings" and "User Interface Preview" sections.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-settings` →
  `settings-typography-font` (scroll down).
- **Requires:** none
- **Selector:** working — `settings-typography-section`, `settings-typography-font`, `settings-typography-font-size`, `settings-typography-message-style`, `settings-typography-corner-radius`, `settings-typography-preview`
- **Code:** `src/interface/components/settings/appearance/UserInterfaceSection.tsx`, `src/interface/components/settings/appearance/interface-options.ts`, `src/interface/components/settings/appearance/InterfacePreviewSection.tsx`, `src/interface/components/settings/appearance/SampleNode.tsx`, `src/interface/components/settings/appearance/useAppearanceController.ts`, `src/interface/ui/components/form/FormPickerRow.tsx`, `src/interface/components/chat/useDialogueDisplayPreferences.ts`
- **Backend:** WatermelonDB `user_preferences` (`font_face`, `font_size`, `node_view_style`,
  `node_view_corner_radius`) via `WatermelonUserPreferencesRepository`
- **Status:** live
- **Notes:** The four rows are Latent Spaces' Pickers (`LoomSettingsView.swift:233-275`): a
  tap opens a native pull-down menu (react-native-context-menu-view) with the current value
  checked. Menu items are native and have no testIDs; tap their visible text ("Cardo",
  "Outlined", "20 (material design plebeian)"). Font size offers 12–26, corner radius 0–20 in
  steps of 2. The former per-option ids (`settings-typography-font-<face>`,
  `settings-typography-message-style-filled` / `-outlined`) are gone.
  A new install starts at size 17, as Latent Spaces does; Serif (Cardo) renders 1 pt above
  the chosen size.

### Auto-title setting
- **ID:** `settings.behavior.auto-title`
- **Purpose:** Turns the after-first-reply tree titling (`chat.auto-title`) on or off.
- **Where:** Settings → User Interface Settings, the "Auto-Title Conversations" toggle.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-settings` →
  `settings-behavior-auto-title` (scroll down).
- **Requires:** none
- **Selector:** working — `settings-behavior-auto-title`
- **Code:** `src/interface/components/settings/appearance/UserInterfaceSection.tsx`, `src/interface/components/settings/appearance/useAppearanceController.ts`, `src/interface/ui/components/form/FormToggleRow.tsx`
- **Backend:** WatermelonDB `user_preferences.auto_title_enabled`
- **Status:** live
### Verbose error alerts setting
- **ID:** `settings.behavior.verbose-errors`
- **Purpose:** A switch meant to show detailed provider failures in the UI.
- **Where:** Settings → User Interface Settings, the "Verbose Error Alerts" toggle.
- **Reach:** `drawer-nav-settings` → `settings-behavior-verbose-errors` (scroll down).
- **Requires:** none
- **Selector:** working — `settings-behavior-verbose-errors`
- **Code:** `src/interface/components/settings/appearance/UserInterfaceSection.tsx`, `src/interface/components/settings/appearance/useAppearanceController.ts`
- **Backend:** WatermelonDB `user_preferences.verbose_error_alerts`
- **Status:** placeholder — the switch persists, but nothing outside the settings code reads `verboseErrorAlerts` (grepped `src/` at `revision:`), so it changes no behavior yet
- **Notes:** Check this on the first walk. If a consumer appears, flip it to live.

### Voice Mode setting
- **ID:** `settings.voice`
- **Purpose:** Turns Voice Mode (beta) on or off, shows the current voice and opens the voice
  chooser. The footer explains double-tap to listen and tap to stop.
- **Where:** Settings, the "Voice Mode" section near the bottom.
- **Reach:** Cold start → `drawer-menu-button` → `drawer-nav-settings` →
  `settings-voice-mode-toggle` (scroll down).
- **Requires:** none
- **Selector:** working — `settings-voice-section`, `settings-voice-mode-toggle`, `settings-voice-current` ("Current voice: <name>"), `settings-voice-choose`, `settings-status-saving`, `settings-status-error`
- **Code:** `src/interface/components/settings/voice/VoiceModeSection.tsx`, `src/interface/components/settings/SettingsHomeView.tsx`, `src/interface/components/voice/VoiceModeProvider.tsx`, `src/interface/components/voice/useVoicePreferences.ts`, `src/interface/components/voice/useVoiceModeToggle.ts`, `src/infrastructure/persistence/watermelon/repositories/WatermelonVoicePreferencesRepository.ts`
- **Backend:** WatermelonDB `user_preferences.default_voice_mode_enabled` (on/off) and the
  WatermelonDB local key `aspen_grove.voice_mode.voice_name` (the voice), via
  `WatermelonVoicePreferencesRepository`
- **Status:** live
- **Notes:** Saves on each change (no debounce). The same on/off state drives the Dialogue
  `···` menu's "Voice Mode" item. Turning Voice Mode off stops any message being read at once.
  The default voice is Jefferson.

### Voice chooser
- **ID:** `settings.voice.chooser`
- **Purpose:** Picks the character voice (Lily, Jefferson, Eve). Swipe between voice cards;
  each card plays its sample line as it comes into view, a tap on the colored circle stops or
  replays it, and Select saves the voice shown.
- **Where:** A page sheet over Settings, with no visible title (as in Latent Spaces, whose
  `navigationTitle` has no navigation bar to show it in).
- **Reach:** `drawer-nav-settings` → `settings-voice-choose` → swipe `settings-voice-pager` →
  `settings-voice-select`.
- **Requires:** none. Sound needs media volume up.
- **Selector:** working — `settings-voice-chooser`, `settings-voice-pager`, `settings-voice-lily`, `settings-voice-jefferson`, `settings-voice-eve` (the circles; template `settings-voice-${voice.name.toLowerCase()}` in `VoiceCard.tsx`), `settings-voice-select`
- **Code:** `src/interface/components/settings/voice/VoiceChooserSheet.tsx`, `src/interface/components/settings/voice/VoiceCard.tsx`, `src/interface/components/settings/voice/useVoiceChooser.ts`, `src/interface/components/voice/voice-appearance.ts`, `src/domain/value-objects/loom-voice.ts`
- **Backend:** none for the demo (on-device `expo-speech`); Select writes the WatermelonDB local
  key `aspen_grove.voice_mode.voice_name`
- **Status:** live
- **Notes:** Opening the sheet plays the saved voice; closing it (swipe down) stops speech
  without saving. The pager is a native horizontal ScrollView, so drive it by swipe.

## Coverage
- `src/app/_layout.tsx` — root stack, providers and theme (the Startup gate references it); no feature of its own
- `src/app/(drawer)/_layout.tsx` — drawer navigator config; referenced by `nav.drawer`
- `src/app/(drawer)/settings/_layout.tsx` — settings stack headers; referenced by `settings.home`
- `./index.ts` — legacy root entry; `package.json` `main` is `src/entry.ts`
- `src/entry.ts` — app entry (registers expo-router)
- `src/interface/components/settings/index.ts` — barrel export
- `src/interface/components/settings/types.ts` — shared type
- `src/interface/components/settings/SettingsScreenScaffold.tsx` — shared settings shell (scroll, large title, keyboard toolbar, spinner)
- `src/interface/components/settings/SettingsStatus.tsx` — shared saving and error text (the settings-status testIDs)
- `src/interface/components/chat/ChatHeaderMenu.tsx` — the Dialogue `···` menu; the reach for the chat sheets and exports
- `src/interface/components/chat/types.ts` — chat row and preference types
- `src/interface/components/chat/route-params.ts` — route param parsing helper
- `src/interface/components/chat/provider-key.ts` — provider key lookup (SecureStore, then env)
- `src/interface/composition/index.ts` — barrel export
- `src/interface/hooks/useAspenGroveTheme.ts` — theme hook
- `src/interface/ui/` — design primitives and tokens (`AppText`, `AppInput`, `HeaderIconButton`, `MaterialView`, settings-list rows, and the Latent Spaces Form primitives in `src/interface/ui/components/form/`: `FormSection`, `FormRow`, `FormLabel`, `FormLinkRow`, `FormButtonRow`, `FormPickerRow`, `FormToggleRow`, `FormSliderRow`, `FormTextFieldRow`, `FormSheet`, `FormSheetHeader`); they forward `testID` to their host element
