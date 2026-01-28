# AgentRepository

> Manages Agent persistence.

---

## Operations

### create

Creates a new Agent.

**Input:**
- `name` — string, display name
- `type` — enum: `human` | `model`
- `modelRef` — string, required if `type: model`, null if `type: human`
- `configuration` — AgentConfiguration object:
  - `systemPrompt` — optional string
  - `temperature` — optional number (0.0-2.0)
  - `maxTokens` — optional number
  - `stopSequences` — optional array of strings
  - `customParameters` — optional key-value map
- `permissions` — AgentPermissions object:
  - `read` — boolean (default: true)
  - `write` — boolean (default: true)
- `loomAware` — boolean

**Behavior:**
- Generates id and timestamps
- `modelRef` must be null for human agents
- `modelRef` must be provided for model agents

**Returns:** Created Agent

---

### findById

Retrieves an Agent by ID.

**Input:**
- `id` — ULID

**Returns:** Agent or null

---

### findByType

Lists Agents by type with optional filtering and pagination.

**Input:**
- `type` — enum: `human` | `model`
- `filters` — optional object:
  - `archived` — boolean, filter by archive status
  - `loomAware` — boolean, filter by Loom-Aware setting
- `pagination` — optional object:
  - `limit` — number
  - `offset` — number

**Returns:** Array of Agents, total count

---

### findByModelRef

Finds all Agents using a specific model reference.

**Input:**
- `modelRef` — string (e.g., `anthropic:claude-sonnet-4-20250514`)

**Behavior:**
- Useful for finding all Agent configurations for a given model

**Returns:** Array of Agents

---

### update

Updates Agent properties.

**Input:**
- `id` — ULID
- `changes` — object with optional fields:
  - `name` — string
  - `configuration` — AgentConfiguration object
  - `permissions` — AgentPermissions object
  - `loomAware` — boolean

**Behavior:**
- Updates `updatedAt` timestamp
- Cannot change `type` or `modelRef` after creation

**Returns:** Updated Agent

---

### archive

Soft-deletes an Agent.

**Input:**
- `id` — ULID

**Behavior:**
- Sets `archivedAt` to current timestamp

**Returns:** Boolean success

---

### restore

Restores an archived Agent.

**Input:**
- `id` — ULID

**Behavior:**
- Clears `archivedAt`

**Returns:** Boolean success

---

### findOwner

Finds the owner (human) Agent for the app.

**Behavior:**
- Returns the primary human Agent referenced by `Grove.ownerAgentId`
- There is exactly one owner Agent per app installation

**Returns:** Owner Agent

---

## Related Documentation

- [Agents Model](../../model/agents.md) — Entity definition
- [User Preferences Repository](./user-preferences-repository.md) — App-wide preferences
- [Local Model Repository](./local-model-repository.md) — Local model definitions