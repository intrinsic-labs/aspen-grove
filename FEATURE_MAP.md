---
feature-map: 1
root: .
revision: f6e46af9e2234e74a52694f32cceb02771b490e0
reconciled: 2026-11-10
---
# Aspen Grove feature map

One entry per user-visible feature of the Aspen Grove mobile app (Expo / React Native, one
tree for iOS and Android): where it is on screen, how to reach it from a cold start, the
`testID` to drive it by, the code that owns it and what it reads or writes. The app has no
server. "Backend" means the LLM provider call (OpenRouter or LM Studio) or the on-device
WatermelonDB table and repository behind the feature. To start, sign in to and drive the app,
see [VERIFY.md](VERIFY.md).

**State of this map.** It was built from source, and every entry re-read against the code
at `revision:`. Every `working` selector was
confirmed by reading that its `testID` lands on a host element (`View`, `Pressable`, `Text`,
`TextInput`, `ScrollView`/`FlatList`/`SectionList`, `Switch`, `Slider`), directly or through a
wrapper that forwards it. **A first rendered simulator walk on 2026-11-10, at main
9b26e30, matched the map on every path walked**: onboarding skip, Connections, the agent
editor, trees menu → new tree, send, the parallel rail, the voice chooser lookup and the export
lookup. Paths not in that list are still read from code, not observed.

**Maintenance rule.** If you change a route, a screen or a feature, update its entry in the
same change: add entries for new features, remove entries for removed ones, and keep `testID`s
and their entries in step. Then run `npm run check:map` (the vendored checker in
`scripts/check-feature-map.py`, over `src/app/**/*.tsx`; CI fails on errors and unmapped routes).
`main` is squash-merged, so `revision:` must always name a commit already on `main`, never one
on your branch, and your change's own drift only warns. Drift from code that landed on `main`
after `revision:` fails CI (`scripts/check-feature-map-landed.py`): the next change re-reads
the entries it names and sets `revision:` to the merge-base it prints; `npm run
check:map:strict` then passes. Bump `reconciled:` only after a full walk of
every entry on a device or simulator.

**Scope.** v1 is branching dialogue, inline continuations, edit-as-branch, bookmarks,
provenance as it stands, Open Loom import and export, and OpenRouter and LM Studio as
providers. The cut features (sync, sharing or publishing, Field Guide, memory or stash, the
documents editor, RFC 3161 and other provenance extras, native Anthropic or OpenAI adapters,
MCP, connectors and web search) have no UI, route, setting or code in the app, so none is
mapped. Export uses the OS share sheet only to hand off the Open Loom file. That is the
in-scope export, not the cut "sharing" feature. The only leftovers are kept for stored data
and are not user-visible: the extra `Provider` values, and the ignored legacy keys
`useMcpTools` (LM Studio settings) and `docRead`/`docWrite` (agent permissions); see AGENTS.md.

**First-launch state and the two prerequisite paths.**

A fresh install, with no keys, no model agent and no trees, opens on **Home**
(`home-welcome`) and Home at once opens **onboarding** (`onboarding-screen`) over it, once:
six pages of Latent Spaces' introduction, then connect a model and land in a first tree. Startup creates the human owner
agent and a grove named "My Grove", but **no model agent**. Onboarding shows only while
`user_preferences.onboarding_completed_at` is unset and there is no shared model agent
(`src/application/services/onboarding/first-run.ts`); Begin Weaving sets the date, so an
install that finished, or one that already had an agent, stays on Home. A swipe down
skips it for that launch. After a skip,
Home shows a one-line setup hint with its action above its tree list
(`home-setup-hint` / `home-setup-action`):
"Set up" reopens onboarding on its setup page when there is no agent, "Add key" opens the Connections sheet
when the default agent is on OpenRouter and no key is stored. Two paths unlock everything
else, and the Reach lines below refer to them:

- **P1, create an agent:** the onboarding path (`onboarding-next` six times →
  `onboarding-openrouter-key` → paste a key into `connections-openrouter-key-input` →
  `connections-openrouter-key-save` → keep the preselected
  `onboarding-template-claude-sonnet-balanced` → `onboarding-begin`; or LM Studio, see
  `onboarding.connect`), which also lands in a tree (P2). From Settings instead: `home-settings-button` →
  `settings-link-agents` → `settings-agents-new` → pick a template
  (`agent-editor-template-*`), or a name and a model (`agent-editor-model` pushes the model
  browser: `agent-editor-model-option-<model id>` → `model-detail-use`; see
  `settings.agents.model-picker`) → `agent-editor-submit`. The first agent becomes the default. Generating replies also needs a
  key: the OpenRouter key in Connections, or a reachable LM Studio server. A build with
  `EXPO_PUBLIC_OPENROUTER_API_KEY` set falls back to that key (`provider-key.ts`).
- **P2, open a tree:** onboarding's `onboarding-begin` opens one.
  The first tree opened shows Getting Started over it (`onboarding.tree`); `tree-onboarding-begin`
  closes it. Otherwise, after P1: type
  a first message into Home's `home-composer-input` and tap `home-composer-send`. The tree
  is created, opens on the Dialogue screen (`chat-screen`) and sends that message, and the
  reply streams in (`home.composer`). Once a tree exists, `home-trees-row-<treeId>` on Home
  reopens it. Every pushed screen returns to Home with the native back button (`BackButton` on
  iOS; the back key on Android, see `.maestro/go-back.yaml`).

Startup does not seed a tree: `runStartupOrchestrator` can create a "First Loom Tree", but
`AppServicesProvider` calls it with `ensureDialogueSmokeTreeIfEmpty: false`. So "no trees"
stays until the user makes one.

**Driving notes (selectors).**

- Selectors are React Native `testID`s. On iOS they surface as `accessibilityIdentifier`
  (Detox `by.id`, Maestro `id:`). The map writes them bare, for example `chat-composer-input`.
- A few ids exist in code only as templates (`settings-voice-${name}`, and ids built from a
  `testIDPrefix` prop, such as `<prefix>-setup-hint` or `<prefix>-option-<id>`), so grepping
  for the literal id finds nothing. The entries name the
  template; search for its prefix.
- An id written like `home-trees-row-<treeId>` has a ULID or other runtime suffix. Find the
  static parent (`home-trees-list`) first, then the row by its visible text, or read ids from
  the database.
- **Native context-menu items have no testID** (`react-native-context-menu-view`). Long-press
  the trigger (for a message or a continuation card), or tap it for the `···` header menus,
  then pick the item by its visible title. Those entries say `none — native context menu
  item; reach via long-press on <testID>`.
- The header menu triggers (`home-menu-button`, the tree's sliders button `chat-menu-button`,
  `node-sheet-menu-button`, `tree-system-message-menu-button`,
  `tree-description-sheet-menu-button`) are Pressables with no `onPress` (`HeaderIconButton`,
  or a sheet's `GlassIconButton`), inside a native `ContextMenu` in `dropdownMenuMode`. A tap on
  them reaches the native view, which opens the menu.
- **Nested Pressables on iOS.** A `Pressable` is `accessible` by default. On iOS that can hide
  a nested Pressable's identifier from XCUITest-based drivers such as Maestro (Detox walks the
  view tree and is less affected). One place nests a Pressable this way:
  `settings-agents-row-make-default-<agentId>` / `settings-agents-row-delete-<agentId>`
  inside `settings-agents-row-<agentId>`. It was left as it is, because changing
  `accessible` would change VoiceOver behavior. If the inner id isn't found, tap its visible
  text ("Make Default", "Delete").
- Settings screens **autosave** about 450 ms after the last change. There is no Save button,
  except in the agent editor (`agent-editor-submit`, "Create" / "Save") and the OpenRouter key
  sheet (`connections-openrouter-key-save`), as in Latent Spaces.
  `settings-status-saving` shows while a save runs and `settings-status-error` shows if it
  fails.
- System dialogs (`Alert.alert`, `Alert.prompt`, the document picker, the share sheet) are
  native and have no testIDs; pick their buttons by title. On Android an alert with a text
  field is `TextPromptDialog` instead: `text-prompt`, `text-prompt-input`,
  `text-prompt-save`, `text-prompt-cancel`.

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
  repositories; the composition root also registers OpenRouter, LM Studio, Anthropic and OpenAI
  adapters (direct-provider UI is separate work). Schema v9 adds `user_preferences.onboarding_completed_at`, v10
  `user_preferences.tree_onboarding_completed_at`
- **Status:** live
- **Notes:** The gate wraps the root `Stack`, so no route mounts until bootstrap is `ready`.
  The smoke-tree seeding in the orchestrator is switched off (see the first-launch notes).

## Home and trees

### Home
- **ID:** `home.welcome`
- **Purpose:** Latent Spaces' one landing screen (`HomeScreenView.swift`): a greeting by the
  time of day and the date, every dialogue tree most recent first, and a composer whose first
  message starts a new tree. There is no drawer: what it reached lives behind the toolbar
  (`home.menu`, `home.settings-button`). On a first run it opens onboarding.
- **Where:** Route `index`, the root of the app's stack, under a transparent navigation bar
  with the `···` menu at the top left and the Settings button at the top right. Greeting in
  Cardo 36 ("Good Evening.\nWelcome to Aspen Grove.", or "Good Evening,\n<name>." once a
  display name other than the default "Human" is set; the welcome line shrinks a little to
  stay on one line), the date line ("Sun, November 08") with a time-of-day glyph in the
  mono face, the trees as one inset-grouped card, the composer floating at the bottom.
- **Reach:** Cold start, then swipe onboarding down on a fresh install. From any pushed screen,
  the native back button (`BackButton` on iOS, the back key on Android).
- **Requires:** none
- **Selector:** working — `home-welcome` (screen), `home-greeting`, `home-date`, `home-error`
- **Code:** `src/interface/components/home/HomeView.tsx`, `src/interface/components/home/DateHeader.tsx`, `src/interface/components/home/greeting.ts`, `src/interface/components/home/useDisplayName.ts`, `src/interface/components/home/HomeListHeader.tsx`, `src/interface/components/onboarding/useFirstRunRedirect.ts`, `src/app/index.tsx`, `src/app/_layout.tsx`
- **Backend:** WatermelonDB `user_preferences.display_name` via `WatermelonUserPreferencesRepository#get`; setup status as in `setup.hints`
- **Status:** live
- **Notes:** The greeting hours are Latent Spaces': "Good Early Morning" before 5,
  "Good Morning" to 12, "Good Afternoon" to 17, "Good Evening" after; the time is re-read when
  Home comes back into view. No screen sets `displayName` yet, so the nameless greeting shows.
  A tap on the greeting dismisses the keyboard. Errors from the list, import, rename or
  delete show in `home-error` above the list.

### Home toolbar menu
- **ID:** `home.menu`
- **Purpose:** Latent Spaces' home `···` menu (`HomeScreenView.swift:124-155`), plus Aspen
  Grove's Search and tag filter: Import OpenLoom Tree (a ControlGroup tile, icon over title), OpenLoom Docs, Info &
  Tutorials, Show Onboarding, then Search and Filter by Tag. In the buffer developer preview
  (`buffer.create`) a last section adds New Buffer.
