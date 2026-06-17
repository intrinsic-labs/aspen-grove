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

## Phase 1: Data Model — Schema & Domain Entities

**Goal**: Land the new fields on `Agent` and `LoomTree`. Database is wiped (no real data yet).

### Schema (WatermelonDB)

- [ ] Bump schema to v6 with destructive migration (full reset acceptable per user direction).
- [ ] Add `agents.owner_tree_id: string?` column (indexed).
- [ ] Add `loom_trees.default_model_agent_id: string?` column (nullable in storage; required at app-level for dialogue trees, enforced by use cases).
- [ ] Remove `user_preferences.selected_provider` column. Keep `lmstudio_settings` (connection-only).

### Domain entities

- [ ] `Agent`: add optional `ownerTreeId?: ULID`.
- [ ] `LoomTree`: add optional `defaultModelAgentId?: ULID`.
- [ ] `UserPreferences`: remove `selectedProvider`. Update `LMStudioSettings` to drop `selectedModel` (that becomes an agent's `modelRef`, not a global preference).
- [ ] Update `domain/entities/provider.ts`: keep `SelectableProvider` for adapter-registry routing, but it's no longer a user-facing concept.

### Repository contracts

- [ ] `IAgentRepository`:
  - Add `findByOwnerTreeId(treeId): Promise<Agent | null>`
  - Add `findShared(): Promise<Agent[]>` (returns agents where `ownerTreeId === null`, excludes owner human agent)
  - Update `findModels(onlyActive)` to exclude tree-owned agents from default results (or accept an `includeTreeOwned` flag)
- [ ] `ILoomTreeRepository`:
  - `CreateLoomTreeInput`: add `defaultModelAgentId?: ULID`
  - `UpdateLoomTreeInput.changes`: add `defaultModelAgentId?: ULID`
- [ ] `IUserPreferencesRepository`: remove `selectedProvider`-related fields from `UpdateUserPreferencesInput`

### Infrastructure (Watermelon repositories)

- [ ] `WatermelonAgentRepository`: read/write `owner_tree_id`, implement new query methods.
- [ ] `WatermelonLoomTreeRepository`: read/write `default_model_agent_id`.
- [ ] `WatermelonUserPreferencesRepository`: drop `selectedProvider` read/write.

### Doc updates

- [ ] `docs/architecture/model/agents.md`:
  - Document `ownerTreeId` on Agent (semantics, lifecycle).
  - Note that tree-owned agents are filtered from the "library" view.
- [ ] `docs/architecture/model/core-entities.md`:
  - Document `defaultModelAgentId` on LoomTree.
  - Note constraint: dialogue-mode trees require this; buffer-mode trees may not.
- [ ] `docs/domain-language/agents.md`: mention shared vs tree-owned agents at the conceptual level.

---

## Phase 2: Application Layer — Use Cases

**Goal**: Replace global-provider resolution with agent-driven resolution.

### Provider adapter routing

- [ ] Add a helper to map an `Agent.modelRef` → `SelectableProvider`. (E.g., `openrouter:foo` → `openrouter`, `local:ulid` → resolve LocalModel.provider, `lmstudio:foo` → `lmstudio`.) This replaces "consult the registry for the currently active provider."
- [ ] `IProviderRegistry`: keep `getProvider(name)` and `getProvider(agent)`. Remove `getActiveProvider()` / `getActiveProviderName()` / `setActiveProvider()` — they no longer have a sensible meaning.

### Use case updates

- [ ] `SendDialogueTurnUseCase`:
  - Resolve provider from the model agent (not the registry's "active" state).
  - Use `agent.configuration` (temperature, maxTokens, systemPrompt) as-is.
- [ ] `GenerateDialogueContinuationUseCase`: same as above.
- [ ] `CreateDialogueLoomTreeUseCase`:
  - Require `defaultModelAgentId` in input.
  - Validate the agent exists and is a model agent.
  - Persist the field on the tree.
- [ ] New: `UpdateTreeDefaultAgentUseCase` (sets which agent generates for the tree; used when user switches agents from chat ⚙️).
- [ ] New: `ForkAgentForTreeUseCase`:
  - Input: `sourceAgentId`, `treeId`
  - Output: new tree-owned `Agent` cloned from source, with `ownerTreeId = treeId`
  - Updates the tree's `defaultModelAgentId` to point at the clone
  - Used when user customizes a shared agent's settings from chat ⚙️
- [ ] New: `UpdateAgentConfigurationUseCase`:
  - Mutates an existing agent's configuration (name, modelRef, temperature, systemPrompt, maxTokens, etc.)
  - Used by both Settings → Agents and chat ⚙️ (when agent is already tree-owned)
- [ ] New: `CreateSharedAgentUseCase`:
  - Creates an agent with `ownerTreeId === null`
  - Used by Settings → Agents → "+ New Agent"
- [ ] New: `DeleteAgentUseCase`:
  - For shared agents: hard delete (or archive — TBD), but block if any tree references it
  - For tree-owned agents: triggered by tree deletion only
- [ ] Update `WatermelonLoomTreeRepository.hardDelete` to also delete the tree-owned agent (if any).

### Bootstrap / startup

- [ ] `runStartupOrchestrator`: stop seeding any default model agent. Trees can't be created until the user sets up an agent.
- [ ] `AppServicesProvider`: remove the call to `setActiveProvider(userPreferences.selectedProvider)`. Keep LM Studio adapter initialization (endpoint config) since that's connection-level.

### Doc updates

- [ ] `docs/architecture/contracts/llm-provider.md`: remove "active provider" concept; document that providers are selected per-request based on agent.

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
