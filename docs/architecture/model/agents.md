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

### Indexes

- Primary: id
- By type (for filtering humans vs models)
- By modelRef (for finding all agents using a given model)
- By archivedAt null (for active agents only)

---

## Model Reference

The `modelRef` field on Agent stores a reference to the underlying model. The format depends on provider type:

### Remote Models

For models from remote providers (OpenRouter, Anthropic, OpenAI, Google, Hyperbolic), `modelRef` stores a composite key:

```
{provider}:{identifier}
```

Examples:
- `openrouter:claude-sonnet-4-20250514`
- `anthropic:claude-3-5-haiku-20241022`
- `openai:gpt-4o`
- `google:gemini-1.5-pro`

The [ModelCatalogService](../contracts/llm-provider.md#modelcatalogservice) resolves this to full model metadata at runtime.

### Local Models

For user-defined local models, `modelRef` stores the LocalModel's ULID:

```
local:{ulid}
```

Example: `local:01HQ3K4N7Y8M2P5R6T9W0X1Z2A`

See [LocalModelRepository](../contracts/repositories.md#localmodelrepository) for local model persistence.

---

## UserPreferences

App-wide user preferences stored as a singleton. Not tied to any specific Agent.

### Properties

- **id** — ULID, primary identifier (singleton — only one record exists)
- **displayName** — string, user's chosen name (used as default for human Agent names)
- **email** — optional string, for future account/sync features
- **avatarRef** — optional string, reference to avatar image in media storage
- **defaultVoiceModeEnabled** — boolean, default false
- **defaultTemperature** — optional number, preferred temperature for new model agents
- **theme** — enum: `light` | `dark` | `system`, default `system`
- **fontSize** — number, UI text size in points, default 16
- **fontFace** — string, UI font family name
- **nodeViewStyle** — enum: `filled` | `outlined`, default `filled`
- **nodeViewCornerRadius** — number, 0-28, default 12
- **verboseErrorAlerts** — boolean, show detailed error info, default false
- **createdAt** — timestamp
- **updatedAt** — timestamp

### Constraints

- Exactly one UserPreferences record exists per app installation
- Created automatically on first launch with sensible defaults
- Not linked to Grove or Agent — it's truly global

### Design Notes

Previous versions had a separate `Human` entity that Agents referenced. This was simplified because:

- MVP is single-user — no need to model multiple humans locally
- Human-specific preferences are app-wide, not per-Agent
- The Agent abstraction already handles identity for authorship
- Future multi-user (collaboration) will be server-mediated, not local

---

## Model (Remote — from Catalog)

Remote models are not persisted locally. They're fetched dynamically from provider catalogs via [ModelCatalogService](../contracts/llm-provider.md#modelcatalogservice).

### Properties (Runtime Only)

- **identifier** — string, the model ID used in API requests
- **provider** — enum: `openrouter` | `hyperbolic` | `anthropic` | `openai` | `google`
- **displayName** — string, human-friendly name from provider
- **description** — optional string, provider's model description
- **capabilities** — ModelCapabilities object
- **pricing** — optional PricingInfo (input/output cost per million tokens)

### Why Not Persisted?

- Models change frequently (new versions, deprecations)
- Pricing and capabilities update without app releases
- Catalog is cached with TTL for offline access
- Reduces maintenance burden

---

## LocalModel (Persisted)

User-defined models for local inference servers or custom endpoints.

### Properties

- **id** — ULID, primary identifier
- **identifier** — string, user-defined model name (e.g., `llama3:70b`, `my-fine-tune`)
- **provider** — enum: `local` | `custom`
- **endpoint** — string, full URL to the model endpoint
- **authConfig** — optional AuthConfig object
- **capabilities** — ModelCapabilities object (user-specified)
- **createdAt** — timestamp
- **updatedAt** — timestamp

### AuthConfig Properties

- **type** — enum: `none` | `bearer` | `basic`
- **credentialRef** — optional string, reference to credential in secure storage

### Constraints

- `identifier` should be unique within the app (not enforced, but recommended)
- `endpoint` must be network-accessible from the mobile device
- `capabilities` must be manually configured (cannot be introspected)

### Indexes

- Primary: id
- By provider (for filtering `local` vs `custom`)
- By identifier (for lookup)

*See [LocalModelRepository](../contracts/repositories.md#localmodelrepository) for persistence operations.*

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
- **Content**: continue (invoke subject model), respond (add own content), annotate, link, edit, bookmark, prune
- **Documents**: read, write
- **Memory**: pin, stash, recall, drop, memory
- **Meta**: help, think (private scratchpad)

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

Pre-configured templates shown when user adds API credentials:

| Template | modelRef | temperature | Notes |
|----------|----------|-------------|-------|
| Claude (Balanced) | `anthropic:claude-sonnet-4-20250514` | 0.7 | Good all-around |
| Claude (Creative) | `anthropic:claude-sonnet-4-20250514` | 1.0 | Higher variance |
| Claude (Precise) | `anthropic:claude-sonnet-4-20250514` | 0.3 | Lower variance |
| GPT-4o | `openai:gpt-4o` | 0.7 | OpenAI flagship |
| Gemini Pro | `google:gemini-1.5-pro` | 0.7 | Google flagship |

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
Provider credentials:
  anthropic → Keychain["anthropic_api_key"]
  openai → Keychain["openai_api_key"]
  openrouter → Keychain["openrouter_api_key"]
  ...

LocalModel.authConfig.credentialRef:
  "local_model_{ulid}" → Keychain["local_model_{ulid}"]
```

### Agent Isolation

- Agents cannot access each other's credentials
- Model agents only see content in their context window
- Loom-aware tools are scoped to tree navigation, not arbitrary data access