- **Where:** Home, top left (`···`, the plain `ellipsis` in the toolbar's glass circle), a native pull-down menu.
- **Reach:** Cold start → `home-menu-button`, then the item by its title.
- **Requires:** none. "Filter by Tag" shows once the grove has a tag; "New Buffer" only in a
  build whose Metro bundle was made with `EXPO_PUBLIC_BUFFER_PREVIEW=1`.
- **Selector:** working — `home-menu-button`; items none — native context menu item; reach via a tap on `home-menu-button` ("Import OpenLoom Tree", "OpenLoom Docs", "Info & Tutorials", "Show Onboarding", "Search", "Filter by Tag", "New Buffer" in the preview)
- **Code:** `src/interface/components/home/HomeMenu.tsx`, `src/interface/components/home/home-menu.ts`, `src/interface/components/home/useHomeHeader.tsx`, `src/interface/components/home/home-links.ts`, `src/interface/components/buffer/buffer-preview-flag.ts`
- **Backend:** none — client-only (each item's own feature has its backend)
- **Status:** live
- **Notes:** OpenLoom Docs opens the Open Loom spec in the repository and Info & Tutorials
  the repository's README, in Safari (Latent Spaces links to its author's site). Show
  Onboarding opens `onboarding.first-run`. Search pushes `search.nodes`.

### Settings button
- **ID:** `home.settings-button`
- **Purpose:** Pushes Settings from Home, as Latent Spaces' `figure.wave.circle.fill`
  toolbar button does (`HomeScreenView.swift:157-163`).
- **Where:** Home, top right: a white disc with a waving figure.
- **Reach:** Cold start → `home-settings-button`.
- **Requires:** none
- **Selector:** working — `home-settings-button`
- **Code:** `src/interface/components/home/HomeSettingsButton.tsx`
- **Backend:** none — client-only
- **Status:** live

### Start a tree from Home's composer
- **ID:** `home.composer`
- **Purpose:** "Begin a new loom tree": the first message creates a tree with the default
  model agent, opens it and sends the message there through the tree's own send path, so the
  reply streams in with the thinking indicator and stop button. The tree takes the message's
  first four words as its title.
- **Where:** Home, a composer floating at the bottom (the tree chat's field: thin material,
  radius 20, green stroke while focused, send arrow only with text). It rides the keyboard.
- **Reach:** P1 → `home-composer-input` → type → `home-composer-send`.
- **Requires:** A model agent (P1). Without one, sending opens onboarding instead and keeps
  the text (`home/home-draft-store.ts`); once onboarding sets up a model, Begin Weaving moves
  it, unsent, into the first tree's composer and Home's composer is clear. Leaving that tree
  unsent discards it and puts the draft back on Home if Home's composer is empty
  (`chat/session/return-draft-to-home.ts`). Generating the reply needs a key or server, as `chat.composer`.
- **Selector:** working — `home-composer`, `home-composer-input`, `home-composer-send`, `home-composer-input-focus-stroke` (drawn only while focused)
- **Code:** `src/interface/components/home/HomeComposer.tsx`, `src/interface/components/home/home-draft-store.ts`, `src/interface/components/chat/session/return-draft-to-home.ts`, `src/interface/components/chat/composer/ComposerField.tsx`, `src/interface/components/chat/composer/ComposerSendButton.tsx`, `src/interface/components/chat/composer/composer-field-metrics.ts`, `src/interface/hooks/useCreateLoomTree.ts`, `src/interface/components/chat/turns/first-message-store.ts`, `src/interface/components/chat/turns/useSendFirstMessage.ts`, `src/interface/components/chat/turns/useSendTurn.ts#sendPrompt`, `src/application/use-cases/CreateDialogueLoomTreeUseCase.ts`, `src/application/services/resolve-default-model-agent.ts`
- **Backend:** WatermelonDB `loom_trees`, `nodes` (root), `paths`, `path_states`; reads `agents`
  and `user_preferences.default_model_agent_id`; then per-agent routing and secure-key
  lookup as `chat.composer` (OpenRouter, LM Studio, Anthropic or OpenAI)
- **Status:** live
- **Notes:** The field focuses itself once, when Home first appears after launch (not over
  onboarding), as Latent Spaces' does. The message waits in memory until the tree has loaded,
  then is sent; nothing is written before that. The tree opens `ephemeral`: if the message
  can't be saved (no key, say), it goes back into the tree's composer, and leaving without
  sending deletes the empty tree (`chat.ephemeral-discard`). A tree that loads without a
  usable agent keeps the message as its draft.

### Recent trees
- **ID:** `home.trees`
- **Purpose:** Every active dialogue tree in the grove (and, in the buffer developer preview,
  every buffer), most recent first (last message, else last edit), each with its title on one
  line and its date. Tap a row to open it.
- **Where:** Home, one inset-grouped card under the date line; the greeting and date stay put
  while the list scrolls.
- **Reach:** Cold start; rows appear once a tree exists (P2, or `trees.import`).
- **Requires:** none. With no trees the card is absent, as in Latent Spaces; once a tree can
  start (no setup hint showing) and no tag filters the list, one line above it says "No trees
  yet. Write a first message below to begin one." (`home-empty-hint`).
- **Selector:** working — `home-trees-list`, rows `home-trees-row-<treeId>`, `home-empty-hint`
- **Code:** `src/interface/components/home/TreeList.tsx`, `src/interface/components/home/HomeListHeader.tsx`, `src/interface/components/home/TreeRow.tsx`, `src/interface/components/home/useHomeTrees.ts`, `src/interface/components/home/tree-recency.ts`
- **Backend:** WatermelonDB `loom_trees` via `WatermelonLoomTreeRepository#findByGroveId`; `tags` via `WatermelonTagRepository#findTagsByGroveId`
- **Status:** live
- **Notes:** Reloaded each time Home comes into view. Buffer trees are filtered out unless
  the buffer preview is on, so a released build lists exactly the trees it always did. The title is in the mono face (JetBrains
  Mono standing in for Calling Code), the date is `Date.formatted()`'s "3/4/2025, 2:01 PM".

### Rename or delete a tree (swipe)
- **ID:** `home.trees-swipe`
- **Purpose:** Latent Spaces' swipe actions on a tree row (`HomeScreenView.swift:77-98`):
  swipe right for an orange "Edit Name", which asks for a new title in a "Loom Tree Name"
  alert; swipe left for a red Delete, which removes the tree with its nodes at once.
- **Where:** Home, on a tree row. One row is open at a time.
- **Reach:** A tree exists → swipe right on `home-trees-row-<treeId>` →
  `home-trees-rename-<treeId>` → type → "Save"; or swipe left →
  `home-trees-delete-<treeId>`.
- **Requires:** A tree.
- **Selector:** working — `home-trees-rename-<treeId>`, `home-trees-delete-<treeId>`; the rename alert is native (buttons "Save", "Cancel")
- **Code:** `src/interface/components/home/TreeRow.tsx`, `src/interface/components/home/TreeRowAction.tsx`, `src/interface/components/home/useTreeRowActions.ts`, `src/interface/components/chat/header-actions/tree-name-prompt.ts`, `src/interface/ui/components/text-prompt/`
- **Backend:** WatermelonDB `loom_trees` via `WatermelonLoomTreeRepository#update` (rename) and
  `#hardDelete` (delete: nodes, edges, paths and tree-owned agents too)
- **Status:** live
- **Notes:** Delete asks nothing first, as in Latent Spaces. Android has no alert with a
  text field, so it asks in `TextPromptDialog` (see the driving notes), as the tree's Edit
  Title does.

### Filter trees by tag
- **ID:** `trees.tag-filter`
- **Purpose:** Narrows Home's list to the trees carrying one tag. "All Trees", or the clear
  button by the tag's name, shows every tree again.
- **Where:** Home menu → "Filter by Tag" submenu (the active tag is checked); while a tag
  filters, its name sits above the card with a clear button.
- **Reach:** P2 → `chat-menu-button` → "Tags" → create a tag (see `chat.tags`) → back →
  `home-menu-button` → "Filter by Tag" → the tag's name.
- **Requires:** At least one tag in the grove; the submenu is hidden otherwise.
- **Selector:** working — `home-tag-filter`, `home-tag-filter-clear`; submenu items none — native context menu item; reach via a tap on `home-menu-button`
- **Code:** `src/interface/components/home/home-menu.ts`, `src/interface/components/home/useHomeTrees.ts`, `src/interface/components/home/HomeListHeader.tsx`
- **Backend:** WatermelonDB `tag_assignments` via `WatermelonTagRepository#findItemsByTag`
- **Status:** live

### Import a tree (Open Loom and loom formats)
- **ID:** `trees.import`
- **Purpose:** Picks a file and imports it as one or more dialogue trees. It accepts Open Loom
  v1 and v2, and the legacy MiniLoom, Socketteer Loom and Loomsidian formats, then reports
  what was imported.
- **Where:** The "Import OpenLoom Tree" item at the top of Home's `···` menu. The result
  appears in a native "Import complete" alert, and the tree in Home's list.
- **Reach:** Cold start → `home-menu-button` → "Import OpenLoom Tree" → OS document picker.
- **Requires:** A file on the device, simulator or Files app. No agent needed.
- **Selector:** none — native context menu item; reach via a tap on `home-menu-button`; the picker and the alert are native
- **Code:** `src/interface/components/home/useImportTree.ts`, `src/interface/services/loom-file-sharing.ts#pickAndReadTextFile`, `src/application/use-cases/ImportLoomTreeUseCase.ts`, `src/application/services/open-loom/import/`
- **Backend:** WatermelonDB `loom_trees`, `nodes`, `edges`, `edge_sources`, `paths`, `path_states`,
  and `agents` (one tree-owned "Imported · <model>" agent for model-authored nodes)
- **Status:** live
- **Notes:** Errors land in `home-error`. The format is sniffed from content
  (`detect.ts`), not from the file extension. Node roles map to `human`, `model` and
  `system` (`mixed` reads as human); system nodes render and send as system messages
  (`chat.dialogue`) and export back as `author.role: "system"`. The menu's glyph shows an
  hourglass while an import runs.

### Setup hints (no agent, no key)
- **ID:** `setup.hints`
- **Purpose:** Where a tree can't start yet, one line says what to do and the action sits
  under it: "Choose a model to start your first tree." with "Set up" (opens onboarding),
  or "Add your OpenRouter key to start a tree." with "Add key" (opens the Connections
  sheet).
- **Where:** Home, above the tree list.
- **Reach:** Fresh install → swipe onboarding down → Home shows `home-setup-hint`. For "no key":
  create an OpenRouter agent in Settings → Agents without storing a key.
- **Requires:** Not ready to start a tree: no model agent, or an OpenRouter default agent and
  no key. LM Studio reachability is not checked here; a server that is down is reported
  when generation fails (`chat.dialogue`).
- **Selector:** working — `home-setup-hint`, `home-setup-action`
- **Code:** `src/interface/components/setup/SetupHint.tsx`, `src/interface/components/setup/setup-hint-copy.ts`, `src/interface/hooks/useSetupStatus.ts`, `src/application/use-cases/GetSetupStatusUseCase.ts`, `src/application/services/onboarding/setup-status.ts`
- **Backend:** WatermelonDB `agents`, `user_preferences` (`default_model_agent_id`,
  `onboarding_completed_at`); `expo-secure-store` `openrouter_api_key` (read only)
- **Status:** live
- **Notes:** Re-read on every focus, so returning from onboarding or Connections updates it.

## Onboarding

### First-run onboarding
- **ID:** `onboarding.first-run`
- **Purpose:** Latent Spaces' first-launch sheet (`LoomOnboarding.swift`): the ASPEN GROVE
  wordmark over pages you swipe or step through with Next. Six pages are Latent Spaces'
  (three photos with a line each, then icon rows: weaving, keys, trees, help and links),
  with its words where they are true of Aspen Grove. A seventh connects a model
  (`onboarding.connect`), and Begin Weaving on it opens a first tree.
- **Where:** Route `onboarding`, a modal sheet over Home (#1C1C1E, no header, no page dots,
  no Skip). The wordmark in Cardo, the pager, then one capsule at the bottom: "Next"
  (bordered) on pages 1-6, "Begin Weaving" (gold) on page 7. The intro pages sit in Latent
  Spaces' 400 pt box; the setup page takes the whole height down to the button.
- **Reach:** Cold start of a fresh install (it opens by itself), `home-menu-button` →
  "Show Onboarding" (opens on page 1), or `home-setup-action` "Set up" and a send with no
  agent (both open `/onboarding?start=setup`, on page 7).
- **Requires:** none
- **Selector:** working — `onboarding-screen`, `onboarding-wordmark`, `onboarding-pager`, `onboarding-page-<n>` (1-7), `onboarding-next`, `onboarding-begin`, links `onboarding-link-openloom`, `onboarding-link-project`, `onboarding-link-issues`
- **Code:** `src/interface/components/onboarding/OnboardingView.tsx`, `src/interface/components/onboarding/OnboardingPager.tsx`, `src/interface/components/onboarding/useOnboardingPager.ts`, `src/interface/components/onboarding/useOpenOnPage.ts`, `src/interface/components/onboarding/OnboardingButton.tsx`, `src/interface/components/onboarding/onboarding-routes.ts`, `src/interface/components/onboarding/intro/`, `src/application/services/onboarding/first-run.ts`, `src/app/onboarding.tsx`, `assets/images/onboarding/`
- **Backend:** WatermelonDB `user_preferences.onboarding_completed_at` (set by Begin Weaving)
- **Status:** live
- **Notes:** To skip, swipe the sheet down (`.maestro/skip-onboarding.yaml`). As in Latent
  Spaces, that records nothing: Home shows the setup hint, and onboarding opens again on
  the next launch until Begin Weaving is tapped. It opens once per launch at most. The links
  open Safari. Photo credits are in `assets/images/onboarding/CREDITS.md`. Symbols are SF
  Symbols through `expo-symbols`.

### Onboarding: connect a model
- **ID:** `onboarding.connect`
- **Purpose:** Page 7. Choose OpenRouter (add a key, pick a model template) or LM Studio (a
  server address, a connection test, a model from the server), with the same storage as
  Settings → Connections. Begin Weaving then creates the agent (the first becomes the
  default), marks onboarding done and replaces onboarding with a new tree, whose composer
  holds whatever was typed on Home before setup (unsent). With nothing
  chosen yet, Begin Weaving marks onboarding done and closes it.
- **Where:** `onboarding` page 7, a Form filling the height between the wordmark and Begin
  Weaving, scrolling under soft top and bottom fades: Provider, then the OpenRouter key
  rows or the LM Studio server. The Model section (`onboarding-templates` or
  `onboarding-lmstudio-models`) appears only once a model can be picked: an OpenRouter key
  is saved (or the build's `EXPO_PUBLIC_` key), or LM Studio's test reads Connected.
- **Reach:** `onboarding-page-7` → OpenRouter: `onboarding-openrouter-key` → paste into
  `connections-openrouter-key-input` → `connections-openrouter-key-save` → (optionally
  `onboarding-template-<key>`) → `onboarding-begin`. LM Studio: `onboarding-provider-lmstudio`
  → `connections-lmstudio-endpoint-input` → `connections-lmstudio-test` →
  `onboarding-lmstudio-model-<model id>` → `onboarding-begin`.
- **Requires:** LM Studio: a reachable server to list models. When it isn't,
  `onboarding-lmstudio-model-error` says so, with `onboarding-lmstudio-model-refresh`.
- **Selector:** working — `onboarding-step-setup`, `onboarding-provider-openrouter`, `onboarding-provider-lmstudio`, `onboarding-openrouter`, `onboarding-openrouter-key`, `onboarding-openrouter-key-docs`, `onboarding-templates`, `onboarding-template-<key>`, `onboarding-lmstudio-models`, `onboarding-lmstudio-model-<model id>`, `onboarding-lmstudio-model-error`, `onboarding-lmstudio-model-refresh`, `onboarding-error`, plus the reused `connections-openrouter-key-input`, `connections-openrouter-key-save`, `connections-openrouter-key-cancel`, `connections-lmstudio-endpoint-input`, `connections-lmstudio-test`, `connections-lmstudio-status`, `connections-lmstudio-error`, `connections-lmstudio-error-details-toggle`, `connections-lmstudio-error-detail`, `connections-lmstudio-hint`, `connections-openrouter-key-sheet`
- **Code:** `src/interface/components/onboarding/setup/`, `src/interface/components/onboarding/onboarding-drafts.ts`, `src/application/services/model-agent-name.ts#readableModelName`, `src/interface/components/settings/agents/editor/ProviderSection.tsx`, `src/interface/components/settings/agents/editor/TemplateSection.tsx`, `src/interface/components/settings/connections/LmStudioFormSection.tsx`, `src/interface/components/settings/connections/LmStudioTestFailureFooter.tsx`, `src/interface/components/settings/connections/OpenRouterKeySheet.tsx`, `src/interface/components/settings/agents/agent-templates.ts`, `src/interface/components/settings/connections/useConnectionsController.ts`, `src/interface/components/settings/agents/useCreateAgentFromDraft.ts`, `src/interface/hooks/useCreateLoomTree.ts`
- **Backend:** As `settings.connections.openrouter` and `settings.connections.lmstudio`
  (secure store and `user_preferences.lmstudio_settings`); then WatermelonDB `agents`,
  `user_preferences` (`default_model_agent_id`, `onboarding_completed_at`) and the tree
  tables as in `home.composer`
- **Status:** live
- **Notes:** Agent customizing lives in Settings → Agents only. The LM Studio token and
  auto-load rows stay in Settings. Back from the new tree without sending discards it
  (`chat.ephemeral-discard`).

### Tree onboarding (Getting Started)
- **ID:** `onboarding.tree`
- **Purpose:** Latent Spaces' `LoomTreeOnboarding`: on the first tree opened, a sheet titled
  "Loom Trees" / "Getting Started" with three tips (nodes and their menu, the on-branch
  check, the [n] count) and Begin.
- **Where:** A page sheet over the Dialogue screen.
- **Reach:** Open any tree on an install that hasn't tapped Begin (P2), or `chat-menu-button`
  → "Show Onboarding".
- **Requires:** A tree.
- **Selector:** working — `tree-onboarding-sheet`, `tree-onboarding-begin`; menu item none — native context menu item; reach via a tap on `chat-menu-button` ("Show Onboarding")
- **Code:** `src/interface/components/onboarding/tree/`, `src/interface/components/chat/tree-menu/useTreeHeaderMenu.tsx`, `src/interface/components/chat/tree-menu/tree-menu.ts`, `src/interface/components/LoomTreeChatView.tsx`
- **Backend:** WatermelonDB `user_preferences.tree_onboarding_completed_at` (schema v10),
  set by Begin or a swipe down
- **Status:** live
- **Notes:** Swiping it down closes it for good, as Begin does (Latent Spaces records only
  Begin and shows a swiped sheet again on the next tree). It appears once the tree has slid in (the first tree replaces onboarding, and
  iOS won't present one sheet while another is going away), and it hides the tree from
  Maestro while open: wait for `chat-screen|tree-onboarding-begin`, then close it with
  `.maestro/dismiss-tree-onboarding.yaml`. The perf setup opens the imported tree once,
  untimed, to get it out of the way.

## Search

### Search node content
- **ID:** `search.nodes`
- **Purpose:** Full-text search across every tree's nodes, grouped by tree. Tap a result to
  open its tree on that node's Node Info sheet (`node.sheet`), or tap a tree header to open
  the tree. A result's snippet is plain text, its markdown marks stripped (`stripMarkdown`).
  Latent Spaces has no search.
- **Where:** Route `search`, pushed from Home's menu, with the native back button. The
  search bar is at the top.
- **Reach:** Cold start → `home-menu-button` → "Search" → type at least two
  characters into `search-input`.
- **Requires:** Nodes to search. When empty it prompts "Type at least two characters".
- **Selector:** working — `search-screen`, `search-input`, `search-clear-button`, `search-done-button`, `search-results-list`, tree headers `search-results-tree-<treeId>`, rows `search-results-row-<nodeId>`
- **Code:** `src/interface/components/SearchView.tsx#openResult`, `src/app/search.tsx`, `src/interface/components/chat/node-sheet/useRouteNodeSheet.ts`, `src/application/services/text/strip-markdown.ts`
- **Backend:** WatermelonDB `nodes` via `WatermelonNodeRepository#searchByContent` (limit 100);
  `loom_trees` for titles
- **Status:** live
- **Notes:** The query is debounced by 250 ms. Archived trees are dropped from results. A
  result pushes `tree/[treeId]` with a `nodeSheetId` param; the sheet opens once the tree has
  loaded.

## Dialogue

### Dialogue view
- **ID:** `chat.dialogue`
- **Purpose:** Shows the active path of a tree as a conversation: human bubbles on the right,
  model text in markdown on the left, system messages centered without a bubble at 0.6
  opacity (as Latent Spaces draws them), and a caption under each node for bookmarks,
  continuation count and pruned state.
- **Where:** Route `tree/[treeId]` (rendered by `TreeModeScreen`, which opens a buffer-mode
  tree as `buffer.editor` in the buffer developer preview and every other tree here), a full screen with a transparent header (title is the tree
  title, blank while it is still the placeholder; the tree menu's sliders button at the right). The first row starts 16 pt under the header
  (`loomUiTokens.messageList.topPadding`).
- **Reach:** P2, or `home-trees-row-<treeId>`.
- **Requires:** A tree. Sending also needs a model agent and a key or server (P1).
- **Selector:** working — `chat-screen`, `chat-message-list`, `chat-message-list-loading`, message rows `chat-message-row-<role>-<nodeId>` (role is `human`, `model` or `system`), `chat-streaming-message`, `chat-thinking-indicator`, a fenced code block `markdown-code-block-<language>` (e.g. `markdown-code-block-sh`), `chat-error`, `chat-error-action`, `chat-error-details-toggle`, `chat-error-detail`, `header-scroll-edge` (Android only)
- **Code:** `src/interface/components/LoomTreeChatView.tsx`, `src/interface/ui/components/header/HeaderScrollEdge.tsx`, `src/interface/components/chat/ThinkingIndicator.tsx`, `src/interface/components/chat/thinking-indicator-frames.ts`, `src/interface/components/chat/ChatMessageList.tsx`, `src/interface/components/chat/message-list/`, `src/interface/components/chat/message-list/SystemMessage.tsx`, `src/interface/components/chat/ChatErrorNotice.tsx`, `src/interface/components/chat/turns/useProviderErrorNotice.ts`, `src/application/services/llm/describe-provider-error.ts`, `src/application/services/llm/provider-error-copy.ts`, `src/application/services/llm/lmstudio-unreachable-copy.ts`, `src/interface/components/chat/useSavedLmStudioEndpoint.ts`, `src/interface/components/error-details/`, `src/interface/components/chat/useDialogueRouteParams.ts`, `src/interface/components/chat/MarkdownText.tsx`, `src/interface/components/chat/markdown/`, `src/interface/components/chat/message-type.ts`, `src/interface/components/chat/useLoomTreeChatController.ts`, `src/interface/components/chat/header-actions/useTreeHeaderActions.ts`, `src/interface/components/chat/turns/useChatTurns.ts`, `src/interface/components/chat/session/`, `src/interface/components/chat/session-helpers.ts`, `src/interface/components/chat/scroll/`, `src/interface/components/buffer/TreeModeScreen.tsx`, `src/app/tree/*.tsx`
- **Backend:** WatermelonDB `loom_trees`, `paths`, `path_nodes`, `path_states`, `nodes`, `edges`
  via the Watermelon repositories; per-agent routing accepts `openrouter:`, `lmstudio:`,
  `anthropic:` and `openai:` modelRefs. Credential and failure helpers accept all four.
- **Status:** live
- **Notes:** Messages scroll under the transparent header. On iOS 26 the bar's automatic
  scroll-edge effect fades them out under the title; Android has none, so
  `HeaderScrollEdge` paints black behind the bar and fades it out 24 pt below.
  Flow: `.maestro/mock/header-scroll.yaml` (messages under the header, then Home's).
  A reply's markdown (bold, italic and inline code wrapping mid-sentence as one run of text in
  a paragraph, a list item and a table cell; nested lists; a code block between paragraphs;
  a line wider than the screen scrolls sideways, as Latent Spaces' `CodeSnippetView` does):
  `.maestro/markdown.yaml`, on the imported `.maestro/fixtures/markdown-sample.openloom`.
  Emphasis, headings and table headers use the chosen message font's bundled faces,
  or native bold and italic for System; VT220 has no emphasis variants. Inline code and code blocks use JetBrains Mono.
  Tapping a message row opens that node's continuation rail
  (`chat.continuation-rail`). A long-press opens the message menu (`chat.message-menu`).
  With Voice Mode on, a double-tap reads the row aloud instead (`chat.read-aloud`).
  A long path mounts its last rows first and fills in the earlier ones once the screen has
  slid in, so a row far up the path can take a moment to exist in the hierarchy.
  The list's bottom padding follows the composer's measured height (and the keyboard's,
  while it is up), so the last line rests just above the composer; when a draft grows to
  several lines while the list is at its end, the list scrolls with it
  (`message-list/list-insets.ts`) so the last message stays visible. When the keyboard
  opens, it first takes the free space under a short tree's last message and moves the
  list only by what it would cover; a long tree's last line stays the same distance above
  the composer (`keyboardRestingOffset`, `message-list/useRestAboveKeyboard.ts`).
  A failed send or regenerate shows a plain message in `chat-error`. When the fix is in
  Connections (LM Studio not answering, no OpenRouter key, key refused),
  `chat-error-action` ("Open Connections") opens the Connections sheet over the tree. LM
  Studio not answering names the address saved in Connections, on a line of its own ("LM
  Studio isn't answering at this address:" / "http://localhost:1234" / "Start its local
  server…"; read each time the tree is focused). Other
  provider errors get one plain line by error code ("LM Studio returned an error.",
  "OpenRouter is limiting requests right now…"); the raw `[provider:code] message` is never
  on the face. When there is one, `chat-error-details-toggle` ("Details" / "Hide details")
  shows it in `chat-error-detail` (selectable), as Latent Spaces keeps the raw error out of
  its alert unless asked; with Verbose Error Alerts on (`settings.behavior.verbose-errors`)
  it starts shown.
  **Thinking indicator:** while a single send or regenerate is in flight (the same state
  that shows `chat-composer-stop`), `chat-thinking-indicator` sits leading-aligned under
  the last row and any streamed text: a 0 bouncing along five dots, stepping every 100 ms
  (Latent Spaces' `ThinkingIndicator`). It is static `•••••` when Reduce Motion is on.
  It also shows there while a parallel run has any card still running (an AG adaptation:
  Latent Spaces has no parallel run); the cards themselves have no thinking state, as
  Latent Spaces' rail cards have no loading state.
  **System messages:** a node with `authorType` `system` (an Open Loom node with
  `author.role: "system"`, or a Latent Spaces v1 `system` author, brought in by
  `trees.import`; the app has no control that writes one yet) renders centered in the
  message font at 0.6 opacity with no background, and its row is the same
  `chat-message-row-<role>-<nodeId>`. It goes to the model in place on the path with the `system`
  role; the agent prompt and tree context still go first, once
  (`src/application/services/context/assemble-dialogue-context.ts`). Editing one saves an
  edited system message. Export writes it back as `author.role: "system"`.

### Compose and send
- **ID:** `chat.composer`
- **Purpose:** Types a message and sends it. The model's reply streams in under it, and both
  are saved as nodes on the active path.
- **Where:** A sticky composer at the bottom of the Dialogue screen. The send button sits at
  the right of the input. Messages scroll on under the composer (its field's material blurs
  them), but an opaque band (`chat-composer-bottom-band`) fills everything below the field,
  down past the screen's edge and moving with the keyboard, so no message text shows under
  the field, keyboard up or down.
- **Reach:** P2 → `chat-composer-input` → `chat-composer-send`.
- **Requires:** A model agent whose provider is reachable: an OpenRouter key, or an LM Studio
  server at the configured endpoint; direct-provider agents require their key in secure storage.
- **Selector:** working — `chat-composer` (container), `chat-composer-input`, `chat-composer-send`, `chat-composer-stop`, `chat-composer-bottom-band`, `chat-composer-input-focus-stroke` (the green stroke, drawn only while the input is focused)
- **Code:** `src/interface/components/chat/ChatComposer.tsx`, `src/interface/components/chat/composer/ComposerField.tsx`, `src/interface/components/chat/composer/useRemeasureOnSetText.ts`, `src/interface/components/chat/composer/ComposerBottomBand.tsx`, `src/interface/ui/components/MaterialView.tsx`, `src/interface/ui/components/blur/`, `src/interface/components/chat/composer/ComposerSendButton.tsx`, `src/interface/components/chat/composer/composer-mode.ts`, `src/interface/components/chat/composer/composer-view.ts`, `src/interface/components/chat/turns/useSendTurn.ts`, `src/interface/components/chat/turns/useChatTurns.ts`, `src/interface/components/chat/turns/useStopGeneration.ts`, `src/interface/components/chat/turns/stopped-generation.ts`, `src/interface/components/chat/composer/useComposerDraft.ts`, `src/interface/components/chat/useStreamingAssistantRow.ts`, `src/application/use-cases/SendDialogueTurnUseCase.ts`, `src/application/services/llm/request-max-tokens.ts`, `src/infrastructure/llm/CatalogModelOutputLimits.ts`, `src/application/services/context/`, `src/infrastructure/llm/`
- **Backend:** OpenRouter `POST https://openrouter.ai/api/v1/chat/completions` (streaming) or
  LM Studio `POST <endpoint>/v1/chat/completions` (OpenAI-compatible), Anthropic
  `POST https://api.anthropic.com/v1/messages`, or OpenAI
  `POST https://api.openai.com/v1/responses`. Direct providers use the same raw-capture
  and Stop contract; their connection and picker UI is separate work. Writes WatermelonDB
  `nodes`, `edges`, `edge_sources`, `raw_api_responses`, `path_nodes` and `path_states`, and
  updates `loom_trees.last_message_at`.
- **Status:** live
- **Notes:** The field grows with its text up to five lines, text set from code included
  (an edit loading its message): `useRemeasureOnSetText` makes Fabric measure the input
  again after such a set, which it otherwise skips until the user types. The placeholder reads "Reply to <agent name>". The send button is hidden
  while the input is empty and shows a checkmark while editing (label "Save"). **Stop:**
  while a reply (or a regenerate) streams, the button is a stop circle,
  `chat-composer-stop` (Latent Spaces' `stop.circle.fill`); a tap cancels the request
  through the same `AbortSignal` a parallel card's stop uses. Text that already streamed is
  saved as the reply with no marker (Latent Spaces' `stopStreaming`, LLMManager.swift:45),
  exactly as a stopped parallel card is, and no error shows; a stop before any text keeps the user's message
  and saves no reply. Leaving the screen stops it too. Saving an edit streams nothing and
  shows a non-actionable `···` instead. The provider key is read from SecureStore first, then from
  the existing OpenRouter/LM Studio `EXPO_PUBLIC_*` env fallbacks
  (`src/interface/components/chat/provider-key.ts`). Direct-provider keys require secure storage. A missing
  OpenRouter key throws `MissingProviderKeyError`, shown as "Add your OpenRouter key in
  Connections to generate." with `chat-error-action`. The field is a thin material
  (`MaterialView`): on iOS the system thin material; on Android it blurs the screen's
  messages, which sit in a `BlurTarget` (`BlurTargetScope` in `LoomTreeChatView` and
  `HomeView`), through expo-blur's `blurTarget` on Android 12 and later; on older Android, or
  with no target, it is a flat dark overlay. A network, timeout or provider interruption after
  some text saves the partial reply with a `[stream interrupted: <reason>]` line and says so
  in `chat-error` (`turns/stopped-generation.ts`).

### Expanded composer
- **ID:** `chat.composer-expanded`
- **Purpose:** Full-screen draft editing for long messages. The draft is shared with the inline
  composer.
- **Where:** Route `tree/[treeId]/compose`, with no stack header. "Draft" and a collapse button
  sit at the top.
- **Reach:** P2 → type about 5 lines or more into `chat-composer-input` →
  `chat-composer-expand`.
- **Requires:** Enough text to overflow the collapsed input. The expand button is hidden
  otherwise.
- **Selector:** working — `chat-composer-expand`, `compose-screen`, `compose-input`, `compose-collapse`
- **Code:** `src/interface/components/chat/ExpandedDialogueComposerView.tsx`, `src/interface/components/chat/dialogue-draft-store.ts`, `src/app/tree/*/compose.tsx`
- **Backend:** none — client-only (an in-memory draft store)
- **Status:** live

### Message menu (copy, node info)
- **ID:** `chat.message-menu`
- **Purpose:** The long-press menu on a message, untitled and in Latent Spaces' order
  (NodeView.swift): [Regenerate Response · Continuations], Rewind To Node and Copy Text, a
  divider, Node Info and Bookmark / Remove Bookmark, then Aspen Grove's Edit and Prune /
  Restore after one more divider. Regenerate Response is on every node; Continuations is
  disabled on a node without children and Rewind To Node on the current (last) node.
- **Where:** A native context menu over the message bubble. Latent Spaces' first pair is a
  horizontal ControlGroup, icon above title, using the patched `preferredElementSize`. On Android each group is a menu group with a divider between
  groups (`patches/react-native-context-menu-view+1.21.0.patch`, API 28+).
  On iOS the message lifts as the menu's preview, kept between the tree's header and the
  room the menu needs under it: a message taller than that band shows its top at full size,
  cropped to the band with a short fade at the cut, and one reaching above the header moves down below it (the patched
  `previewTopInset` / `previewBottomInset` of react-native-context-menu-view).
- **Reach:** P2 → send once → long-press `chat-message-row-<role>-<nodeId>`.
- **Requires:** At least one message on the path.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<role>-<nodeId>`
- **Code:** `src/interface/components/chat/message-list/message-menu.ts#buildMessageMenu`, `src/interface/components/chat/message-list/MessageContextMenu.tsx`, `src/interface/components/chat/message-list/message-preview-bounds.ts`, `src/interface/components/chat/message-list/preview-area-context.ts`, `patches/react-native-context-menu-view+1.21.0.patch`, `src/interface/ui/components/native-menu-tree.ts`, `src/interface/ui/components/native-menu-platform.ts`, `src/interface/components/chat/node-actions/useMessageActions.ts#onMessageAction`, `src/interface/components/chat/node-actions/useChatNodeInteractions.ts`
- **Backend:** Copy Text: none — client-only (`expo-clipboard`). Node Info opens the node's
  sheet (`node.sheet`). The other items have their own entries below.
- **Status:** live
- **Notes:** Flows: `.maestro/mock/long-press-menus.yaml`, and
  `.maestro/mock/tall-reply-menu.yaml` for a reply taller than the screen (mock started with
  `--words 600`).

### Regenerate a response
- **ID:** `chat.regenerate`
- **Purpose:** On a model message, draws a new sibling response from the same context (both
  are kept as branches). On a human or system message, draws a reply under it, which is how a
  send that failed gets its reply.
- **Where:** "Regenerate Response" in any message's long-press menu.
- **Reach:** P2 → send once → long-press `chat-message-row-<role>-<nodeId>` → "Regenerate Response".
- **Requires:** A message, plus a reachable provider.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<role>-<nodeId>`
- **Code:** `src/interface/components/chat/turns/useRegenerateFromNode.ts`, `src/interface/components/chat/turns/useChatTurns.ts`, `src/interface/components/chat/turns/regenerate-plan.ts`, `src/interface/components/chat/turns/useStopGeneration.ts`, `src/application/use-cases/GenerateDialogueContinuationUseCase.ts`, `src/application/services/llm/request-max-tokens.ts`, `src/infrastructure/llm/CatalogModelOutputLimits.ts`, `src/application/services/create-verified-model-continuation-node.ts`
- **Backend:** The same per-agent provider call as `chat.composer` (including Anthropic Messages
  and OpenAI Responses). Uses discovered output limits without fetching on send. Writes `nodes`, `edges`,
  `raw_api_responses` and `path_states`.
- **Status:** live
- **Notes:** While it streams, `chat-composer-stop` stops it as it stops a send: streamed
  text is kept, unmarked, as the new sibling; a stop before
  any text saves nothing and the old response comes back.

### Edit as branch
- **ID:** `chat.edit-branch`
- **Purpose:** Edits a message. Saving creates an edited sibling node, so the original branch
  is kept, and the active path moves onto the edit.
- **Where:** The "Edit" item in a message's long-press menu, or in the Node Info sheet's `···`
  menu.
  An "Editing <localId>" banner appears above the composer.
- **Reach:** P2 → send once → long-press `chat-message-row-<role>-<nodeId>` → "Edit" → change text
  in `chat-composer-input` → `chat-composer-send` (Save). Cancel with
  `chat-composer-edit-cancel`.
- **Requires:** At least one message.
- **Selector:** working — `chat-composer-edit-banner`, `chat-composer-edit-cancel`, `chat-composer-input`, `chat-composer-send`; menu item none — native context menu item; reach via long-press on `chat-message-row-<role>-<nodeId>`
- **Code:** `src/interface/components/chat/composer/useEditNode.ts#startEditForNode`, `src/interface/components/chat/composer/useComposerFocus.ts#focusComposerAtEnd`, `src/interface/ui/components/native-menu-dismissal.ts`, `src/interface/components/chat/turns/useSendTurn.ts`, `src/application/use-cases/EditDialogueNodeUseCase.ts`
- **Backend:** WatermelonDB `nodes` (new node with `edited_from`, authored by the user; an
  edited system message stays `system`), `edges`, `path_nodes`, `path_states`. No provider
  call for any provider: saving an edit generates nothing (use `chat.regenerate` for a reply).
- **Status:** live
- **Notes:** Edit from the Node Info sheet closes the sheet, then starts the same flow once
  it has gone on iOS, straight away on Android (`useNodeSheet`). The composer takes focus,
  caret after the text, only once the menu Edit came from has finished closing (a focus
  taken while it closes is lost when the keyboard was down): the message and Node Info
  menus report `onMenuShow` / `onMenuDismiss` (added by
  `patches/react-native-context-menu-view+1.21.0.patch`) to `native-menu-dismissal.ts`.
  Checked with the keyboard down by `.maestro/mock/edit-keyboard-down.yaml`.

### Read a message aloud (Voice Mode)
- **ID:** `chat.read-aloud`
- **Purpose:** With Voice Mode on, reads messages aloud in the chosen character voice (Latent
  Spaces' voices): a double-tap on a message reads it, each new model response is read once it
  has finished generating, and a tap on any message while speech plays only stops it (it
  doesn't also open that row's rail). The message being read is
  drawn in its voice's color. Fenced code blocks are read as "You can see the code on this loom
  tree branch." The tree menu's "Voice Mode" item (checked when on) toggles Voice Mode app-wide.
- **Where:** Message rows on the Dialogue screen; "Voice Mode" in the tree menu (`chat.tree-menu`).
- **Reach:** P2 → `chat-menu-button` → "Voice Mode" (or `settings.voice`) → send once → wait
  for the reply to finish (it is read aloud) → double-tap `chat-message-row-<role>-<nodeId>` to hear
  it again → tap any row to stop.
- **Requires:** Voice Mode on, and at least one message. Sound needs the device's media volume
  up; it plays with the iOS silent switch on, as in Latent Spaces.
- **Selector:** working — `chat-message-row-<role>-<nodeId>` (double-tap, tap); menu item none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/read-aloud/useChatReadAloud.ts`, `src/interface/components/chat/read-aloud/useReadAloudTaps.ts`, `src/interface/components/chat/tree-menu/useTreeHeaderMenu.tsx`, `src/interface/components/voice/VoiceModeProvider.tsx`, `src/interface/components/voice/useReadAloudPlayback.ts`, `src/application/services/speech/ReadAloudService.ts`, `src/application/services/speech/prepare-speech-text.ts`, `src/application/services/speech/resolve-system-voice.ts`, `src/infrastructure/speech/ExpoSpeechSynthesizer.ts`, `src/application/services/speech/rank-persona-voices.ts`, `src/infrastructure/speech/android/SpeechAudioFocus.ts`, `modules/android-speech/android/src/main/java/expo/modules/androidspeech/AndroidSpeechModule.kt`
- **Backend:** none — on-device text-to-speech (`expo-speech`, audio session via `expo-audio`; AVSpeechSynthesizer on iOS,
  TextToSpeech on Android). Reads `nodes` for the finished response.
- **Status:** live
- **Notes:** With Voice Mode on, a single tap waits 320 ms (the double-tap window) before it
  opens the rail; with it off taps are immediate. Each voice uses its Latent Spaces iOS voice
  when installed, otherwise the best installed, offline voice in its language (en-GB, en-AU,
  en-IE): same name first, then the persona's Android voices (`LoomVoice.androidVoices`, by
  accent and gender), then quality; then one of its Android voices in a nearby accent; then
  the system default. Leaving the Dialogue screen stops speech. Parallel continuations are
  not read aloud. The first utterance sets the shared audio session to playback with
  duck-others (expo-audio, no microphone permission), so the silent switch doesn't mute it.
  On Android (Pixel 10 emulator, API 37) Google's TTS reads it: the local module
  `modules/android-speech` reports which voices are installed and offline, and holds
  transient may-duck audio focus while speaking, so other apps duck as on iOS; another app
  taking the focus for good (starting its own playback) stops the reading. There Lily
  reads as `en-au-x-aua-local`, Jefferson `en-gb-x-gbd-local`, Eve `en-gb-x-gbc-local` (no
  Irish voice).
  Flow: `.maestro/mock/voice-mode.yaml` (iOS and Android).

### Rewind to a node
- **ID:** `chat.rewind`
- **Purpose:** Makes an earlier node, or a node on another branch, the current one, so the
  active path is re-pointed through it.
- **Where:** "Rewind To Node" in the message menu or the Node Info sheet's menu. Also "Make
  Current Node" or "Retrace Branch" on a continuation card or in its sheet's menu (or a
  bookmark's sheet's menu), or a double-tap on a continuation card.
- **Reach:** P2 → send twice → long-press an earlier `chat-message-row-<role>-<nodeId>` →
  "Rewind To Node".
- **Requires:** More than one node.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<role>-<nodeId>`
- **Code:** `src/interface/components/chat/node-actions/useRewindToNode.ts`, `src/interface/components/chat/node-actions/useRetraceBranch.ts`, `src/application/services/resolve-branch-leaf.ts`, `src/application/use-cases/SwitchDialoguePathUseCase.ts`, `src/application/services/resolve-continuation-path.ts`
- **Backend:** WatermelonDB `path_states`, `path_nodes`, `path_selections` via `WatermelonPathRepository` and `WatermelonPathStateRepository`
- **Status:** live
- **Notes:** Retrace Branch makes current the end of the card's branch: along the active path
  while it runs through the card, then the newest continuation at each step (Aspen Grove keeps
  no per-node remembered child, which Latent Spaces follows).

### Inline continuation rail
- **ID:** `chat.continuation-rail`
- **Purpose:** Shows a node's continuations (its child branches) inline, as Latent Spaces
  does (ChildNodesView): the hint "Tap to expand. Double tap to make current node. Long press
  for more options.", then a horizontal row of tan cards, each captioned with its model ("User" or "System" for a person's or
  system node; a green check on the one the active path runs through) and `[n]`, then a divider. A card
  previews its node's text in up to 7 lines, as plain text with the markdown marks stripped
  (`stripMarkdown`; Latent Spaces' cards are plain `Text`, though they show the source; flow:
  `.maestro/markdown.yaml`). A tap opens
  the card's "Continuation Node" sheet (`node.sheet`), a double-tap makes it current, and a
  long-press gives Make Current Node and Retrace Branch, a divider, then Copy Text and
  Bookmark / Bookmarked. The generate control (`chat.parallel-continuations`) sits under the
  hint.
- **Where:** Directly under the tapped message, inside the message list. It scales in and out
  (0.3 s) and the list scrolls to center it when it opens. Its card row opens centered on
  the card the active path runs through (the one with the check; at the row's start or end
  when that card is first or last), or at the first card when none is, and does so on
  every opening, so a rail reopened after a branch switch shows the new current card. A run
  started from the open rail scrolls the row to its new cards and keeps it at its end while
  they lay out, until the reader drags the row or the run ends.
- **Reach:** P2 → send once → tap `chat-message-row-<role>-<nodeId>`, or long-press it and choose
  "Continuations". Tap the same row again to close the rail.
- **Requires:** A node. It shows "No continuations yet." until the node has children.
- **Selector:** working — `chat-continuation-rail`, `chat-continuation-rail-hint`, `chat-continuation-rail-list`, cards `chat-continuation-card-<nodeId>`, `chat-continuation-card-check`, `chat-continuation-rail-loading`, `chat-continuation-rail-empty`, `chat-continuation-rail-error`; card menu items none — native context menu item; reach via long-press on `chat-continuation-card-<nodeId>`
- **Code:** `src/interface/components/chat/ContinuationRail.tsx`, `src/interface/components/chat/ContinuationCardRow.tsx`, `src/interface/components/chat/useOpenOnCurrentCard.ts`, `src/interface/components/chat/useFollowNewRun.ts`, `src/interface/components/chat/rail-card-centering.ts`, `src/interface/components/chat/ContinuationCardShell.tsx`, `src/interface/components/chat/ContinuationCardCaption.tsx`, `src/interface/components/chat/SavedContinuationCard.tsx`, `src/interface/components/chat/continuation-menu.ts`, `src/interface/components/chat/useNodeContinuations.ts`, `src/application/services/text/strip-markdown.ts`, `src/interface/components/chat/node-actions/useContinuationGestures.ts#onContinuationSelect`, `src/interface/components/chat/message-list/rail-centering.ts`, `src/interface/components/chat/message-list/useContinuationRailReveal.ts`, `src/application/services/resolve-node-model-labels.ts`
- **Backend:** WatermelonDB `edges` and `nodes` via `WatermelonEdgeRepository` and `WatermelonNodeRepository`; the caption's model from `raw_api_responses` (`WatermelonRawApiResponseRepository#findModelIdentifiersByNodeIds`, no payload read), else the author agent's name
- **Status:** live
- **Notes:** A single tap waits 320 ms to rule out a double-tap, so a driver should wait about
  half a second before asserting on `node-sheet`. A double-tap needs two taps less than
  300 ms apart (`src/interface/components/chat/node-actions/double-tap.ts`). With Voice Mode on,
  a tap on a message row waits the same 320 ms before the rail opens. A card's long press
  only opens its menu (the pressable takes an empty `onLongPress`; without one, Android also
  fired the tap and opened the card's sheet over a menu choice).
  Flow: `.maestro/mock/rail-current-card.yaml` (the rail on the last of two cards, on the
  second of four, and on a new current card after a branch switch).

### Generate several continuations at once
- **ID:** `chat.parallel-continuations`
- **Purpose:** From any node, starts 1 to 4 continuations with one action. Each streams at the
  same time into its own card in that node's continuation rail, after the node's existing
  siblings. A card can be stopped on its own; one failing or being stopped doesn't stop the
  others. Each finished (or stopped-with-text) card is saved as a sibling model node with its
  own raw response and hash chain, and a double-tap on it makes it current like any sibling.
- **Where:** The control row under the rail's hint: `−` count `+` and "Generate N" (green, with the `cpu` symbol the tree menu's Model uses). While that node's cards stream it becomes "Stop all". Cards stream in
  the rail's card row.
- **Reach:** P2 → send once → tap a message row `chat-message-row-<role>-<nodeId>` (the rail opens) →
  `chat-continuation-count-increase` / `chat-continuation-count-decrease` →
  `chat-continuation-generate-button`. Stop one card with `chat-continuation-slot-stop-<slot>`,
  all with `chat-continuation-stop-all`. Choose a finished card by double-tapping its
  `chat-continuation-card-<nodeId>`. Driven end to end, failure and relaunch included, by
  `.maestro/mock/parallel-continuations.yaml`, and with LM Studio down (each card naming the
  saved address) by `.maestro/mock/parallel-lmstudio-down.yaml` (VERIFY.md). When a run
  settles and the rows reload, the list stays where it is (it follows its end only for a new
  last row, a load or a single send): `.maestro/mock/parallel-tall-reply.yaml`, above a reply
  taller than the screen.
- **Requires:** A model agent with a reachable provider (an OpenRouter key, or an LM Studio
  server). Generate is disabled while a single send or regenerate runs; send and regenerate
  wait while several stream.
- **Selector:** working — `chat-continuation-generate` (control row), `chat-continuation-count-decrease`, `chat-continuation-count-value`, `chat-continuation-count-increase`, `chat-continuation-generate-button`, `chat-continuation-stop-all`, cards `chat-continuation-slot-<slot>` (slot 0 to 3), card state `chat-continuation-slot-state-<slot>-<state>` (state is `pending`, `streaming`, `stopping`, `done`, `stopped`, `interrupted` or `failed`), `chat-continuation-slot-stop-<slot>`, `chat-continuation-slot-error-<slot>` (the plain line), `chat-continuation-slot-error-toggle-<slot>` (the failed card's pressable), `chat-continuation-slot-error-detail-<slot>` (shown once tapped); once saved, the card's pressable is `chat-continuation-card-<nodeId>`
- **Code:** `src/interface/components/chat/parallel/useParallelRail.ts`, `src/interface/components/chat/parallel/useParallelContinuations.ts`, `src/interface/components/chat/parallel/parallel-slots-state.ts`, `src/interface/components/chat/parallel/rail-cards.ts`, `src/interface/components/chat/parallel/slot-card-state.ts`, `src/interface/components/chat/parallel/useContinuationCount.ts`, `src/interface/components/chat/parallel/describe-slot-failure.ts`, `src/interface/components/chat/parallel/ContinuationGenerateControl.tsx`, `src/interface/components/chat/parallel/StreamingContinuationCard.tsx`, `src/application/services/text/strip-markdown.ts`, `src/interface/components/chat/parallel/FailedCardBody.tsx`, `src/interface/components/chat/parallel/continuation-rail-view.ts`, `src/interface/components/chat/useSavedLmStudioEndpoint.ts`, `src/application/services/llm/lmstudio-unreachable-copy.ts`, `src/application/use-cases/GenerateParallelContinuationsUseCase.ts`, `src/application/services/llm/request-max-tokens.ts`, `src/infrastructure/llm/CatalogModelOutputLimits.ts`, `src/application/services/dialogue-continuation/`, `src/infrastructure/persistence/watermelon/repositories/WatermelonContinuationCountPreferenceRepository.ts`
- **Backend:** N separate streaming requests to the provider call in `chat.composer` (OpenRouter,
  LM Studio, Anthropic or OpenAI), one independent abort controller per card, not a provider `n`. Writes WatermelonDB `nodes`, `edges`,
  `edge_sources` and `raw_api_responses` per saved card and touches
  `loom_trees.last_message_at`; the active path changes only when a card is made current. The
  count is remembered app-wide in WatermelonDB local storage
  (`aspen_grove.parallel_continuations.count`, default 1). Reads `user_preferences` for the
  saved LM Studio address, named on a failed card.
- **Status:** live
- **Notes:** A card's caption shows its state in brackets where a saved card has `[n]`, with
  its stop button beside it. Card states: `pending` (caption `[waiting]`, body "Waiting for the model…", request sent,
  no text yet), `streaming`, `stopping`, `done`, `stopped`, `interrupted
  (reason)` and `failed` (a plain line in the card's usual text, dimmed, with "Tap for
  details."; a tap shows the raw `[provider:code] message` under it, another hides it; with
  Verbose Error Alerts on it starts shown). A card's text, while it streams and once it
  settles, is plain text with its markdown marks stripped (`stripMarkdown`), as a saved card's
  preview is. Scrolled to its end, the rail shows the last card
  whole, with the same 16 pt margin after it as before the first (`.padding()` around
  `HStack(spacing: 22)`, ChildNodesView.swift:21-27); like Latent Spaces' it doesn't snap, so
  mid-scroll a card can rest partly off screen. Saving follows the single-generation
  convention: a stop after text saves the partial text as is (no marker, so the next turn
  doesn't send one to the model); a network, timeout or provider interruption after text saves
  it with a `[stream interrupted: <reason>]` line appended; a failure or stop before any text
  saves nothing. A finished run's cards stay while
  the rail shows that node; once the rail closes or moves, the saved ones show as ordinary
  sibling cards. Closing the rail, or making a card current (which closes it), leaves the
  others streaming; leaving the Dialogue screen stops them all. A saved card reloads the rail
  only while it is still open on the run's node: it never reopens a closed rail or replaces
  the node you moved to. When the run ends the rows reload against the session as it is then,
  so an agent switched mid-run stays switched. A failed card's error uses the same plain
  wording as a failed send (missing or rejected key, LM Studio not answering, otherwise one
  line by error code such as "LM Studio returned an error."). LM Studio gets N concurrent
  requests; a server that runs one prediction at a time queues them, so cards sit in
  `pending` and stream in turn. A stream waits up to 2 minutes for its first bytes (queueing
  included), then up to 60 s between chunks, however long it runs; a late card in a long
  queue can still end `failed` (timeout). To provoke a failure,
  point the tree's agent at a model id that doesn't exist (type it into the model browser's
  search and tap `agent-editor-model-custom` or `tree-model-custom`).
  Parallel continuations are not read aloud.

### Tree menu
- **ID:** `chat.tree-menu`
- **Purpose:** Latent Spaces' tree toolbar menu (ToolbarMenu.swift:31-102): Model and Voice
  Mode side by side (Voice Mode checked while on), Edit Title and Edit Description, the
  Bookmarks submenu between dividers once the tree has a bookmark, Export to OpenLoom Format,
  then Show Onboarding after a divider. After a last divider come Aspen Grove's own Tags and Export Path
  (Markdown). Model pushes the tree's Model Settings (`chat.model-settings`); Show Onboarding opens
  the tree's Getting Started sheet (`onboarding.tree`).
- **Where:** The sliders button (Latent Spaces' `slider.horizontal.3`) trailing the Dialogue
  screen's header.
- **Reach:** P2 → `chat-menu-button`.
- **Requires:** A tree.
- **Selector:** working — `chat-menu-button`; items none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/tree-menu/tree-menu.ts#buildTreeMenu`, `src/interface/components/chat/tree-menu/TreeToolbarMenu.tsx`, `src/interface/components/chat/tree-menu/useTreeHeaderMenu.tsx`, `src/interface/components/chat/tree-menu/useTreeMenuSheets.ts`, `src/interface/components/chat/tree-menu/useChatMenus.ts`, `src/interface/components/chat/header-actions/useTreeHeaderActions.ts`, `src/interface/ui/components/NativeTreeMenu.tsx`, `src/interface/ui/components/native-menu-tree.ts`, `src/interface/ui/components/native-menu-platform.ts`, `patches/react-native-context-menu-view+1.21.0.patch`
- **Backend:** none (each item's own entry)
- **Status:** live
- **Notes:** The side-by-side pair needs `preferredElementSize`, which
  `react-native-context-menu-view` lacks; `patches/react-native-context-menu-view+1.21.0.patch`
  adds it (iOS 16+). Show Onboarding replays the tree tips, as Latent Spaces' does (Home's
  menu opens the app onboarding). The same patch gives Android's module what upstream
  draws on iOS only: each inline section (and the ControlGroup) becomes a menu group with a
  divider before and after it (`Menu.setGroupDividerEnabled`, API 28+), a `selected` item is
  checked (Voice Mode while on; Android draws a checked box where iOS draws a checkmark),
  a submenu inside a submenu becomes a section (Android has one submenu level), and every
  press reports its full index path, as iOS does, so one menu tree serves both platforms.
  Android still has no side-by-side pair: Model and Voice Mode are two rows in their own
  section. Flows: `.maestro/mock/tree-menu.yaml` (helper `.maestro/open-tree-menu.yaml`),
  `.maestro/mock/menu-sections.yaml` (dividers and checks on every menu kind). The patch also
  reports `onMenuShow` and `onMenuDismiss` on both platforms, which `native-menu-dismissal.ts`
  uses to hold focus work until a menu has closed.

### Bookmark a node
- **ID:** `chat.bookmark`
- **Purpose:** Toggles a bookmark on a node. Bookmarked nodes show a bookmark glyph in their
  caption and are listed in the tree menu's Bookmarks (`chat.bookmarks`).
- **Where:** "Bookmark" / "Remove Bookmark" in the message menu; "Bookmark" / "Bookmarked" on
  a continuation card's menu or in a node sheet's menu. A bookmark's own sheet removes it
  with "Bookmarked" (`chat.bookmarks`).
- **Reach:** P2 → send once → long-press `chat-message-row-<role>-<nodeId>` → "Bookmark".
- **Requires:** A node.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<role>-<nodeId>`
- **Code:** `src/interface/components/chat/node-actions/useNodeActions.ts#toggleBookmark`, `src/interface/components/chat/useNodeContinuations.ts#toggleBookmark`
- **Backend:** WatermelonDB `nodes` metadata (`bookmarked`) via `WatermelonNodeRepository#updateMetadata`
- **Status:** live

### Bookmarks
- **ID:** `chat.bookmarks`
- **Purpose:** Latent Spaces' bookmarks (ToolbarMenu.swift:64-77, BookmarkSheet.swift): the
  tree menu's "Bookmarks" submenu lists this tree's bookmarked nodes, oldest first, each by
  its label or else its text (markdown marks stripped), with `sparkles` for a model node and `person.fill` for the
  user's. Choosing one opens its sheet: the label (or "Bookmarked Node") over a bookmark
  symbol and the node's model, the node's text, and a `···` menu with Rename Bookmark, then
  Make Current Node and Retrace Branch, then Copy Text and Bookmarked. Rename Bookmark asks
  in a "Rename Bookmark" alert ("Enter a new title for this bookmark"); Bookmarked removes the
  bookmark, clears its label and closes the sheet.
- **Where:** The tree menu (`chat.tree-menu`), between dividers, once the tree has a
  bookmark; the sheet is the node sheet (`node.sheet`) in its bookmark form.
- **Reach:** P2 → send once → bookmark a node (`chat.bookmark`) → `chat-menu-button` →
  "Bookmarks" → the bookmark by its title → `node-sheet-menu-button` → "Rename Bookmark".
- **Requires:** A bookmarked node; the submenu is absent until there is one.
- **Selector:** working — `node-sheet`, `node-sheet-title`, `node-sheet-bookmark` (the symbol), `node-sheet-menu-button`, `node-sheet-back`; submenu and menu items none — native context menu item; reach via a tap on `chat-menu-button` ("Bookmarks") or `node-sheet-menu-button`; the rename alert is native (`text-prompt-*` on Android)
- **Code:** `src/interface/components/chat/bookmarks/useTreeBookmarks.ts`, `src/application/services/text/strip-markdown.ts`, `src/interface/components/chat/tree-menu/tree-menu.ts`, `src/interface/components/chat/node-sheet/bookmark-menu.ts`, `src/interface/components/chat/node-sheet/NodeSheetKindHeader.tsx`, `src/interface/components/chat/node-sheet/useNodeSheet.ts#onBookmarkAction`, `src/interface/components/chat/node-actions/useNodeActions.ts#renameBookmark`, `src/interface/components/chat/tree-menu/useBookmarksRefreshKey.ts`
- **Backend:** WatermelonDB `nodes` via `WatermelonNodeRepository#findBookmarked` (the list)
  and `#updateMetadata` (`bookmarked`, `bookmark_label`); Make Current and Retrace use
  `SwitchDialoguePathUseCase` (`path_states`)
- **Status:** live
- **Notes:** Aspen Grove keeps no time a bookmark was added, so the list is in node creation
  order where Latent Spaces lists bookmarks in the order they were added. An empty rename
  clears the label. Under the text the sheet shows Aspen Grove's node details, as Node Info
  does.

### Prune or restore a node
- **ID:** `chat.prune`
- **Purpose:** Marks a node as pruned, which dims it and captions it "Pruned", or restores it.
- **Where:** "Prune" (destructive) / "Restore" in the message menu or the Node Info sheet's
  menu.
- **Reach:** P2 → send once → long-press `chat-message-row-<role>-<nodeId>` → "Prune".
- **Requires:** A node.
- **Selector:** none — native context menu item; reach via long-press on `chat-message-row-<role>-<nodeId>`
- **Code:** `src/interface/components/chat/node-actions/useNodeActions.ts#togglePrune`
- **Backend:** WatermelonDB `nodes` metadata (`pruned`) via `WatermelonNodeRepository#updateMetadata`
- **Status:** live

### Edit tree title
- **ID:** `chat.title-edit`
- **Purpose:** Renames the tree in Latent Spaces' "Loom Tree Name" alert with a text field,
  Cancel and Save (ToolbarMenu.swift:107-117). An empty name keeps the old one.
- **Where:** "Edit Title" in the tree menu (`chat.tree-menu`); a native alert.
- **Reach:** P2 → `chat-menu-button` → "Edit Title" → type → "Save".
- **Requires:** A tree.
- **Selector:** none — native context menu item; reach via a tap on `chat-menu-button`; the alert is native (buttons "Save", "Cancel"; `text-prompt-*` on Android)
- **Code:** `src/interface/components/chat/header-actions/useTreeTitle.ts`, `src/interface/components/chat/header-actions/useTreeHeaderActions.ts`, `src/interface/components/chat/header-actions/tree-name-prompt.ts`, `src/interface/ui/components/text-prompt/useTextPrompt.ts`, `src/interface/ui/components/text-prompt/TextPromptDialog.tsx`
- **Backend:** WatermelonDB `loom_trees.title` via `WatermelonLoomTreeRepository`
- **Status:** live
- **Notes:** iOS's `Alert.prompt` has no placeholder, so the empty field doesn't read
  "Name" there; Android's dialog does. An untitled tree opens the alert empty.
  The native iOS prompt focuses its field automatically; Android focuses from the dialog's
  `onShow`, after presentation.

### Edit tree description
- **ID:** `chat.description-edit`
- **Purpose:** Edits the tree's description in Latent Spaces' full-screen editor
  (ToolbarMenu.swift:118-131, FullScreenTextEditor.swift): "Loom Tree Description" inline,
  a `···` menu (Copy text, Clear text) leading and Save trailing, the text in the message
  font, focused as it opens, with a keyboard "Done". Save writes it and closes. A swipe
  down closes it when nothing changed; with an unsaved edit the sheet stays and asks
  "Discard changes?" (Keep Editing, Discard Changes), where Latent Spaces drops the edit
  silently.
- **Where:** "Edit Description" in the tree menu; a page sheet.
- **Reach:** P2 → `chat-menu-button` → "Edit Description" → type into
  `tree-description-sheet-input` → `tree-description-sheet-save`.
- **Requires:** A tree.
- **Selector:** working — `tree-description-sheet`, `tree-description-sheet-input`, `tree-description-sheet-save`, `tree-description-sheet-menu-button`, `keyboard-done`; menu items none — native context menu item; reach via a tap on `tree-description-sheet-menu-button`
- **Code:** `src/interface/components/chat/tree-description/useTreeDescription.ts`, `src/interface/ui/components/text-editor/TextEditorSheet.tsx`, `src/interface/ui/components/text-editor/text-editor-menu.ts`, `src/interface/ui/components/KeyboardDoneBar.tsx`, `src/interface/ui/components/sheet/`
- **Backend:** WatermelonDB `loom_trees.description` via `WatermelonLoomTreeRepository`
- **Status:** live
- **Notes:** `TextEditorSheet` focuses its input from `PageSheet.onShow`, after the slide-in
  animation, each time the sheet opens. The description shows nowhere else in the app yet;
  it pre-fills the export sheet, goes out with an Open Loom export and heads a Markdown export. Flow: `.maestro/mock/sheet-swipe.yaml`.

### Auto-title after the first reply
- **ID:** `chat.auto-title`
- **Purpose:** After the first model response, asks the tree's model for a short title and
  shows it in the header.
- **Where:** The Dialogue screen's native header title.
- **Reach:** P2 → send the first message → wait for the reply.
- **Requires:** "Auto-Title Conversations" on (`settings.behavior.auto-title`), plus a
  reachable provider.
- **Selector:** none — renders into the native stack header title, which has no testID; assert on the visible title text
- **Code:** `src/application/use-cases/GenerateTreeTitleUseCase.ts`, `src/application/use-cases/TitleTreeFromFirstMessageUseCase.ts`, `src/application/services/tree-title.ts`, `src/interface/components/chat/header-actions/useAutoTreeTitle.ts`, `src/interface/components/chat/header-actions/useFirstMessageTreeTitle.ts`, `src/interface/components/chat/header-actions/useTreeAutoTitles.ts`
- **Backend:** The same provider chat-completions call as `chat.composer`. Writes
  `loom_trees.title`.
- **Status:** live
- **Notes:** A new tree shows a blank header title until the first message. Sending it
  titles the tree with that message's first four words (plus "..." when longer), as Latent
  Spaces does, whether or not auto-title is on. Auto-title then replaces that provisional
  title, or a default one. It fails silently and keeps the current title on any error.

### Discard an empty new tree
- **ID:** `chat.ephemeral-discard`
- **Purpose:** A tree created from Home's composer or onboarding's Begin Weaving is deleted if
  you leave it before its first message is saved, so empty trees don't pile up. An unsent composer draft goes back to Home's
  composer when that is empty, so nothing typed is lost.
- **Where:** Dialogue screen, on navigating back.
- **Reach:** P1 through onboarding → `onboarding-begin` → `tree-onboarding-begin` → native
  back without sending.
- **Requires:** A tree opened with the `ephemeral` param, which `home.composer` and onboarding set.
- **Selector:** none — triggered by the native back button or gesture; assert that the tree is absent from `home-trees-list`
- **Code:** `src/interface/components/chat/useDeleteEphemeralTreeOnBack.ts`, `src/interface/components/chat/session/return-draft-to-home.ts`
- **Backend:** WatermelonDB `loom_trees` via `WatermelonLoomTreeRepository#hardDelete`
- **Status:** live

### Tree model settings
- **ID:** `chat.model-settings`
- **Purpose:** Latent Spaces' tree Model Settings (TreeModelSettingsView.swift): "Provider
  Options" with the Provider menu picker (OpenRouter, LM Studio) and Model, a footer with the
  model id in bold, its description and, for OpenRouter, its context length ("Context:
  128,000 tokens"); Stream Messages (on, disabled: the app always
  streams); Maximum Output Tokens with its slider (1 to the model's output limit; "Provider
  default", thumb at the limit, while the agent sets none and requests send no
  `max_tokens`) and "Always use maximum allowed"; Temperature, 0 to 1 in steps of 0.1; and System Message
  (`chat.model-settings.system-message`). Every change saves at once and reaches only this
  tree: the settings live on the tree's agent, and a shared one is forked first.
- **Where:** A page pushed from the tree menu's "Model", titled "Model Settings".
- **Reach:** P2 → `chat-menu-button` → "Model".
- **Requires:** A tree. Without a model agent the parameters are disabled until a model is
  chosen, and the footer says "Choose a model for this tree."
- **Selector:** working — `tree-model-screen`, `tree-model-provider` (menu row), `tree-model-model` (OpenRouter: pushes the list; LM Studio: a menu row), `tree-model-footer-id`, `tree-model-footer-description`, `tree-model-footer-context`, `tree-model-stream`, `tree-model-max-tokens-value`, `tree-model-max-tokens-slider`, `tree-model-use-max-tokens`, `tree-model-temperature-value`, `tree-model-temperature-slider`, `tree-model-system-message`, `tree-model-error`; Provider and LM Studio model menu items none — native context menu item; reach via a tap on `tree-model-provider` or `tree-model-model`
- **Code:** `src/interface/components/chat/tree-model/TreeModelSettingsScreen.tsx`, `src/interface/ui/components/form/FormLinkRow.tsx`, `src/interface/ui/components/form/FormLabel.tsx`, `src/interface/ui/components/SymbolIcon.tsx`, `src/interface/components/chat/tree-model/ProviderOptionsSection.tsx`, `src/interface/ui/components/form/FormPickerRow.tsx`, `src/interface/components/models/ProviderModelSection.tsx`, `src/interface/components/chat/tree-model/ParameterSections.tsx`, `src/interface/components/models/ModelFooter.tsx`, `src/interface/components/chat/tree-model/model-footer-content.ts`, `src/interface/components/models/DescriptionText.tsx`, `src/interface/components/models/description-segments.ts`, `src/interface/components/chat/tree-model/useTreeModelSettings.ts`, `src/interface/components/chat/tree-model/useTreeModelAgent.ts`, `src/interface/components/chat/tree-model/tree-model-values.ts`, `src/interface/components/chat/tree-model/max-tokens-display.ts`, `src/interface/components/models/model-max-tokens.ts`, `src/interface/components/chat/tree-model/model-choice.ts`, `src/interface/components/models/provider-default-model.ts`, `src/interface/components/chat/tree-model/tree-model-change-store.ts`, `src/interface/components/chat/tree-model/tree-model-routes.ts`, `src/interface/components/models/useModelPickerData.ts`, `src/interface/components/models/model-options.ts`, `src/application/use-cases/UpdateTreeModelSettingsUseCase.ts`, `src/application/services/model-agent-name.ts`, `src/app/tree/*/model/index.tsx`
- **Backend:** WatermelonDB `agents` (model, `configuration` temperature, `maxTokens`,
  `useMaxTokens`; a fork sets `owner_tree_id`) and `loom_trees` (`default_model_agent_id`),
  via `WatermelonAgentRepository` and `WatermelonLoomTreeRepository`; the OpenRouter
  catalog (`GET https://openrouter.ai/api/v1/models`, no key, cached 24 h) or LM Studio's
  `GET /api/v1/models`
- **Status:** live
- **Notes:** Per-tree settings on Aspen Grove's agents (`UpdateTreeModelSettingsUseCase`):
  the tree's own agent (owned by it, used by no other tree) is edited in place; a shared one
  (a library agent, or one another tree also uses) is copied first as a tree-owned agent,
  the tree is pointed at the copy and the copy is edited;
  a tree with no agent gets a new tree-owned one once a model is chosen. A copy keeps its
  source's name; choosing a different model names the tree's agent after the model (its
  OpenRouter or LM Studio display name, else the id's last segment: `model-agent-name.ts`),
  so the composer reads "Reply to <model>" as Latent Spaces' does. The tree's title is never
  part of an agent's name. Tree-owned agents
  don't show in Settings → Agents. A new provider switches to a model on it: the default
  agent's model when it is on that provider, else onboarding's first template for
  OpenRouter, else a loaded LM Studio model (never one listed but not loaded); an LM
  Studio that can't be reached leaves the
  tree as it was and says so in the footer. The output limit is Latent Spaces': OpenRouter's
  `top_provider.max_completion_tokens` (8192 when it names none, 4096 for a model not in
  the catalog; a custom id that names a catalog model in another case or as a routing
  variant takes that model's limit, `catalog-model-for-id.ts`), or LM Studio's context
  length. An agent with no output limit set shows "Provider default" in
  `tree-model-max-tokens-value`, with the slider's thumb at the model's maximum
  (`max-tokens-display.ts`); dragging sets one. Coming back to the tree re-reads its agent
  and system message. The Provider and LM Studio model menus (`FormPickerRow`) check the
  selected item on both platforms (a checked box on Android, through the patched context
  menu). Flows: `.maestro/mock/tree-model.yaml`, `.maestro/mock/menu-sections.yaml`.

  The System Message row uses LS's `scroll` SF Symbol on iOS, with a document icon fallback on Android.

### OpenRouter model browser (tree)
- **ID:** `chat.model-settings.openrouter-models`
- **Purpose:** OpenRouter's Model page (`.pickerStyle(.navigationLink)`) as Aspen Grove's
  model browser: every catalog model in one inset card, each row with the model's name, who
  made it, and its context and input/output price per million tokens in mono; a gold check
  on the tree's. The native search field in the bar narrows it by name, maker or id. A tap
  opens the model's page (`models.detail`), whose "Use This Model" chooses it. A search that
  matches no listed id offers "Use “<id>” as a model id" (`tree-model-custom`), for a model
  newer than the cached catalog. The same browser serves the agent editor
  (`settings.agents.model-picker`).
- **Where:** Pushed from Model Settings' Model row while the provider is OpenRouter; titled
  "Model".
- **Reach:** P2 → `chat-menu-button` → "Model" → (Provider: OpenRouter) → `tree-model-model`
  → `tree-model-option-<model id>`.
- **Requires:** The catalog: a network connection, or a cached copy.
- **Selector:** working — `tree-model-list-screen`, `tree-model-list`, rows `tree-model-option-<model id>`, `tree-model-custom`; the search field is the native header search bar (no testID; tap its "Search models" placeholder)
- **Code:** `src/interface/components/chat/tree-model/OpenRouterModelListScreen.tsx`, `src/interface/components/chat/tree-model/useTreeOpenRouterChoice.ts`, `src/interface/components/models/ModelBrowserList.tsx`, `src/interface/components/models/ModelBrowserRow.tsx`, `src/interface/components/models/browser-rows.ts`, `src/interface/components/models/model-option-filter.ts`, `src/interface/components/models/model-info-format.ts`, `src/interface/components/models/model-price-format.ts`, `src/app/tree/*/model/models.tsx`
- **Backend:** The OpenRouter catalog (as above); the choice through
  `UpdateTreeModelSettingsUseCase`
- **Status:** live
- **Notes:** Flow: `.maestro/mock/tree-model-browser.yaml`.

### Model page
- **ID:** `models.detail`
- **Purpose:** One OpenRouter model, with what openrouter.ai's page shows that helps choose
  it: its name (Cardo), who made it and its id; About (OpenRouter's description, which its
  list endpoint shortens); Limits (context, max output); Pricing (input and output per
  million tokens, image input and output and a per-request price when the model has them,
  "Varies" for a router); Modalities (input, output); Supported Parameters (mono chips);
  Details (the model an alias points to, the date OpenRouter added it, knowledge cutoff when
  known) and "View on OpenRouter" (opens `https://openrouter.ai/<id>`, or the aliased model's page, in the browser). "Use This
  Model", pinned at the bottom, chooses it and returns past the list ("Current Model" on the
  chosen one, which just returns).
- **Where:** Pushed from a row of the model browser: in a tree's Model Settings (route
  `tree/[treeId]/model/detail`, saves the tree's model) or inside the agent editor's sheet
  (route `agent-editor/detail`, sets the draft's model).
- **Reach:** `tree-model-option-<model id>` or `agent-editor-model-option-<model id>`.
- **Requires:** The catalog, cached or fetched.
- **Selector:** working — `model-detail-screen`, `model-detail-scroll`, `model-detail-title`, `model-detail-author`, `model-detail-description`, `model-detail-context`, `model-detail-max-output`, `model-detail-pricing`, `model-detail-parameters`, `model-detail-created`, `model-detail-link`, `model-detail-use`
- **Code:** `src/interface/components/models/ModelDetailView.tsx`, `src/interface/components/models/ScrollBottomFade.tsx`, `src/interface/components/models/ModelDetailHero.tsx`, `src/interface/components/models/ModelDetailSections.tsx`, `src/interface/components/models/ModelInfoRow.tsx`, `src/interface/components/models/ModelParameterChips.tsx`, `src/interface/components/models/useOpenRouterModel.ts`, `src/interface/components/models/model-info-format.ts`, `src/interface/components/models/model-price-format.ts`, `src/interface/components/chat/tree-model/TreeModelDetailScreen.tsx`, `src/interface/components/settings/agents/editor/AgentModelDetailScreen.tsx`, `src/application/services/llm/openrouter-catalog-model.ts`, `src/infrastructure/llm/openrouter/catalog-normalize.ts`, `src/app/tree/*/model/detail.tsx`, `src/app/agent-editor/detail.tsx`
- **Backend:** The cached OpenRouter catalog (`GET https://openrouter.ai/api/v1/models`, no
  key; WatermelonDB local key `openrouter_model_catalog_v3`, 24 h); the choice through
  `UpdateTreeModelSettingsUseCase` (tree) or the agent editor's save
- **Status:** live

### System message
- **ID:** `chat.model-settings.system-message`
- **Purpose:** Latent Spaces' full-screen editor titled "System Message"
  (FullScreenTextEditor.swift): the tree's system message in the loom font, focused as it
  opens, a `···` menu (Copy text, Clear text) trailing and a keyboard "Done". It
  saves as you type (after a short pause, and on leaving).
- **Where:** Pushed from Model Settings' "System Message".
- **Reach:** P2 → `chat-menu-button` → "Model" → `tree-model-system-message` → type into
  `tree-system-message-input`.
- **Requires:** A tree.
- **Selector:** working — `tree-system-message-screen`, `tree-system-message-input`, `tree-system-message-menu-button`, `keyboard-done`; menu items none — native context menu item; reach via a tap on `tree-system-message-menu-button`
- **Code:** `src/interface/components/chat/tree-model/SystemMessageScreen.tsx`, `src/interface/components/chat/tree-model/SystemMessageMenu.tsx`, `src/interface/components/chat/tree-model/useTreeSystemMessage.ts`, `src/app/tree/*/model/system-message.tsx`
- **Backend:** WatermelonDB `loom_trees.system_context` via `WatermelonLoomTreeRepository`
- **Status:** live
- **Notes:** This is the tree's system context: the text the export sheet's "Include System
  Message" writes out, sent to the model after the agent's own system prompt. Editing it
  never forks the agent. The input mounts with `autoFocus` once the saved text has loaded,
  so opening the editor requests the keyboard.

### Tree without an agent
- **ID:** `chat.needs-agent`
- **Purpose:** A tree with no usable model agent (imported before any agent existed, its
  agent since deleted or archived, or a legacy agent on a provider the app can't route, such
  as `anthropic:` or `openai:`) still opens and reads normally. On open it adopts the user's
  default model agent, or else the first shared one it can use, if there is one. Otherwise the composer says the tree needs an
  agent to continue, with a button that opens the tree's Model Settings to choose a model.
- **Where:** In place of the composer input on the Dialogue screen.
- **Reach:** Cold start → import a tree before creating any agent (`trees.import`) →
  `home-trees-row-<treeId>` → `chat-needs-agent-choose` → choose a model in Model Settings
  (`chat.model-settings`).
- **Requires:** A tree without a usable agent, and no default model agent to adopt.
- **Selector:** working — `chat-needs-agent` (the message), `chat-needs-agent-choose`, then `tree-model-*` (`chat.model-settings`)
- **Code:** `src/application/services/resolve-tree-model-agent.ts`, `src/interface/components/chat/session-helpers.ts#initializeDialogueChatSession`, `src/interface/components/chat/session/session-model.ts`, `src/interface/components/chat/composer/NeedsAgentNotice.tsx`, `src/interface/components/chat/composer/can-submit-composer.ts`
- **Backend:** WatermelonDB `loom_trees` (default agent), `agents`, `user_preferences`
  (default agent)
- **Status:** live
- **Notes:** Editing a message still works, Save included (it generates nothing). Only
  OpenRouter and LM Studio agents count as usable. The rail's Generate is
  disabled; Regenerate shows `chat-error` ("This tree needs an agent to continue. Choose one
  in Model Settings."). Coming back to the tree from creating an agent in Settings
  makes it adopt that agent.

### Tree tags
- **ID:** `chat.tags`
- **Purpose:** Toggles grove tags on this tree, or creates a new tag and assigns it.
- **Where:** A page sheet from the tree menu ("Tags", after its last divider).
- **Reach:** P2 → `chat-menu-button` → "Tags" → `tags-sheet-new-input` →
  `tags-sheet-new-add`. Toggle an existing tag with `tags-sheet-row-<tagId>`.
- **Requires:** A tree.
- **Selector:** working — `tags-sheet`, `tags-sheet-done`, `tags-sheet-new-input`, `tags-sheet-new-add`, `tags-sheet-list`, rows `tags-sheet-row-<tagId>`, `tags-sheet-empty`, `tags-sheet-error`; menu item none — native context menu item; reach via a tap on `chat-menu-button`
- **Code:** `src/interface/components/chat/tags/TreeTagsSheet.tsx`, `src/interface/ui/components/sheet/`
- **Backend:** WatermelonDB `tags` and `tag_assignments` via `WatermelonTagRepository`
- **Status:** live
- **Notes:** A swipe down closes it; with a new tag name typed and not added, it asks
  "Discard changes?" first, and Discard Changes clears the name, so the sheet reopens
  empty. Flow: `.maestro/mock/sheet-swipe.yaml`.

### Export tree (Open Loom)
- **ID:** `chat.export-tree`
- **Purpose:** Latent Spaces' Export Loom Tree sheet (OpenLoomExportSheet.swift): the hero (SF `tree` in the green circle; a Material tree on Android)
  ("Generate OpenLoom Tree", "Changes made here will not affect your saved loom tree."), the
  file's Title and Description, Include System Message and Include Bookmarks, and a link to
  the Open Loom docs. The share button closes the sheet and exports the whole tree as an
  Open Loom JSON file to the OS share sheet; the back button drops the edits.
- **Where:** "Export to OpenLoom Format" in the tree menu (`chat.tree-menu`); a page sheet.
- **Reach:** P2 → `chat-menu-button` → "Export to OpenLoom Format" →
  `export-sheet-share` → share sheet.
- **Requires:** A tree, and sharing available on the device.
- **Selector:** working — `export-sheet`, `export-sheet-back`, `export-sheet-share`, `export-sheet-title-input`, `export-sheet-description-input`, `export-sheet-include-system-message`, `export-sheet-include-bookmarks`, `export-sheet-docs`, `keyboard-done`; the share sheet is native
- **Code:** `src/interface/components/chat/export-sheet/OpenLoomExportSheet.tsx`, `src/interface/ui/components/sheet/PageSheet.tsx`, `src/interface/components/chat/export-sheet/ExportSheetHero.tsx`, `src/interface/components/chat/export-sheet/useOpenLoomExportSheet.ts`, `src/interface/components/chat/export-sheet/export-sheet-options.ts`, `src/application/use-cases/ExportLoomTreeUseCase.ts`, `src/application/services/open-loom/export-open-loom.ts`, `src/interface/services/loom-file-sharing.ts#shareTextAsFile`, `src/interface/components/chat/header-actions/useTreeExports.ts`
- **Backend:** Reads WatermelonDB `loom_trees`, `nodes`, `edges`, `edge_sources`, `agents`,
  `raw_api_responses`. Writes
  a cache file (`expo-file-system`), then calls `expo-sharing`. Nothing in the sheet is saved
  to the tree.
- **Status:** live
- **Notes:** Errors land in `chat-error`. An empty description is left out. Include System
  Message off drops the tree's system context, the agents' system prompts and the text of
  system-authored nodes (kept with empty text, so the hash chain holds) (Aspen Grove's
  counterpart of Latent Spaces' one system message); Include Bookmarks off drops bookmark
  flags and labels. The file goes to the share sheet, which offers Save to Files, where Latent
  Spaces opens the file exporter. The docs link opens the Open Loom spec in the repository,
  as Home's does. A swipe down closes it as the back button does, dropping its export-only
  choices without asking. Flow: `.maestro/mock/sheet-swipe.yaml`.

### Export path (Markdown)
- **ID:** `chat.export-path`
- **Purpose:** Exports the active path as a Markdown transcript through the share sheet.
- **Where:** "Export Path (Markdown)" in the tree menu, after its last divider (Aspen Grove
  only).
- **Reach:** P2 → `chat-menu-button` → "Export Path (Markdown)" → share sheet.
- **Requires:** A tree with a loaded session.
- **Selector:** none — native context menu item; reach via a tap on `chat-menu-button`; the share sheet is native
- **Code:** `src/application/use-cases/ExportPathMarkdownUseCase.ts`, `src/application/services/open-loom/export-markdown.ts`, `src/interface/services/loom-file-sharing.ts#shareTextAsFile`, `src/interface/components/chat/header-actions/useTreeExports.ts`, `src/interface/components/chat/tree-menu/useTreeHeaderMenu.tsx`
- **Backend:** Reads WatermelonDB `loom_trees`, `paths`, `path_nodes`, `nodes`, `agents`
  (speaker names; a system node is "System"). Writes a cache file and calls
  `expo-sharing`.
- **Status:** live

## Buffer

Buffer mode (continuous prose with branching, see `docs/architecture/specs/buffer-mode.md`) is
under construction and reachable only in the developer preview: bundle Metro with
`EXPO_PUBLIC_BUFFER_PREVIEW=1`. Without it nothing here exists and every tree opens as a
dialogue.

### New Buffer
- **ID:** `buffer.create`
- **Purpose:** Creates an empty buffer-mode tree from Home and opens it; it reopens from Recents
  like any tree. Unlike a dialogue tree it has no model agent.
- **Where:** Home's `···` menu, last section: New Buffer. Opens `tree/[treeId]`, which
  `TreeModeScreen` dispatches to the buffer screen by the tree's saved mode.
- **Reach:** Preview build, cold start → `home-menu-button` → "New Buffer"; or
  `home-trees-row-<treeId>` for an existing buffer.
- **Requires:** The buffer preview switch. No model agent, no key.
- **Selector:** working — `buffer-screen`; the menu item is native (title "New Buffer")
- **Code:** `src/application/use-cases/CreateBufferLoomTreeUseCase.ts`, `src/interface/hooks/useCreateBufferTree.ts`, `src/interface/components/buffer/TreeModeScreen.tsx`, `src/interface/components/buffer/BufferScreen.tsx`, `src/interface/components/buffer/buffer-preview-flag.ts`, `src/interface/components/home/home-menu.ts`, `src/interface/components/home/useHomeHeader.tsx`, `src/interface/composition/AppServicesProvider.tsx`
- **Backend:** WatermelonDB `nodes` (an empty human root), `loom_trees` (`mode: buffer`, no
  `default_model_agent_id`), `paths`, `path_nodes`, `path_states` (`mode: buffer`) via the
  Watermelon repositories
- **Status:** restricted (developer preview, off unless `EXPO_PUBLIC_BUFFER_PREVIEW=1`)
- **Notes:** Not ephemeral: an empty buffer stays in Recents. Titled "Untitled Buffer".
  Home lists buffer trees only in the preview. The dialogue chat adopts a default model agent
  on open, so `TreeModeScreen` never gives it a buffer tree.

### Buffer editor
- **ID:** `buffer.editor`
- **Purpose:** The writing surface of a buffer: one document in the reading face, human text in
  the usual foreground and model text in a muted blue, with text typed into a model passage
  reading as the human's. In the developer preview the text lives in memory only.
- **Where:** Route `tree/[treeId]` for a buffer-mode tree (`TreeModeScreen`), under the
  transparent header titled with the tree's title. A natively scrolling multiline input fills
  the screen; a band under it, above the keyboard and safe area, holds the floating branch pill
  (`buffer.siblings`) or, on an empty buffer, the fixture links: "Load sample", "Mode: spans|single|plain" (how the text is handed to the native input, for measuring) and "Load 5k/10k/20k/30k". The
  document ends where the band begins, so its last line always clears the pill. A tap on the
  empty band beside the pill puts the keyboard away (there is no Done bar: a keyboard accessory
  broke double-tap word selection).
- **Reach:** Preview build → `buffer.create` → tap `buffer-document` to type; `buffer-load-sample`
  fills the review sample (a human opening, two model endings, a human word inside model text).
- **Requires:** The buffer preview switch. No model, no key.
- **Selector:** working — `buffer-screen`, `buffer-document` (the input), `buffer-control-bar`, `buffer-load-sample`, `buffer-load-5k`, `buffer-load-10k`, `buffer-load-20k`, `buffer-load-stress` (the 30k one), `buffer-load-paragraphs` (the same 30k as real paragraphs), `buffer-variant`, `buffer-engine` (Android only: native input or the CodeMirror WebView; developer-preview speed experiment, default native), the last three only while the document is empty; on the web engine `buffer-document` is the editor's contenteditable and `buffer-web-editor` its WebView
- **Code:** `src/interface/components/buffer/BufferScreen.tsx`, `src/interface/components/buffer/BufferTextInput.tsx`, `src/interface/components/buffer/BufferFixtureLink.tsx`, `src/interface/components/buffer/BufferFixtureControls.tsx`, `src/interface/components/buffer/BufferEditorSurface.tsx`, `src/interface/components/buffer/android/BufferWebEditor.android.tsx`, `src/interface/components/buffer/android/BufferWebEditor.tsx`, `src/interface/components/buffer/android/buffer-web-editor-props.ts`, `src/interface/components/buffer/android/web-editor-protocol.ts`, `src/interface/components/buffer/android/web-editor-style.ts`, `src/interface/components/buffer/android/web-editor-html.generated.ts`, `tools/buffer-web-editor/main.ts` (page source; npm run build:buffer-editor regenerates the HTML), `src/interface/components/buffer/derive-replacement.ts`, `src/interface/components/buffer/text-boundaries.ts`, `src/interface/components/buffer/native-change-tracker.ts`, `src/interface/components/buffer/buffer-preview.ts`, `src/interface/components/buffer/buffer-preview-fixture.ts`, `src/interface/ui/value-objects/tokens/buffer.ts`, `src/interface/ui/value-objects/loom-ui-tokens.ts`
- **Backend:** none yet — in-memory review fixture; nothing typed is written to WatermelonDB
- **Status:** restricted (developer preview, off unless `EXPO_PUBLIC_BUFFER_PREVIEW=1`)
- **Notes:** The input's value is its children (colored `<Text>` runs); each native change is
  reported as a `{start, end, inserted}` replacement (`deriveReplacement`) against the last
  accepted string, using the observed selection to place repeated text and common ends for an
  autocorrect, widened to whole grapheme clusters so a surrogate pair or emoji is never split.
  `native-change-tracker` keeps that baseline synchronously, because native events outrun React
  renders (fast typing garbled the text before) and remembers the strings it sent so the
  re-rendered echo is not taken for an external change; iOS's double first character is ignored
  as a change equal to the baseline. A document loaded wholesale (not a sibling switch) remounts
  the input with its caret pinned to the start, so Android opens a long fixture at its top. The "Load Nk" links fill an N-character fixture
  (`stressPreview(length)`, the same text cut off at 5, 10, 20 or 30 thousand characters);
  the Mode link switches the render variant (`BufferRenderVariant`: colored runs, one uncolored
  child, or a bare string) to price the spans against the length. Visual decisions: `docs/architecture/specs/buffer-mode.md`. Flows:
  `.maestro/buffer-editor-preview.yaml`, `.maestro/buffer-editor-stress.yaml` (with
  `buffer-stress-scroll-edits.yaml`, Android only), `.maestro/buffer-editor-burst-setup.yaml` (`-e LOAD_ID`, `-e VARIANT_TAPS`, `-e RELEASE_BUILD`) +
  `buffer-editor-burst.yaml` (200-character burst for traces), `.maestro/dismiss-buffer-keyboard.yaml`.

### Branch control
- **ID:** `buffer.siblings`
- **Purpose:** Switches between alternative endings at the buffer's branch point: previous and
  next, a mono "Branch 1 of 2" label, a swipe on the label, and increment/decrement for
  screen readers. Switching replaces the ending and keeps the shared opening.
- **Where:** Buffer screen, a floating pill centered in the band under the document (never full
  width, a gap above the keyboard or bottom safe area), shown once the document has two or more
  endings (the preview sample has two).
- **Reach:** Preview build → `buffer.create` → `buffer-load-sample` → `buffer-branch-next`.
- **Requires:** The buffer preview switch; a buffer with siblings (the sample).
- **Selector:** working — `buffer-branch-control`, `buffer-branch-dots`, `buffer-branch-prev`, `buffer-branch-next`, `buffer-branch-value` (the label text)
- **Code:** `src/interface/components/buffer/BufferSiblingControl.tsx`, `src/interface/components/buffer/branch-dots.ts`, `src/interface/components/buffer/BufferScreen.tsx`, `src/interface/components/buffer/buffer-preview.ts`
- **Backend:** none yet — fixture siblings in memory
- **Status:** restricted (developer preview, off unless `EXPO_PUBLIC_BUFFER_PREVIEW=1`)
- **Notes:** Look (mockup `03-branches-pill`): a 36 pt pill in the raised dark fill with a soft
  shadow, gold chevrons (grey when there is no previous or next), a JetBrains Mono "Branch 1 of 3"
  label and one dot per sibling, the current one green, at most 7 dots (a window that follows
  the current sibling). The control is one adjustable accessibility element; its prev/next
  buttons are hidden from accessibility. Every value is in `tokens/buffer.ts`.

## Node sheet

### Node sheet (Node Info, Continuation Node)
- **ID:** `node.sheet`
- **Purpose:** One node in a page sheet, as Latent Spaces shows it: "Node Info" from a
  message's menu, "Continuation Node" from a continuation card, and a bookmark's sheet from
  the tree menu's Bookmarks (`chat.bookmarks`: its label, a bookmark symbol, no `[n]`). The toolbar has a glass back
  button, the title over the node's model (a green check on a continuation the active path
  runs through) and `[n]`, and a glass `···` menu. The body is the node's whole text in the
  message font, drawn as its message is in the tree (a model's reply as rendered markdown, a
  human or system message as typed, as Latent Spaces' sheets reuse its message view),
  selectable, and under it Aspen Grove's metadata (local id, author, created
  time, edited-from, flags, content hash) and, for model nodes, generation info (provider,
  model, request id, latency, tokens) and provenance (`node.provenance`).
- **Where:** A page sheet over the Dialogue screen.
- **Reach:** P2 → send once → long-press `chat-message-row-<role>-<nodeId>` → "Node Info". Or tap a
  continuation card `chat-continuation-card-<nodeId>` (Continuation Node), a search result
  (`search-results-row-<nodeId>`), or a bookmark in the tree menu's "Bookmarks".
- **Requires:** A node.
- **Selector:** working — `node-sheet`, `node-sheet-back`, `node-sheet-title`, `node-sheet-subtitle`, `node-sheet-check`, `node-sheet-bookmark`, `node-sheet-content`, `node-sheet-text`, `node-sheet-details`, `node-sheet-generation`, `node-sheet-loading`, `node-sheet-error`
- **Code:** `src/interface/components/chat/node-sheet/NodeSheet.tsx`, `src/interface/components/chat/node-sheet/NodeSheetText.tsx`, `src/interface/components/chat/node-sheet/NodeSheetHeader.tsx`, `src/interface/components/chat/node-sheet/NodeSheetKindHeader.tsx`, `src/interface/components/chat/node-sheet/node-sheet-target.ts`, `src/interface/components/chat/node-sheet/NodeSheetDetails.tsx`, `src/interface/components/chat/node-sheet/useNodeSheetData.ts`, `src/interface/components/chat/node-sheet/useNodeSheet.ts`, `src/interface/components/chat/node-sheet/node-branch-position.ts`, `src/interface/ui/components/GlassIconButton.tsx`, `src/interface/ui/components/sheet/PageSheet.tsx`
- **Backend:** WatermelonDB `nodes`, `edges`, `raw_api_responses`, `agents` via the Watermelon repositories
- **Status:** live
- **Notes:** `[n]` counts the node and those after it on the active path, or 1 off it, as the
  continuation cards do. Swipe down (the sheet follows the finger) or `node-sheet-back`
  closes it. Flow: `.maestro/mock/sheet-swipe.yaml`.

### Node sheet menu
- **ID:** `node.menu`
- **Purpose:** Node Info: Copy All Text, Rewind To Node (disabled on the current node),
  Bookmark / Bookmarked, then Aspen Grove's Edit and Prune / Restore after a divider.
  Continuation Node: the card's menu (Make Current Node, Retrace Branch, Copy Text, Bookmark /
  Bookmarked). A bookmark: Rename Bookmark, then the continuation's items; its Bookmarked
  removes the bookmark and closes the sheet (`chat.bookmarks`). Rewind, Make Current, Retrace and Node Info's Bookmark close the sheet, as in
  Latent Spaces; Edit closes it and starts the edit; Copy, Prune and the continuation's
  Bookmark leave it open and it reloads.
- **Where:** The glass `···` at the right of the sheet's toolbar.
- **Reach:** Open `node.sheet` → `node-sheet-menu-button`.
- **Requires:** A loaded node. The button is hidden while loading.
- **Selector:** working — `node-sheet-menu-button`; items none — native context menu item; reach via a tap on `node-sheet-menu-button`
- **Code:** `src/interface/components/chat/node-sheet/node-info-menu.ts#buildNodeInfoMenuSections`, `src/interface/components/chat/continuation-menu.ts#buildContinuationMenuSections`, `src/interface/components/chat/node-sheet/bookmark-menu.ts#buildBookmarkMenuSections`, `src/interface/components/chat/node-sheet/useNodeSheet.ts`
- **Backend:** Rewind, Make Current and Retrace use `SwitchDialoguePathUseCase` (`path_states`). Bookmark, Rename
  Bookmark and Prune update `nodes` metadata via `WatermelonNodeRepository#updateMetadata`. Copy is
  client-only.
- **Status:** live

### Provenance verification
- **ID:** `node.provenance`
- **Purpose:** For a model node, re-verifies the hash chain against the stored raw API
  response and shows Verified or the failure reason, plus chain details (parent count, raw
  response id and hash, expected hash on a mismatch).
- **Where:** The PROVENANCE block at the bottom of a node sheet.
- **Reach:** P2 → send once → long-press the model `chat-message-row-<role>-<nodeId>` →
  "Node Info" → scroll `node-sheet-content`.
- **Requires:** A model-authored node. The block is absent for human nodes.
- **Selector:** working — `node-sheet-provenance`, `node-sheet-provenance-status`
- **Code:** `src/application/services/provenance/verify-model-node-provenance.ts`, `src/application/services/content-hash-service.ts`, `src/interface/components/chat/node-sheet/useNodeSheetData.ts`, `src/interface/components/chat/node-sheet/provenance-status-label.ts`
- **Backend:** WatermelonDB `raw_api_responses`, `nodes` via `WatermelonRawApiResponseRepository` and `WatermelonNodeRepository`
- **Status:** live
- **Notes:** "Provenance as it stands": hash-chain verification only. There is no RFC 3161
  timestamping (cut).

## Settings

### Settings home
- **ID:** `settings.home`
- **Purpose:** Latent Spaces' one settings Form (`LoomSettingsView.swift`): links to
  Connections ("API Settings") and Agents ("New loom tree Settings"), then the User Interface
  settings, their live preview and Voice Mode, all edited in place, and last App Info
  (`settings.app-info`).
- **Where:** Route `settings`, pushed from Home, with the native back button. A 34 pt
  "Settings" large title scrolls away and becomes the inline header title.
- **Reach:** Cold start → `home-settings-button`.
- **Requires:** none
- **Selector:** working — `settings-screen`, `settings-link-connections`, `settings-link-agents`
- **Code:** `src/interface/components/settings/SettingsHomeView.tsx`, `src/interface/components/settings/home/SettingsLinkSections.tsx`, `src/interface/components/settings/SettingsScreenScaffold.tsx`, `src/interface/components/settings/settings-screen-options.ts`, `src/interface/ui/components/form/`, `src/app/settings/index.tsx`
- **Backend:** none — client-only
- **Status:** live
- **Notes:** Settings, Agents and Connections are screens of the root stack, each with the
  native header and back button (a Liquid Glass circle on iOS 26, as in Latent Spaces). The pushed sub-screens keep native headers with a system back button. The former
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
- **Reach:** Cold start → `home-settings-button` →
  `settings-link-agents`.
- **Requires:** none. A fresh install shows "No agents yet. Create one to start weaving."
- **Selector:** working — `settings-agents-screen`, `settings-agents-list`, `settings-agents-new`, rows `settings-agents-row-<agentId>`, `settings-agents-row-make-default-<agentId>` and `settings-agents-row-delete-<agentId>` (nested, see the driving notes), `settings-agents-error`
- **Code:** `src/interface/components/settings/agents/AgentsSection.tsx`, `src/interface/components/settings/agents/AgentRow.tsx`, `src/interface/components/settings/agents/useAgentsLibraryController.ts`, `src/interface/components/settings/screens/AgentsSettingsScreen.tsx`, `src/app/settings/agents.tsx`, `src/application/use-cases/DeleteAgentUseCase.ts`
- **Backend:** WatermelonDB `agents` via `WatermelonAgentRepository#findSharedModels`;
  `user_preferences.default_model_agent_id` for the default
- **Status:** live

### Agent editor
- **ID:** `settings.agents.editor`
- **Purpose:** Creates or edits a shared agent: quick-start templates (create only), name,
  Provider and Model, temperature, max tokens and system prompt.
- **Where:** A page sheet over Settings → Agents (route `agent-editor`, a modal with its own
  stack), titled "New Agent" or "Edit Agent". A Form in a sheet: glass Cancel and
  Create/Save capsules either side of the title, the error pinned under the bar. The model
  browser and a model's page push inside the sheet. On Android the route is a full-screen
  screen, not a sheet; `FormSheetHeader` keeps its bar below the status bar
  (`useSheetBarTopInset`), so Cancel and Create/Save are reachable. The pushed pages' native
  headers handle the status bar themselves.
- **Reach:** `settings-link-agents` → `settings-agents-new`, or tap a
  `settings-agents-row-<agentId>`.
- **Requires:** none
- **Selector:** working — `agent-editor-sheet`, `agent-editor-cancel`, `agent-editor-submit`, `agent-editor-templates`, `agent-editor-template-<key>` (keys `claude-sonnet-balanced`, `claude-sonnet-creative`, `claude-haiku-fast`, `gpt-sol-balanced`), `agent-editor-name-input`, `agent-editor-provider`, `agent-editor-model`, `agent-editor-footer-id`, `agent-editor-footer-description`, `agent-editor-model-error`, `agent-editor-temperature`, `agent-editor-max-tokens-input`, `agent-editor-system-prompt-input`, `agent-editor-error`
- **Code:** `src/interface/components/settings/agents/editor/AgentEditorStack.tsx`, `src/interface/components/settings/agents/editor/AgentEditorScreen.tsx`, `src/interface/components/settings/agents/editor/useAgentEditorState.ts`, `src/interface/components/settings/agents/editor/agent-editor-context.ts`, `src/interface/components/settings/agents/editor/agent-editor-routes.ts`, `src/interface/components/settings/agents/editor/AgentModelSection.tsx`, `src/interface/components/settings/agents/editor/TemplateSection.tsx`, `src/interface/components/settings/agents/editor/GenerationSections.tsx`, `src/interface/components/settings/agents/editor/useAgentModelSelection.ts`, `src/interface/components/settings/agents/editor/useHoldMaxTokensToModel.ts`, `src/interface/components/models/catalog-model-for-id.ts`, `src/interface/ui/components/keyboard/SheetScrollView.tsx`, `src/interface/ui/components/keyboard/useRevealFocusedField.ts`, `src/interface/ui/components/keyboard/reveal-offset.ts`, `src/interface/components/settings/agents/agent-draft-max-tokens.ts`, `src/interface/components/models/model-max-tokens.ts`, `src/interface/components/settings/agents/editor/FormCheckRow.tsx`, `src/interface/components/settings/agents/agent-templates.ts`, `src/interface/components/settings/agents/agent-draft-from-agent.ts`, `src/interface/components/settings/agents/useCreateAgentFromDraft.ts`, `src/interface/components/settings/agents/agent-draft-to-config.ts`, `src/interface/components/settings/agents/agent-editor-types.ts`, `src/application/use-cases/CreateSharedAgentUseCase.ts`, `src/application/use-cases/UpdateAgentConfigurationUseCase.ts`, `src/app/agent-editor/_layout.tsx`, `src/app/agent-editor/index.tsx`, `src/interface/ui/components/form/FormSheetHeader.tsx`, `src/interface/ui/components/sheet/useSheetBarTopInset.ts`
- **Backend:** WatermelonDB `agents` via `WatermelonAgentRepository`
- **Status:** live
- **Notes:** Template keys come from `agent-templates.ts`. Templates are Form rows (name,
  then model id and temperature) with the gold checkmark in its own trailing column. Their
  model ids are OpenRouter `~…-latest` aliases. Validation errors show in
  `agent-editor-error`, pinned under the sheet's bar so they are always in view. A swipe
  down discards the draft, as Cancel does. Settings → Agents re-reads its list when the
  sheet closes. Max Tokens follows the model as a tree's Model Settings does: once the
  model's limit is known, the field is held to it (the limit itself when the agent has
  "Always use maximum allowed" on; an empty field stays empty), a typed value is capped at
  it, typing turns "Always use maximum allowed" off, and the Generation footer names the
  limit. A custom OpenRouter id is held to a catalog model's limit when it names one
  (`catalog-model-for-id.ts`: the same id in any case, or a routing variant such as
  `:nitro` of a catalog id); an id the catalog doesn't know is left as typed. A focused
  field is kept 24 points above the keyboard (`SheetScrollView`; on iOS it measures in the
  sheet's own terms, as KeyboardAwareScrollView misplaces fields in a page sheet), so the
  number pad doesn't cover Max Tokens. Flow: `.maestro/mock/agent-max-tokens.yaml`.

### Model picker
- **ID:** `settings.agents.model-picker`
- **Purpose:** Picks the agent's provider and model the way a tree's Model Settings does:
  Provider is a menu row (OpenRouter, LM Studio); on OpenRouter, Model shows the chosen
  model's name and pushes the model browser (the one `chat.model-settings.openrouter-models`
  describes), where a row opens the model's page (`models.detail`) and "Use This Model" puts
  it in the draft; on LM Studio, Model is a menu of the server's models. The footer shows the
  model id in bold and its description. A new provider starts on its default model
  (onboarding's first template on OpenRouter; on LM Studio the first loaded model once the
  list arrives, never one the server lists but hasn't loaded).
- **Where:** The agent editor's Model section; the browser and a model's page push inside
  the editor's sheet (routes `agent-editor/models`, `agent-editor/detail`). Onboarding's
  LM Studio model (`LmStudioModelSection`) reads the same lists through
  `useModelPickerData`.
- **Reach:** `settings-agents-new` → `agent-editor-model` →
  `agent-editor-model-option-<model id>` → `model-detail-use`.
- **Requires:** OpenRouter: network for the catalog, or a cached copy. LM Studio: a
  reachable endpoint (set in `settings.connections.lmstudio`).
- **Selector:** working — `agent-editor-provider` and `agent-editor-model` (menu rows; LM Studio's model is a menu row too), `agent-editor-model-list-screen`, `agent-editor-model-list`, rows `agent-editor-model-option-<model id>`, `agent-editor-model-custom`, `agent-editor-model-error`; the search field is the native header search bar (tap its "Search models" placeholder); Provider and LM Studio model menu items none — native context menu item; reach via a tap on `agent-editor-provider` or `agent-editor-model`
- **Code:** `src/interface/components/settings/agents/editor/AgentModelSection.tsx`, `src/interface/components/settings/agents/editor/AgentModelListScreen.tsx`, `src/interface/components/settings/agents/editor/AgentModelDetailScreen.tsx`, `src/interface/components/models/ProviderModelSection.tsx`, `src/interface/components/models/ModelBrowserList.tsx`, `src/interface/components/models/model-option-filter.ts`, `src/interface/components/models/useModelPickerData.ts`, `src/interface/components/models/provider-default-model.ts`, `src/interface/components/settings/agents/editor/useAgentModelSelection.ts`, `src/interface/components/models/model-options.ts`, `src/infrastructure/llm/OpenRouterModelCatalog.ts`, `src/infrastructure/llm/openrouter/catalog.ts`, `src/infrastructure/llm/lmstudio/models.ts`, `src/app/agent-editor/models.tsx`
- **Backend:** OpenRouter `GET https://openrouter.ai/api/v1/models?limit=1000` (cached for
  24 h under `openrouter_model_catalog_v3`); LM Studio `GET <endpoint>/api/v1/models`.
  Backend adapters also expose authenticated Anthropic/OpenAI `GET /v1/models` through
  `fetchModels()`, returning `OpenRouterCatalogModel[]`; picker integration is separate work.
- **Status:** live
- **Notes:** Model ids contain `/` and `:`, so `<prefix>-model-option-<id>` ids do too. The
  browser lists every model (no cap); search to narrow. A failed LM Studio discovery reads
  "LM Studio isn't answering…" in `agent-editor-model-error`, not the raw fetch error.
  Flow: `.maestro/model-browser.yaml`.

### OpenRouter connection
- **ID:** `settings.connections.openrouter`
- **Purpose:** Latent Spaces' API Keys page (`APIKeySettingsView.swift`) for OpenRouter: a
  card on how keys are kept, "Edit OpenRouter API Key" (a sheet with one secure field,
  Cancel and Save) and links to OpenRouter's key docs, keys and credits pages.
- **Where:** Settings → Connections, the top card and the OpenRouter section.
- **Reach:** Cold start → `home-settings-button` →
  `settings-link-connections` → `connections-openrouter-edit` →
  `connections-openrouter-key-input` → `connections-openrouter-key-save`.
- **Requires:** none
- **Selector:** working — `settings-connections-screen`, `connections-hero`, `connections-openrouter`, `connections-openrouter-edit`, `connections-openrouter-link-docs`, `connections-openrouter-link-keys`, `connections-openrouter-link-credits`, `connections-openrouter-key-sheet`, `connections-openrouter-key-input`, `connections-openrouter-key-cancel`, `connections-openrouter-key-save`, `settings-status-saving`, `settings-status-error`
- **Code:** `src/interface/components/settings/connections/ApiKeysHeroSection.tsx`, `src/interface/components/settings/connections/key-storage-copy.ts`, `src/interface/components/settings/connections/OpenRouterKeySection.tsx`, `src/interface/components/settings/connections/OpenRouterKeySheet.tsx`, `src/interface/components/settings/connections/useConnectionsController.ts`, `src/interface/components/settings/screens/ConnectionsSettingsScreen.tsx`, `src/infrastructure/security/ExpoSecureCredentialStore.ts`, `src/app/settings/connections.tsx`
- **Backend:** `expo-secure-store` (key `openrouter_api_key`), not WatermelonDB; the provider
  registry is reconfigured on save
- **Status:** live
- **Notes:** Save stores the key (about 450 ms later, or at once if the screen closes);
  Cancel discards the edit. A swipe down closes the sheet when the field still holds the
  stored key, and asks "Discard changes?" first when it doesn't (`FormSheet`'s
  `hasUnsavedChanges`, `src/interface/ui/components/sheet/`). On Android, where a sheet is a
  full-screen modal, `PageSheet` keeps it below the status bar, so Cancel and Save are
  reachable. Saving an empty field removes the key. The
  section footer says whether a key is stored. The top card's bullets and the key sheet's
  footer say where the key is kept, per platform (`key-storage-copy.ts`): the iOS Keychain,
  or encrypted with the Android Keystore and left out of Android backups. Neither Settings nor onboarding has a show/hide
  button, as Latent Spaces' SecureField has none; onboarding opens this same key sheet. The links open the system browser (Safari on iOS). The top card's icon is the SF Symbol `lock.shield.fill` on iOS (Ionicons `shield-checkmark` on Android), via `SymbolIcon`.
### Connections sheet
- **ID:** `settings.connections.sheet`
- **Purpose:** The Connections screen as a sheet over the current screen, so a missing key or
  an LM Studio server that is down can be fixed without leaving a tree.
- **Where:** Route `connections`, a modal page sheet with "Connections" and a Done capsule at
  the top.
- **Reach:** `home-setup-action` ("Add key") or
  `chat-error-action` ("Open Connections").
- **Requires:** none
- **Selector:** working — `connections-sheet`, `connections-sheet-done`, plus every selector of `settings.connections.openrouter` and `settings.connections.lmstudio`
- **Code:** `src/interface/components/settings/screens/ConnectionsSheetScreen.tsx`, `src/app/connections.tsx`
- **Backend:** As `settings.connections.openrouter` and `settings.connections.lmstudio`
- **Status:** live
- **Notes:** Swipe down also closes it. On Android it is a full-screen screen; its bar
  (`FormSheetHeader`) keeps below the status bar, and back closes it too.

### LM Studio connection
- **ID:** `settings.connections.lmstudio`
- **Purpose:** Sets the LM Studio server address and an optional API token, toggles model
  auto-load, and tests the connection.
- **Where:** Settings → Connections, the LM Studio section below OpenRouter (scroll down).
- **Reach:** `settings-link-connections` → `connections-lmstudio-endpoint-input` →
  `connections-lmstudio-test`.
- **Requires:** A reachable LM Studio server for "Connected". On the iOS Simulator,
  `localhost` is the Mac.
- **Selector:** working — `connections-lmstudio`, `connections-lmstudio-endpoint-input`, `connections-lmstudio-status-dot`, `connections-lmstudio-token-input`, `connections-lmstudio-token-reveal`, `connections-lmstudio-auto-load`, `connections-lmstudio-status`, `connections-lmstudio-test`, `connections-lmstudio-error`, `connections-lmstudio-error-details-toggle`, `connections-lmstudio-error-detail`, `connections-lmstudio-hint`
- **Code:** `src/interface/components/settings/connections/LmStudioFormSection.tsx`, `src/interface/components/settings/connections/LmStudioTestFailureFooter.tsx`, `src/interface/ui/components/form/FormTextFieldRow.tsx`, `src/interface/ui/components/form/TrailingTextField.tsx`, `src/interface/components/settings/SettingsScreenScaffold.tsx`, `src/interface/components/settings/connections/lmstudio-hint.ts`, `src/interface/components/settings/connections/useConnectionsController.ts`, `src/interface/components/settings/connections/useLmStudioConnectionTest.ts`, `src/application/services/llm/describe-provider-error.ts`, `src/application/services/llm/lmstudio-unreachable-copy.ts`, `src/infrastructure/llm/LMStudioAdapter.ts`, `src/infrastructure/llm/lmstudio/`
- **Backend:** Test: LM Studio `GET <endpoint>/api/v1/models` (`LMStudioAdapter#fetchModels`).
  Settings go to WatermelonDB `user_preferences.lmstudio_settings`, and the token to
  `expo-secure-store`.
- **Status:** live
- **Notes:** The fields are Form rows (`LmStudioFormSection`), in Settings and on
  onboarding's setup page (without the token and auto-load rows) with the same ids.
  `connections-lmstudio-status` reads one of Untested, Checking…, Connected or Not
  reachable. A result holds only for the address and token it tested: editing either puts
  the status back to Untested (and clears the error) until the next test, even once the
  edit is taken back, and the answer to a test of an address edited while it ran is
  dropped. When the
  test fails, the button reads "Test Again" and `connections-lmstudio-error` explains it in
  the footer: "LM Studio isn't answering at this address:", the address on its own line,
  then "Start its local server, then try again.", plus a phone hint when the address is localhost. Under it,
  `connections-lmstudio-error-details-toggle` ("Show Details" / "Hide Details") shows what the
  network or server actually said (`connections-lmstudio-error-detail`, `[lmstudio:<code>]
  <message>`, monospaced and selectable); it starts shown with Verbose Error Alerts on
  (`settings.behavior.verbose-errors`). The footer's setup hint
  (`connections-lmstudio-hint`: "Connect to your LM Studio server…" in Settings, "Start the
  server in LM Studio…" on onboarding) shows until a test connects and again after a failed
  one, never while Connected (`lmstudio-hint.ts`). The Auto-load toggle is gold when on.
  The Server field takes the row after its title; at rest a long address shows from its
  start and is cut off with an ellipsis (`TrailingTextField`, as an unfocused SwiftUI
  `TextField`), and focused it scrolls as usual. A focused row is kept clear of the
  keyboard and, on iOS, its toolbar (`SettingsScreenScaffold`'s keyboard offset).
  Flow: `.maestro/mock/lmstudio-connection.yaml` (ends on a long address, focused and not);
  `.maestro/mock/verbose-error-details.yaml` for the detail shown from the start.

### Message typography
- **ID:** `settings.typography`
- **Purpose:** Sets the dialogue font (JetBrains Mono, VT220, Cardo or System), the font size, the
  user-bubble style (Filled or Outlined) and the corner radius, with a live preview of four
  sample messages.
- **Where:** Settings, the "User Interface Settings" and "User Interface Preview" sections.
- **Reach:** Cold start → `home-settings-button` →
  `settings-typography-font` (scroll down).
- **Requires:** none
- **Selector:** working — `settings-typography-section`, `settings-typography-font`, `settings-typography-font-size`, `settings-typography-message-style`, `settings-typography-corner-radius`, `settings-typography-preview`
- **Code:** `src/interface/components/settings/appearance/UserInterfaceSection.tsx`, `src/interface/components/settings/appearance/interface-options.ts`, `src/interface/components/settings/appearance/InterfacePreviewSection.tsx`, `src/interface/components/settings/appearance/SampleNode.tsx`, `src/interface/components/settings/appearance/useAppearanceController.ts`, `src/interface/ui/components/form/FormPickerRow.tsx`, `src/interface/components/chat/useDialogueDisplayPreferences.ts`, `src/interface/components/chat/message-type.ts`, `src/interface/ui/value-objects/fonts.ts`
- **Backend:** WatermelonDB `user_preferences` (`font_face`, `font_size`, `node_view_style`,
  `node_view_corner_radius`) via `WatermelonUserPreferencesRepository`
- **Status:** live
- **Notes:** The four rows are Latent Spaces' Pickers (`LoomSettingsView.swift:233-275`): a
  tap opens a native pull-down menu (react-native-context-menu-view) with the current value
  checked. Menu items are native and have no testIDs; tap their visible text ("Cardo",
  "Outlined", "20 (material design plebeian)"). Font size offers 12–26, corner radius 0–20 in
  steps of 2. The former per-option ids (`settings-typography-font-<face>`,
  `settings-typography-message-style-filled` / `-outlined`) are gone. A new install starts at size 17, as Latent Spaces does; Serif
  (Cardo) renders 1 pt above the chosen size; VT220 renders 2 pt above it with loose
  leading. Saved selections of the retired mono face resolve to JetBrains Mono; Open Sans resolves
  to System. Cardo remains the default. System uses the platform font with native bold and italic. Code (inline and blocks) is set in JetBrains Mono, or in VT220 when VT220 is the message font.

### Auto-title setting
- **ID:** `settings.behavior.auto-title`
- **Purpose:** Turns the after-first-reply tree titling (`chat.auto-title`) on or off.
- **Where:** Settings → User Interface Settings, the "Auto-Title Conversations" toggle.
- **Reach:** Cold start → `home-settings-button` →
  `settings-behavior-auto-title` (scroll down).
- **Requires:** none
- **Selector:** working — `settings-behavior-auto-title`
- **Code:** `src/interface/components/settings/appearance/UserInterfaceSection.tsx`, `src/interface/components/settings/appearance/useAppearanceController.ts`, `src/interface/ui/components/form/FormToggleRow.tsx`
- **Backend:** WatermelonDB `user_preferences.auto_title_enabled`
- **Status:** live
### Verbose error alerts setting
- **ID:** `settings.behavior.verbose-errors`
- **Purpose:** Shows failures' technical detail from the start, as Latent Spaces adds the raw
  error to its alert (`verboseErrorAlerts`, LoomTreeView.swift:164-173).
- **Where:** Settings → User Interface Settings, the "Verbose Error Alerts" toggle.
- **Reach:** `home-settings-button` → `settings-behavior-verbose-errors` (scroll down).
- **Requires:** none
- **Selector:** working — `settings-behavior-verbose-errors`
- **Code:** `src/interface/components/settings/appearance/UserInterfaceSection.tsx`, `src/interface/components/settings/appearance/useAppearanceController.ts`, `src/interface/components/error-details/`
- **Backend:** WatermelonDB `user_preferences.verbose_error_alerts`
- **Status:** live
- **Notes:** Off by default. Every failure surface shows a plain line and keeps the raw
  `[provider:code] message` behind a toggle: the failed send (`chat-error-details-toggle`),
  a failed continuation card (a tap on the card) and the LM Studio connection test
  (`connections-lmstudio-error-details-toggle`). With this on, those details start shown;
  the toggle still hides them. Read on each focus (`useVerboseErrorAlerts`), so a change
  holds once you go back to the Dialogue or to Connections. The Dialogue passes it down by
  context (`ErrorDetailsDefaultProvider`). Flow: `.maestro/mock/verbose-error-details.yaml`.

### App Info
- **ID:** `settings.app-info`
- **Purpose:** Latent Spaces' "App Info" section: the app's version and build, then links to
  Intrinsic Labs, the Open Loom specification, the Aspen Grove repository and
  socketteer/clooi. No Discord row.
- **Where:** Settings, the last section, below Voice Mode.
- **Reach:** Cold start → `home-settings-button` → `settings-app-info` (scroll to the bottom).
- **Requires:** none. Each link is an accent link row with no chevron, as Latent Spaces' `Link` rows, and opens the system browser (needs a network).
- **Selector:** working — `settings-app-info`, `settings-app-info-version` ("Aspen Grove v<version> (<build>)", not tappable), `settings-app-info-intrinsic-labs`, `settings-app-info-open-loom`, `settings-app-info-github`, `settings-app-info-clooi`
- **Code:** `src/interface/components/settings/app-info/AppInfoSection.tsx`, `src/interface/components/settings/app-info/app-info-links.ts`, `src/interface/components/settings/app-info/app-version-label.ts`, `src/interface/components/home/home-links.ts`, `src/interface/components/settings/SettingsHomeView.tsx`, `src/interface/ui/components/form/FormButtonRow.tsx`
- **Backend:** none — client-only. Version and build are read natively (`expo-application`:
  `CFBundleShortVersionString` / `CFBundleVersion` on iOS, version name / code on Android).
- **Status:** live
- **Notes:** Links open with `Linking.openURL`. The Open Loom row uses `HOME_LINKS.openLoomDocs`.
  The build is left off when the platform gives none.

### Voice Mode setting
- **ID:** `settings.voice`
- **Purpose:** Turns Voice Mode (beta) on or off, shows the current voice and opens the voice
  chooser. The footer explains double-tap to listen and tap to stop.
- **Where:** Settings, the "Voice Mode" section near the bottom.
- **Reach:** Cold start → `home-settings-button` →
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
  A new user starts on Lily, as in Latent Spaces; a saved name that matches no voice falls
  back to Jefferson.

### Voice chooser
- **ID:** `settings.voice.chooser`
- **Purpose:** Picks the character voice (Lily, Jefferson, Eve). Swipe between voice cards;
  each card plays its sample line as it comes into view, a tap on the colored circle stops or
  replays it, and Select saves the voice shown.
- **Where:** A page sheet over Settings, with no visible title (as in Latent Spaces, whose
  `navigationTitle` has no navigation bar to show it in).
- **Reach:** `home-settings-button` → `settings-voice-choose` → swipe `settings-voice-pager` →
  `settings-voice-select`.
- **Requires:** none. Sound needs media volume up.
- **Selector:** working — `settings-voice-chooser`, `settings-voice-pager`, `settings-voice-lily`, `settings-voice-jefferson`, `settings-voice-eve` (the circles; template `settings-voice-${voice.name.toLowerCase()}` in `VoiceCard.tsx`), `settings-voice-select`
- **Code:** `src/interface/components/settings/voice/VoiceChooserSheet.tsx`, `src/interface/components/settings/voice/useOpenOnPage.ts`, `src/interface/ui/components/sheet/PageSheet.tsx`, `src/interface/components/settings/voice/VoiceCard.tsx`, `src/interface/components/settings/voice/useVoiceChooser.ts`, `src/interface/components/voice/voice-appearance.ts`, `src/domain/value-objects/loom-voice.ts`
- **Backend:** none for the demo (on-device `expo-speech`); Select writes the WatermelonDB local
  key `aspen_grove.voice_mode.voice_name`
- **Status:** live
- **Notes:** Opening the sheet shows and plays the saved voice; closing it (swipe down) stops
  speech without saving. The pager is a native horizontal ScrollView, so drive it by swipe.

## Coverage
- `src/app/_layout.tsx` — root stack (Home, Search, Settings, Agents and Connections, the tree screens with compose and Model Settings, and the onboarding, agent-editor and connections modals), providers and theme; referenced by `app.bootstrap` and `home.welcome`
- `./index.ts` — legacy root entry; `package.json` `main` is `src/entry.ts`
- `src/entry.ts` — app entry (registers expo-router)
- `src/interface/components/settings/index.ts` — barrel export
- `src/interface/components/settings/types.ts` — shared type
- `src/interface/components/settings/SettingsScreenScaffold.tsx` — shared settings shell (scroll, large title, keyboard toolbar, spinner)
- `src/interface/components/settings/SettingsStatus.tsx` — shared saving and error text (the settings-status testIDs)
- `src/interface/components/chat/types.ts` — chat row and preference types
- `src/interface/components/chat/route-params.ts` — route param parsing helper
- `src/interface/components/chat/provider-key.ts` — provider key lookup (SecureStore, then env)
- `src/interface/composition/index.ts` — barrel export
- `src/interface/hooks/useAspenGroveTheme.ts` — theme hook
- `src/interface/ui/` — design primitives and tokens (`AppText`, `AppTextInput` (every text field renders through it, for the gold caret and selection of `text-input-tint.ts` and a dark keyboard; on iOS 26 the caret follows the app's global accent, which the `plugins/withIosAccentColor.js` config plugin sets to Latent Spaces' `AccentColor`), `AppInput`, `HeaderIconButton`, `GlassIconButton`, `MaterialView` (and its Android blur target in `src/interface/ui/components/blur/`), `KeyboardDoneBar`, the swipe-to-dismiss `PageSheet` and its unsaved-edits guard in `src/interface/ui/components/sheet/` (with `BelowStatusBar`, which keeps an Android page sheet below the status bar and passes its children a top inset of 0, and `useSheetBarTopInset`, which moves `FormSheetHeader` below the status bar on Android wherever nothing above has, as in the modal stack screens), the sheet form's keyboard-aware `SheetScrollView` in `src/interface/ui/components/keyboard/`, the native-menu section helpers in `native-menu.ts` and the menu-tree builders in `native-menu-tree.ts` (items, sections, a ControlGroup, submenus), the alert-with-a-text-field prompt in `src/interface/ui/components/text-prompt/`, the full-screen text editor sheet in `src/interface/ui/components/text-editor/`, settings-list rows, and the Latent Spaces Form primitives in `src/interface/ui/components/form/`: `FormSection`, `FormRow`, `FormLabel`, `FormLinkRow`, `FormButtonRow`, `FormPickerRow`, `FormToggleRow`, `FormSliderRow`, `FormTextFieldRow`, `FormSheet`, `FormSheetHeader`); they forward `testID` to their host element
