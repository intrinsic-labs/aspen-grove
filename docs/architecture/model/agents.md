# Agents Model Specification

> Specification for Agent and Model entities — the participants in Loom Tree interactions.

---

## Overview

Aspen Grove uses a **unified Agent abstraction** where both humans and models are represented the same way at the API level. This enables:

- **Uniform tree operations** — The Loom Tree doesn't care what's behind an Agent
- **Flexible configuration** — Multiple Agent profiles can reference the same underlying model
- **Consistent authorship** — All Nodes have an `authorAgentId`, whether human or model

---

## Agent

The core abstraction for any entity that can participate in or operate on a Loom Tree.

### Properties

- **id** — ULID, primary identifier
- **name** — string, display name
- **type** — enum: `human` | `model`
- **modelRef** — optional string, only for `type: model` (see Model Reference below)
- **configuration** — AgentConfiguration object
- **permissions** — AgentPermissions object
- **loomAware** — boolean, whether this agent can access tree navigation tools
- **ownerTreeId** — optional ULID, marks this agent as private to a specific LoomTree (see [Shared vs Tree-Owned Agents](#shared-vs-tree-owned-agents))
- **createdAt** — timestamp
- **updatedAt** — timestamp
- **archivedAt** — optional timestamp, soft delete marker

### AgentConfiguration Properties

- **systemPrompt** — optional string, prepended to context for this agent
- **temperature** — optional number, 0.0-2.0, controls randomness
- **maxTokens** — optional number, limit on response length
- **stopSequences** — optional array of strings
- **customParameters** — optional key-value map for provider-specific settings

*Note: For human agents, these configuration options are ignored (humans don't have temperature settings). They exist on Agent for uniformity.*

### AgentPermissions Properties

- **read** — boolean, can view Loom Trees and content
- **write** — boolean, can create Nodes, Edges, and perform tree operations

### Constraints

- `type` is immutable after creation (required for stable hash verification — see [Provenance](./provenance.md))
- `modelRef` is required when `type: model`, must be null when `type: human`
- Permissions default to `read: true`, `write: true` for new Agents
- `loomAware` defaults to `true` for human agents, `false` for model agents
- One model can back multiple Agents (different configurations/personas)
- There is exactly one human Agent marked as the **owner Agent** (see Default Agents below)
- `ownerTreeId` must reference an existing LoomTree when set; human agents must have `ownerTreeId = null`

### Indexes

- Primary: id
- By type (for filtering humans vs models)
- By modelRef (for finding all agents using a given model)
- By archivedAt null (for active agents only)
- By ownerTreeId (for resolving a tree's owned agent and for cascading deletes)

---

## Shared vs Tree-Owned Agents

Agents have two flavors depending on whether they're managed at the application level or scoped to a single conversation.

### Shared (Library) Agents

- `ownerTreeId === null`
- Created and managed by the user in Settings → Agents
- Show up in the global Agents list
- Multiple LoomTrees may reference the same shared agent via `LoomTree.defaultModelAgentId`
- Edits to a shared agent's configuration propagate to every tree that references it
- Cannot be deleted while any LoomTree still references them

### Tree-Owned (Private / Ad-Hoc) Agents

- `ownerTreeId === <some LoomTree id>`
- Created implicitly when a user customizes dialogue settings inside a chat without explicitly managing agents ("feels like changing settings for this conversation")
- Filtered out of the global Agents list (Settings → Agents shows only shared agents)
- Lifecycle is tied to the owning LoomTree — hard-deleting the tree hard-deletes the tree-owned agent
- Editing a tree-owned agent affects only that tree (no propagation)
- A tree-owned agent can be "promoted" to a shared agent by clearing `ownerTreeId`

### UX Flows

- **From Settings**: User edits a shared agent. Changes affect every tree using it.
- **From a chat's dialogue settings sheet**, if the tree currently uses a **shared** agent: user chooses between "Edit shared agent (affects N other trees)" or "Customize for this tree only" — the latter forks the shared agent into a tree-owned copy and re-points the tree at the copy.
- **From a chat's dialogue settings sheet**, if the tree currently uses a **tree-owned** agent: edits apply directly to that agent. No fork prompt; it already belongs to this tree.

---

## Model Reference

The `modelRef` field on Agent stores a reference to the underlying model.

### Format

`modelRef` is `{provider}:{identifier}`. Aspen Grove routes two providers:

- `openrouter:{openrouter model id}` — e.g. `openrouter:anthropic/claude-sonnet-4.5`
- `lmstudio:{LM Studio model key}` — a model served by the user's LM Studio

Provider routing is resolved per request from this prefix (`selectableProviderFromModelRef`); there is no global active provider. The domain `Provider` type still lists other values (`anthropic`, `openai`, `google`, `hyperbolic`, `local`, `custom`), but only `openrouter` and `lmstudio` can be routed, and no native Anthropic or OpenAI adapters are planned.

OpenRouter models are listed from the public catalog (`OpenRouterModelCatalog`, cached for 24 hours); LM Studio models are discovered live from the server.

---

## UserPreferences

App-wide user preferences stored as a singleton. Not tied to any specific Agent.

### Properties

- **id** — ULID, primary identifier (singleton — only one record exists)
- **displayName** — string, user's chosen name (used as default for human Agent names)
- **email** — optional string (unused)
- **avatarRef** — optional string, reference to avatar image in media storage
- **defaultVoiceModeEnabled** — boolean, default false; reserved for character voices (nothing reads it yet)
- **autoTitleEnabled** — boolean, generate a tree title with one extra model call after the first response
- **lmstudioSettings** — LM Studio connection settings (endpoint and options; the token is in secure storage)
- **defaultTemperature** — number, preferred temperature for new model agents (default: 1.0)
- **defaultModelAgentId** — optional ULID, the model Agent that new LoomTrees are pinned to (see [Default Model Agent](#default-model-agent-for-new-trees))
- **theme** — enum: `light` | `dark` | `system`, default `system`
- **fontSize** — number, UI text size in points, default 16
- **fontFace** — string, UI font family name
- **nodeViewStyle** — enum: `filled` | `outlined`, default `filled`
- **nodeViewCornerRadius** — number, 0-28, default 12
- **verboseErrorAlerts** — boolean, show detailed error info, default false
- **createdAt** — timestamp
- **updatedAt** — timestamp

### Default Model Agent for New Trees

`UserPreferences.defaultModelAgentId` records the user's preferred model Agent for newly-created LoomTrees. Tree creation resolves it in this order:

1. The pinned `defaultModelAgentId`, if it still references an active, non-archived model agent.
2. Otherwise, the first available shared (library) model agent.
3. Otherwise, the create-tree flow fails with a message directing the user to Settings.

Stale pins (the referenced agent has been deleted or archived) are cleared automatically the next time the resolver runs, so the user isn't stuck on a dead pointer.

The pin is currently set in two ways:

- **First-time pinning during Settings save**: when the user configures their first model agent in Settings, that agent becomes the default. Subsequent saves do not change the pin unless it was cleared.
- **Explicit user choice** (post-Phase 5): the Settings → Agents UI exposes a "set as default for new trees" affordance per agent.

### Constraints

- Exactly one UserPreferences record exists per app installation
- Created automatically on first launch with sensible defaults
- Not linked to Grove or Agent — it's truly global

### Design Notes

Previous versions had a separate `Human` entity that Agents referenced. This was simplified because:

- MVP is single-user — no need to model multiple humans locally
- Human-specific preferences are app-wide, not per-Agent
- The Agent abstraction already handles identity for authorship

---

## Model (from a provider)

Models are not persisted locally. OpenRouter's are fetched from its public catalog; LM Studio's from the running server.

### Properties (Runtime Only)

- **identifier** — string, the model ID used in API requests
- **provider** — `openrouter` | `lmstudio`
- **displayName** — string, human-friendly name from provider
- **description** — optional string, provider's model description
- **capabilities** — ModelCapabilities object

### LM Studio connection

LM Studio's endpoint and settings live in `UserPreferences.lmstudioSettings`; its API token, like the OpenRouter key, lives in secure storage.

---

## ModelCapabilities

Capabilities that vary between models. Used for both remote and local models.

### Properties

- **supportsImages** — boolean, can process image inputs
- **supportsAudio** — boolean, can process audio inputs
- **supportsToolUse** — boolean, can use function/tool calling
- **maxContextTokens** — number, maximum context window size
- **maxOutputTokens** — number, maximum response length

*For provider-level capabilities (streaming support, system prompt handling), see [LLM Provider Contracts](../contracts/llm-provider.md#providercapabilities-properties).*

---

## Relationships

### Agent → Model (for model agents)

- `Agent.type = model`
- `Agent.modelRef` contains the model reference string
- One model can back multiple Agents with different configurations

### Node → Agent

- `Node.authorAgentId` references `Agent.id`
- Every Node has exactly one author Agent
- `Node.authorType` is denormalized from `Agent.type` for efficient hash verification

### Grove → Agent (ownership)

- `Grove.ownerAgentId` references the owner (human) Agent
- One Grove per user, owned by their primary human Agent

---

## Loom-Aware Capabilities

When `Agent.loomAware = true`, the agent can access additional context and tools.

### Additional Context Provided

Loom-aware agents receive context at two levels:

**Per-node metadata** (inline with each message):
- localId, author, relative timestamp
- Continuation count, annotation count, bookmark status

**System-level context** (once per turn):
- Tree title, mode, total nodes, branch count
- Current depth and position trace
- Active permissions
- Other agents' locations (by node localId)

See [loom-tools ambient context](../specs/loom-tools/README.md#ambient-context) for full specification.

### Tools Available (for Model Agents)

- **Navigation**: view, list, tree, switch
- **Content**: continue (invoke subject model), respond (add own content), annotate, edit, bookmark, prune
- **Meta**: help, think (private scratchpad)

The tools are after v1; the `loomAware` flag exists today but unlocks nothing yet.

*Full tool definitions, syntax, and examples in [loom-tools](../specs/loom-tools/README.md).*

### Design Notes

- Loom-awareness enables the "two-role pattern" (analyst + subject)
- Human agents are loom-aware by default (they see the UI)
- Model agents default to not loom-aware (they see linear conversation)
- Can be toggled per-Agent for flexible experimentation

---

## Default Agents

On first launch, create these default entities:

### UserPreferences (Singleton)

- displayName: "Human" (user can edit)
- theme: `system`
- fontSize: 16
- nodeViewStyle: `filled`
- nodeViewCornerRadius: 12
- All other fields: defaults as specified above

### Owner Human Agent

- name: (from UserPreferences.displayName)
- type: `human`
- modelRef: null
- loomAware: true
- permissions: read + write
- This agent is referenced by `Grove.ownerAgentId`

### Suggested Model Agent Templates

Quick-start templates in the agent editor (`interface/components/settings/agents/agent-templates.ts`), all routed through OpenRouter. They are starting points the user edits before saving, never auto-created:

| Template | Model (OpenRouter) | temperature |
|----------|--------------------|-------------|
| Claude Sonnet (Balanced) | `anthropic/claude-sonnet-4.5` | 0.7 |
| Claude Sonnet (Creative) | `anthropic/claude-sonnet-4.5` | 1.2 |
| Claude Haiku (Fast) | `anthropic/claude-haiku-4.5` | 0.7 |
| GPT-4o (Balanced) | `openai/gpt-4o` | 0.7 |

Users can create custom Agents from any available model.

---

## Security Considerations

### Credential Storage

- API keys stored in platform secure storage (Keychain on iOS, Keystore on Android)
- Credentials are stored **per-provider**, not per-model or per-agent
- One API key unlocks all models from that provider
- Keys never logged, never in database, never in app state

### Credential Reference Pattern

```
Provider credentials (ExpoSecureCredentialStore):
  openrouter → SecureStore["openrouter_api_key"]
  lmstudio   → SecureStore["lmstudio_api_token"]
```

Keys are the user's own (bring your own keys); nothing passes through an Intrinsic Labs server.

### Agent Isolation

- Agents cannot access each other's credentials
- Model agents only see content in their context window
- Loom-aware tools are scoped to tree navigation, not arbitrary data access
