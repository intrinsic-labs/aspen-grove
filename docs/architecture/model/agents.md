# Agents Model Specification

> Specification for Agent, Human, and Model entities — the participants in Loom Tree interactions.

---

## Agent

The unified abstraction for any entity that can participate in a Loom Tree.

### Properties

- **id** — ULID, primary identifier
- **name** — string, display name
- **type** — enum: `human` | `model`
- **backendId** — ULID, reference to Human or Model record based on type
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

### AgentPermissions Properties

- **read** — boolean, can view Loom Trees and content
- **write** — boolean, can create Nodes, Edges, and perform tree operations

### Constraints

- One Human or Model can back multiple Agents (different configurations)
- Agent is the identity used for Node authorship, not the underlying Human/Model (with the exception of the contentHash field - read more in [core entities](./core-entities.md))
- Permissions default to read: true, write: true for new Agents
- loomAware defaults to false for Model agents, true for Human agents

### Indexes

- Primary: id
- By type (for filtering humans vs models)
- By backendId (for finding all agents using a given Human/Model)
- By archivedAt null (for active agents only)

---

## Human

Backend type for human participants.

### Properties

- **id** — ULID, primary identifier
- **displayName** — string, user's chosen name
- **email** — optional string, for future account features
- **avatarRef** — optional string, reference to avatar image
- **preferences** — HumanPreferences object
- **createdAt** — timestamp
- **updatedAt** — timestamp

### HumanPreferences Properties

- **defaultVoiceModeEnabled** — boolean, default false
- **defaultTemperature** — optional number, preferred temperature for new agents
- **theme** — optional string, UI theme preference
- **fontSize** — number, UI text size preference, default 16
- **fontFace** — string, UI font selection
- **nodeViewStyle** — enum: `filled` | `outlined`
- **nodeViewCornerRadius** — number, in range 0 to 28
- **verboseErrorAlerts** — boolean, defaults to false

### Constraints

- One Human record per app installation (MVP — single user)
- Multiple Agent configurations can reference the same Human
- Human represents the person; Agent represents a "mode" of interaction

### Indexes

- Primary: id

---

## Model

Backend type for LLM agents. Stores only what's needed to call the API.

### Properties

- **id** — ULID, primary identifier
- **identifier** — string, the model name/version (e.g., `claude-sonnet-4-20250514`, `gpt-4o`)
- **provider** — enum: `openrouter` `hyperbolic` | `anthropic` | `openai` | `google` | `local` | `custom`
- **displayName** — string, human-friendly name for UI
- **endpoint** — optional string, API URL (required for `local` and `custom` providers)
- **credentialsRef** — string, reference to secure credential storage (never the key itself)
- **capabilities** — ModelCapabilities object
- **createdAt** — timestamp
- **updatedAt** — timestamp
- **archivedAt** — optional timestamp, soft delete marker

### ModelCapabilities Properties

- **supportsImages** — boolean, can process image inputs
- **supportsAudio** — boolean, can process audio inputs
- **supportsStreaming** — boolean, can stream responses
- **supportsToolUse** — boolean, can use function/tool calling
- **maxContextTokens** — number, maximum context window size
- **maxOutputTokens** — number, maximum response length

### Constraints

- Configuration (temperature, system prompt, etc.) lives on Agent, not Model
- This allows one Model to back multiple differently-configured Agents
- credentialsRef points to secure storage — API keys are never stored in the database
- Provider-specific validation applies (e.g., OpenAI models cannot be called via the Anthropic API)

### Indexes

- Primary: id
- By provider (for listing models by provider)
- By identifier (for finding by model name)
- By archivedAt null (for active models only)

---

## Relationships

### Agent → Human (for human agents)

- Agent.type = `human`
- Agent.backendId references Human.id
- One Human can have many Agents (different interaction modes/configurations)

### Agent → Model (for model agents)

- Agent.type = `model`
- Agent.backendId references Model.id
- One Model can have many Agents (different temperature, prompts, etc.)

### Node → Agent

- Node.authorAgentId references Agent.id
- Every Node has exactly one author Agent
- Query pattern: find all Nodes by a given Agent

---

## Loom-Aware Capabilities

When an Agent has `loomAware = true`, they can access additional context and tools:

### Additional Context Provided

- Current position in tree (depth, branch index)
- Number of siblings at current node
- Whether current node is a branch point
- Path history summary (nodes visited)

### Tools Available (for Model agents)

- Navigate to sibling branches
- Request summary of alternative paths
- View branch point statistics
- Access annotation content

### Design Notes

- Loom-awareness enables a "two-role pattern" (analyst + subject)
- Human agents are loom-aware by default (they see the UI)
- Model agents default to not loom-aware (they see linear conversation)
- This can be toggled per-Agent for flexible experimentation

---

## Default Agents

On first launch, create these default Agents:

### Default Human Agent

- name: Human (editable)
- type: human
- loomAware: true
- permissions: read + write

### Suggested Model Agents (user adds credentials)

- Pre-configured Agent templates for popular models
- User provides API key to activate
- Sensible default configurations per model

---

## Security Considerations

### Credential Storage

- API keys stored in platform secure storage (Keychain on iOS, Keystore on Android)
- credentialsRef is an opaque identifier, not the key
- Keys never logged, never in database, never in state

### Agent Isolation

- Agents cannot access each other's credentials
- Model agents only see what's in their context window
- Loom-aware tools are carefully scoped to tree navigation, not data exfiltration
