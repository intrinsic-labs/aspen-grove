# Agent-Centric Dialogue Settings — Implementation Plan

> Pivot from global provider selection to per-tree agent references.
> Tracks the work to make each Loom Tree own its model configuration via Agents.

**Status**: ✅ Complete (Phases 1–6 implemented; Phase 7 remains future work)
**Created**: 2026-06-14
**Completed**: 2026-07-07
**Supersedes**: The implicit "OpenRouter assistant" / "LM Studio assistant" singleton-agent pattern and the `UserPreferences.selectedProvider` global flag.

---

## Motivation

Today, provider/model selection is a **global** setting on `UserPreferences`. Every tree resolves its provider at open time from the current global state — so switching providers in Settings retroactively changes how old conversations are continued. There's also a current bug where selecting LM Studio as the global provider produces `Unknown provider: lmstudio` when opening any tree (won't be solved directly; the whole resolution path is being replaced).

**Goal**: Each Loom Tree owns its own model configuration via a referenced `Agent`. Settings configure shared agents and global provider connection details; trees pick which agent they talk to.

---

## Conceptual Model (Reconciled with Domain Docs)

The domain docs already canonize the Agent abstraction: configuration lives at the Agent level, one Model can back many Agents (e.g., "Claude Balanced" vs "Claude Creative"), and credentials are stored per-provider, not per-agent. This plan fills the gaps the docs don't yet describe:

1. **Tree → Agent linkage.** Trees need to know which model agent generates when the user hits send. New field on `LoomTree`: `defaultModelAgentId` (required for dialogue-mode trees).

2. **Tree-owned (ad-hoc) agents.** When a user "edits dialogue settings" in a chat without consciously managing agents, we silently create or mutate an agent scoped to that tree. New field on `Agent`: `ownerTreeId` (optional). Tree-owned agents are filtered out of the global Agents list and deleted when the tree is hard-deleted.

3. **Dual UX flows**:
   - **Settings → Agents**: CRUD on shared agents (`ownerTreeId === null`). Edits propagate to every tree using them.
   - **Chat → ⚙️**: Tweak this tree's agent. If the agent is shared, prompt with an option to fork into a tree-owned copy *or* edit the global agent. Clear UI. If already tree-owned, edit directly.

4. **Provider connection config stays global.** API keys, LM Studio endpoint, etc. live in `UserPreferences` + secure store. The `selectedProvider` flag is fully removed — an agent's `modelRef` determines which provider adapter handles it.

---

## Phase 0: Repo Hygiene

- [x] Commit existing LM Studio integration WIP as a checkpoint (commit `f0d52ee`)
- [x] Land plan in `.dev/`

---

## Phase 1: Data Model — Schema & Domain Entities ✅

**Goal**: Land the new fields on `Agent` and `LoomTree`. Database is wiped (no real data yet).

### Schema (WatermelonDB)

- [x] Bump schema to v6.
- [x] Add `agents.owner_tree_id: string?` column (indexed).
- [x] Add `loom_trees.default_model_agent_id: string?` column (nullable in storage; required at app-level for dialogue trees, enforced by use cases).
- [x] Drop `user_preferences.selected_provider` from the schema definition. WatermelonDB cannot drop SQLite columns; the column will linger in legacy databases but the model and repo no longer reference it. Functionally removed.

### Domain entities

- [x] `Agent`: add optional `ownerTreeId?: ULID`.
- [x] `LoomTree`: add optional `defaultModelAgentId?: ULID`.
- [x] `UserPreferences`: remove `selectedProvider`. `LMStudioSettings` no longer has `selectedModel` (that's now an agent's `modelRef`).
- [x] `domain/entities/provider.ts`: `SelectableProvider` retained for adapter-registry routing (internal); no longer a user-facing concept.

### Repository contracts

- [x] `IAgentRepository`:
  - Added `findByOwnerTreeId(treeId): Promise<Agent | null>`
  - Added `findSharedModels(onlyActive?): Promise<Agent[]>`
  - `findAll`/`findModels` now accept `includeTreeOwned` flag (default `false`); tree-owned agents are excluded by default
  - `CreateAgentInput` accepts `ownerTreeId?`; `UpdateAgentInput.changes` accepts `ownerTreeId?: ULID | null`
