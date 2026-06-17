# Agent-Centric Dialogue Settings — Implementation Plan

> Pivot from global provider selection to per-tree agent references.
> Tracks the work to make each Loom Tree own its model configuration via Agents.

**Status**: Planning complete, ready to implement
**Created**: 2026-06-14
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

## Phase 3: Tree Creation Flow

**Goal**: Trees are always created with a `defaultModelAgentId`. If no agent exists, the user is prompted to set one up first.

### Interface

- [ ] `LoomTreeListView` create-new flow:
  - If at least one shared model agent exists, pick the user's "default" (last-used or marked-default — see open Q below) and create the tree pointing at it.
  - If no model agents exist, navigate to Settings → Agents with a banner like "Set up your first agent to start a tree."
- [ ] New: tiny `useAvailableAgentsForNewTree` hook in the chat module.

### Defaults

- [ ] Add `UserPreferences.defaultModelAgentId?: ULID` to remember the "default for new trees" choice.
- [ ] Add `user_preferences.default_model_agent_id` column (schema v6 alongside the others).
- [ ] If the chosen default is archived/deleted, fall back to "most recently used model agent" and update the preference.

### Doc updates

- [ ] `docs/architecture/model/agents.md` UserPreferences section: add `defaultModelAgentId`.

---

## Phase 4: Chat Header — Per-Tree Agent Settings UI

**Goal**: A ⚙️ in the chat header opens a sheet that exposes the tree's current agent and lets the user tweak it without thinking about "agents."

### Components

- [ ] `DialogueSettingsButton` in the chat screen header (right side).
- [ ] `DialogueSettingsSheet`:
  - Shows the tree's current agent: provider, model, temperature, max tokens, system prompt, system context (tree-level).
  - **If agent is tree-owned**: all fields directly editable. Save → `UpdateAgentConfigurationUseCase`.
  - **If agent is shared**:
    - Read-only display with a banner: "Shared agent — edits affect N other trees."
    - Two primary actions: "Edit shared agent" (mutates the shared agent, with a confirmation) and "Customize for this tree only" (forks into a tree-owned copy via `ForkAgentForTreeUseCase`).
  - Also: "Switch agent" → picker listing other shared agents + "+ New ad-hoc agent" (creates tree-owned).
  - Tree-level `systemContext` is editable here too, independent of the agent's `systemPrompt`.

### Wiring

- [ ] Extend `useLoomTreeChatController` with `dialogueSettings` state and the actions above.
- [ ] After any agent mutation, refresh the session's `modelIdentifier` / `modelAgentId` references.

### Doc updates

- [ ] New file: `docs/architecture/specs/dialogue-settings-ui.md` describing the sheet, the shared-vs-owned distinction, and the fork behavior.

---

## Phase 5: Settings — Agents Library

**Goal**: A proper agent management surface in Settings, replacing the current ProviderPickerSection / per-provider sections that mix connection config with agent config.

### Settings restructure

- [ ] **Connections section** (existing settings reorganized):
  - OpenRouter: API key only.
  - LM Studio: endpoint, optional API token, useMcpTools, autoLoadModels.
  - These remain the only credential-bearing parts.
- [ ] **Agents section** (new):
  - List shared agents with name, provider, model identifier, temperature.
  - Tap → editor (same fields as the chat ⚙️ sheet, minus the fork affordance).
  - "+ New Agent" → opens an editor:
    - For OpenRouter: pick from suggested templates (Claude Sonnet via OpenRouter, Llama via OpenRouter, etc.) or enter a custom model identifier.
    - For LM Studio: pick from discovered LM Studio models (uses the existing `fetchLmstudioModels` logic). No "template" concept here.
  - "Set as default for new trees" toggle per agent.
  - Delete agent: blocked if any tree references it (with explanation).

### Cleanup

- [ ] Remove `ProviderPickerSection` (no longer meaningful).
- [ ] Strip provider/model/temperature/systemPrompt fields out of `OpenRouterSettingsSection` (those move to agent editor).
- [ ] `LMStudioSettingsSection`: keep only endpoint, token, useMcpTools, autoLoadModels.
- [ ] Remove the `(default temperature)` global setting if it's no longer used anywhere (agents own temperature).

### Suggested templates

- [ ] Define a small static template list (OpenRouter-routed for now): e.g.
  - `openrouter:anthropic/claude-sonnet-4` — "Claude Sonnet (Balanced)" @ temp 0.7
  - `openrouter:anthropic/claude-sonnet-4` — "Claude Sonnet (Creative)" @ temp 1.0
  - `openrouter:openai/gpt-4o` — "GPT-4o (Balanced)" @ temp 0.7
- [ ] Templates are NOT auto-instantiated. User picks one when adding an agent.

### Doc updates

- [ ] `docs/architecture/model/agents.md`: document the templates pattern as implemented (OpenRouter-routed for now; native provider keys are a future expansion).

---

## Phase 6: Cleanup

- [ ] Remove `openrouter-assistant-agent.ts` and `lmstudio-assistant-agent.ts` singleton helpers. They embodied the old "one assistant agent per provider, auto-resolved" model.
- [ ] Remove `selectedProvider` from all code paths (already done schema-side in Phase 1, but sweep for leftover references).
- [ ] Remove `IProviderRegistry.setActiveProvider` / `getActiveProvider` / `getActiveProviderName`.
- [ ] Audit tests for assumptions about "active provider" or singleton assistant agents; update or replace.
- [ ] Run `npm test` and address breakages.

### Doc updates

- [ ] `AGENTS.md` (root): update the "Agents, Humans, & Models" section to mention `ownerTreeId` and tree-default-agent linkage.
- [ ] Mark this file as completed.

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