- [x] `ILoomTreeRepository`:
  - `CreateLoomTreeInput` accepts `defaultModelAgentId?`
  - `UpdateLoomTreeInput.changes` accepts `defaultModelAgentId?`
- [x] `IUserPreferencesRepository`: removed `selectedProvider` from `UserPreferencesChanges`.

### Infrastructure (Watermelon repositories)

- [x] `WatermelonAgentRepository`: reads/writes `owner_tree_id`, implements `findByOwnerTreeId` and `findSharedModels`, filters tree-owned agents from default queries.
- [x] `WatermelonLoomTreeRepository`: reads/writes `default_model_agent_id`.
- [x] `WatermelonUserPreferencesRepository`: stopped reading/writing `selected_provider` and `lmstudio_settings.selectedModel`.

### Interim UI shims (will be properly fixed in later phases)

- [x] `useSettingsController.ts`: keeps `selectedProvider` and `lmstudioSelectedModel` as **in-memory UI state only** (no persistence). Settings UI renders as before, but provider/model choice is transient. Marked with TODO pointing at Phase 5.
- [x] `AppServicesProvider.tsx`: stopped calling `setActiveProvider` at bootstrap. Registry retains its default. Marked with TODO pointing at Phase 6.
- [x] `session-helpers.ts`: temporarily routes every chat session through the OpenRouter singleton assistant agent (LM Studio trees are temporarily unreachable from chat). Marked with TODO pointing at Phase 2.

### Doc updates

- [x] `docs/architecture/model/agents.md`: documented `ownerTreeId` on Agent, added "Shared vs Tree-Owned Agents" section with lifecycle and UX flows.
- [x] `docs/architecture/model/core-entities.md`: documented `defaultModelAgentId` on LoomTree, added "Default Model Agent" section.
- [x] `docs/domain-language/agents.md`: added "Shared vs Tree-Owned Agents" at the conceptual level.

### Verification

- [x] `npm test` — 6 suites / 9 tests pass.
- [x] Zed diagnostics — zero errors / warnings across the project.

---

## Phase 2: Application Layer — Use Cases ✅

**Goal**: Replace global-provider resolution with agent-driven resolution.

### Provider adapter routing

- [x] Added `selectableProviderFromModelRef(modelRef)` helper in `application/services/llm/`. Maps `openrouter:foo` → `openrouter`, `lmstudio:foo` → `lmstudio`. Throws for currently-unrouteable providers (anthropic/openai/google/local/custom). Local model resolution stays a Phase 7 concern.
- [x] `IProviderRegistry`: replaced `getActiveProvider` / `getActiveProviderName` / `setActiveProvider` with `getProviderForAgent(agent)` and `getProviderForModelRef(modelRef)`. Kept `getProvider(name)` and `getAvailableProviders()`.
- [x] `ProviderRegistry` (infrastructure): no longer tracks an active provider. Provider escape hatches (`getOpenRouterAdapter`, `getLMStudioAdapter`) preserved for connection-config flows.

### Use case updates

- [x] `SendDialogueTurnUseCase`: resolves provider via `providerRegistry.getProviderForAgent(modelAgent)`. Treats a missing model agent as a hard error (was previously silently optional). Uses `agent.configuration` directly.
- [x] `GenerateDialogueContinuationUseCase`: same treatment as `SendDialogueTurnUseCase`.
- [x] `CreateDialogueLoomTreeUseCase`: `defaultModelAgentId` is now required in input. Validates that the referenced agent exists, is `type: model`, and isn't archived. Persists the field on the tree.
- [x] New: `UpdateTreeDefaultAgentUseCase`. Validates the target agent is a model agent, non-archived, and (if tree-owned) belongs to *this* tree. Re-points the tree's `defaultModelAgentId`.
- [x] New: `ForkAgentForTreeUseCase`. Clones a shared agent's configuration into a tree-owned copy (`ownerTreeId = treeId`) and re-points the tree at the clone. Refuses to fork already-tree-owned agents.
- [x] New: `UpdateAgentConfigurationUseCase`. Provider-agnostic mutation of name, modelRef, and configuration (merged on top of existing). Used by both shared-agent edits and tree-owned-agent edits.
- [x] New: `CreateSharedAgentUseCase`. Creates a library agent (`ownerTreeId === null`) from a name + modelRef + optional configuration/permissions. Tree-owned agents are not created from scratch — they're forked from existing library agents.
- [x] New: `DeleteAgentUseCase`. Refuses to delete shared agents while any active tree references them (blocking error includes the count). Accepts a `force` escape hatch for tree-cascade flows. Refuses to delete human agents.
- [x] `WatermelonLoomTreeRepository.hardDelete`: cascade-deletes any tree-owned agents bound to the tree. Shared agents are never touched.
- [x] `ILoomTreeRepository`: added `findByDefaultModelAgentId(modelAgentId, onlyActive?)` (used by `DeleteAgentUseCase` to detect in-use shared agents, and available for the upcoming Phase 4 "affects N trees" warning UI).

### Bootstrap / startup

- [x] `runStartupOrchestrator`: smoke-tree path now resolves a default agent via `findSharedModels`. If no model agent exists, skips smoke tree creation cleanly (logs and returns). Trees can be created once an agent is configured.
- [x] `AppServicesProvider`: removed the `setActiveProvider` call (Phase 1 already had this; finalized in Phase 2). LM Studio connection-level initialization preserved. New use cases wired into the `useCases` bundle (`createSharedAgentUseCase`, `updateAgentConfigurationUseCase`, `forkAgentForTreeUseCase`, `updateTreeDefaultAgentUseCase`, `deleteAgentUseCase`).

### Chat / interface updates

- [x] `ChatSession` type now carries `provider: SelectableProvider`, populated at session init from the resolved agent's `modelRef`. The chat controller uses it to fetch the right API key from secure storage.
- [x] `session-helpers.ts`: rewritten. Resolves the model agent from `tree.defaultModelAgentId`, derives provider via `selectableProviderFromModelRef`. Clear, actionable errors when the tree has no agent or the agent is missing/archived/malformed. The OpenRouter-shim from Phase 1 is gone.
- [x] `useLoomTreeChatController.ts`: removed the two `providerRegistry.getActiveProviderName()` calls in favor of `session.provider`.
- [x] `LoomTreeListView.tsx`: tree creation now picks a default agent from `findSharedModels` and passes it as `defaultModelAgentId`. Surfaces a clear error if no agents exist (Phase 3 will route to Settings instead).

### Doc updates

- [x] `docs/architecture/contracts/llm-provider.md`: new `ProviderRegistry` section. Explicitly documents the "no active provider" routing principle and the agent-driven request path.

### Verification

- [x] `npm test` — 6 suites / 9 tests pass. Updated `SendDialogueTurnUseCase.test.ts` and `GenerateDialogueContinuationUseCase.test.ts` mocks from `getActiveProvider` → `getProviderForAgent`.
- [x] Zed diagnostics — zero errors / warnings across the project.

---

## Phase 3: Tree Creation Flow ✅ (placeholder)

**Goal**: Trees are always created with a `defaultModelAgentId`, resolved from a user-pinned default with sensible fallbacks. UI is intentionally placeholder — the proper picker lands in Phase 5.

### Schema (WatermelonDB)

- [x] Bump schema to v7.
- [x] Add `user_preferences.default_model_agent_id: string?` column (additive migration).

### Domain / repositories

- [x] `UserPreferences`: add optional `defaultModelAgentId?: ULID`.
- [x] `IUserPreferencesRepository`: `UserPreferencesChanges` accepts `defaultModelAgentId?: ULID | null` (nullable so we can clear stale pins).
- [x] `WatermelonUserPreferencesRepository`: reads/writes the new column. New singleton seeds it as `null`.

### Application services

- [x] New: `resolveDefaultModelAgent` helper in `application/services/`. Resolves the model Agent for a new tree in the order:
  1. Pinned `UserPreferences.defaultModelAgentId` if still active.
  2. Otherwise, first available shared model agent.
  3. Otherwise, `null` — caller surfaces an error.
  - Stale pins (deleted/archived agents) are cleared automatically.
- [x] New: `pinDefaultModelAgentIfUnset` companion helper. No-ops if a pin already exists, so subsequent Settings saves don't silently re-route future trees.

### Interface

- [x] `LoomTreeListView`: tree-create flow uses `resolveDefaultModelAgent` instead of the Phase 2 "first shared agent" stopgap. Clear error message when no agents exist (placeholder — future banner / Settings deeplink in Phase 5).
- [x] `useSettingsController.persistDraft`:
  - Always upserts the OpenRouter assistant agent (existing behavior preserved).
  - **New**: also upserts the LM Studio assistant agent when the in-memory "selected model" is set, so the LM Studio routing path is reachable end-to-end.
  - **New**: after upsert, calls `pinDefaultModelAgentIfUnset` for each. Order is biased toward the provider the user has open in the picker, so first-time LM Studio configurators get LM Studio as their default.
  - No explicit "set as default" UI shipped — deliberate per the placeholder approach.

### Bootstrap / startup

- [x] `runStartupOrchestrator`: smoke-tree path now uses `resolveDefaultModelAgent` instead of `findSharedModels` directly. Same skip-when-empty behavior.

### Doc updates

- [x] `docs/architecture/model/agents.md` UserPreferences section: added `defaultModelAgentId` field and a new "Default Model Agent for New Trees" section documenting resolution order and stale-pin handling.

### Explicit non-goals (deferred)

- ~~Navigate to Settings → Agents with a banner when no model agents exist.~~ Placeholder error message used instead. Phase 5 ships the banner + deeplink.
- ~~`useAvailableAgentsForNewTree` hook.~~ Folded into the inline `resolveDefaultModelAgent` call. The hook isn't valuable until there's a picker UI to consume it.
- ~~Explicit "default agent for new trees" picker.~~ Phase 5 Settings → Agents.

### Verification

- [x] `npm test` — 6 suites / 9 tests pass.
- [x] Zed diagnostics — zero errors / warnings across the project.

---

## Phase 4: Chat Header — Per-Tree Agent Settings UI ✅

**Goal**: A ⚙️ in the chat header opens a sheet that exposes the tree's current agent and lets the user tweak it without thinking about "agents."

### Components

- [x] Settings button in the chat screen header (right side, `LoomTreeChatView`).
- [x] `DialogueSettingsSheet` (`chat/dialogue-settings/`):
  - Shows the tree's current agent + ownership ("Private to this conversation" / "Shared agent · used by N trees").
  - **If agent is tree-owned**: edit mode opens directly. Save → `UpdateAgentConfigurationUseCase`.
  - **If agent is shared**: prompt with "Edit shared agent" vs "Customize for this tree only" (`ForkAgentForTreeUseCase`), including the referencing-tree count.
  - "Switch agent" lists other shared agents → `UpdateTreeDefaultAgentUseCase`. ("+ New ad-hoc agent" dropped — tree-owned agents are created only by forking; creating from scratch stays a library concern.)
  - Tree-level `systemContext` editable with explicit save.
  - Implementation note: modes swap within one modal (overview / edit / switch) instead of stacking modals — nested page-sheet modals are unreliable cross-platform.

### Wiring

- [x] `useLoomTreeChatController` exposes `dialogueSettings` state; sheet mutations call back into `reinitializeSession`.
- [x] Session re-initialization preserves the ephemeral-tree flag (an active conversation is never mistaken for an empty quick-add tree).

### Doc updates

- [x] `docs/architecture/specs/dialogue-settings-ui.md`.

---

## Phase 5: Settings — Agents Library ✅

**Goal**: A proper agent management surface in Settings, replacing the current ProviderPickerSection / per-provider sections that mix connection config with agent config.

### Settings restructure

- [x] **Connections section** (`settings/connections/`): OpenRouter API key; LM Studio endpoint, optional token, useMcpTools, autoLoadModels + "Test connection". The only credential-bearing surface.
- [x] **Agents section** (`settings/agents/`):
  - Lists shared agents with name, modelRef, temperature/max tokens.
  - Tap → `AgentEditorSheet` (same form internals as the chat ⚙️ sheet).
  - "+ New Agent" editor with provider chips: OpenRouter (searchable catalog picker via new `OpenRouterModelCatalog`, 24h cache, custom identifiers allowed) or LM Studio (discovered models).
  - "Make default" action per agent (explicit pin; first created agent auto-pins via `pinDefaultModelAgentIfUnset`).
  - Delete blocked while referenced (existing `DeleteAgentUseCase` behavior surfaced in UI).
- [x] Controllers split by concern: `useConnectionsController`, `useAppearanceController`, `useAgentsLibraryController` — the 634-line `useSettingsController` is gone, along with the temperature dual-write to `UserPreferences.defaultTemperature`.

### Cleanup

- [x] Removed `ProviderPickerSection`, `OpenRouterSettingsSection`, `LMStudioSettingsSection`, `GenerationDefaultsSection` (agents own generation config now).
- [x] Global default-temperature UI removed (the preference field remains in storage, unused by settings).

### Suggested templates

- [x] Static OpenRouter-routed list in `settings/agents/agent-templates.ts` (Claude Sonnet balanced/creative, Claude Haiku fast, GPT-4o). Not auto-instantiated; user picks one as a starting draft.

### Doc updates

- [x] Covered by `docs/architecture/specs/dialogue-settings-ui.md` + this plan; `agents.md` already documents shared vs tree-owned lifecycle.

---

## Phase 6: Cleanup ✅

- [x] Removed `openrouter-assistant-agent.ts` and `lmstudio-assistant-agent.ts` singleton helpers. Shared defaults now live in `application/services/agent-defaults.ts`.
- [x] `selectedProvider` swept from all code paths (only the un-droppable legacy SQLite column remains, unreferenced).
- [x] `IProviderRegistry` active-provider methods were already gone (Phase 2); stale TODO comments removed.
- [x] Tests audited — no active-provider/singleton assumptions remained; suite green.

### Doc updates

- [x] `AGENTS.md`: "Agents, Humans, & Models" now documents `ownerTreeId` and the tree → agent linkage / no-active-provider routing.
- [x] This file marked completed.

---

## Phase 7 (Future, Not in Scope)

These are intentionally deferred. Worth noting so we don't accidentally design them out:

- **Multi-agent participation in a tree.** Today: `defaultModelAgentId` (one model agent + the human owner). Future: `participatingAgentIds: ULID[]` for the two-role pattern and beyond. The schema can accept a new junction table without disturbing the current design.
- **Renaming "Agent" → "Profile" in user-facing copy.** Internal type names stay `Agent` (matches all the docs and existing code); UI strings can shift to "Profile" later as a copy pass.
- **Local model agents** (`local:{ulid}`) — depends on `LocalModel` entity getting fully implemented.

---

## Open Questions Resolved

- ✅ Default for new tree: pick a "default agent" (`UserPreferences.defaultModelAgentId`), set when user creates their first agent. No prompt.
- ✅ Customize-for-this-tree semantics: explicit choice — "Edit shared" vs "Customize for this tree only" (option B from earlier discussion).
- ✅ Remove `selectedProvider` entirely.
- ✅ DB wipe is acceptable (no real data yet).
- ✅ LM Studio templates: no static template list; just "create LM Studio agent" using discovered models.
- ✅ Doc updates are part of each phase, not deferred to the end.

## Open Questions Still TBD

- **Shared-agent edit confirmation copy**: How loud should the warning be when editing a shared agent that's referenced by other trees? (Probably: show count of referencing trees + simple confirm dialog.)
- **Archived agents**: Should agents support archive vs hard delete (paralleling LoomTree)? Probably yes — defer to first time we hit it.
- **What to call the default-for-new-trees UX**: "Default agent" / "Pinned" / something else. Cosmetic, decide during Phase 5.

---

## Commit Strategy

- Each phase = one or more focused commits.
- Doc updates included in the same commit as the code they describe.
- Commit messages reference this plan, e.g., `feat(agents): add ownerTreeId (plan phase 1)`.
