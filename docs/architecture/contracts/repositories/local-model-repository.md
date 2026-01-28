# LocalModelRepository

> Manages persistence for user-defined local and custom models.

---

## Overview

Remote provider models (OpenRouter, Anthropic, OpenAI, Google, Hyperbolic) are fetched dynamically via `ModelCatalogService` — see [LLM Provider Contracts](../llm-provider.md). Local models (Ollama, LM Studio, llama.cpp, custom endpoints) have no remote catalog and require user-defined persistence.

*Note: User customization of models (display names, default parameters, etc.) is handled at the Agent level, not the Model level. See [AgentRepository](./agent-repository.md).*

---

## Operations

### create

Creates a new LocalModel definition.

**Input:**
- `identifier` — string, user-defined model name (e.g., `llama3:70b`, `my-fine-tune`)
- `provider` — enum: `local` | `custom`
- `endpoint` — string, full URL to the model endpoint
- `authConfig` — optional AuthConfig object:
  - `type` — enum: `none` | `bearer` | `basic`
  - `credentialRef` — optional string, reference to credential in secure storage
- `capabilities` — ModelCapabilities object (user-specified):
  - `supportsImages` — boolean
  - `supportsAudio` — boolean
  - `supportsToolUse` — boolean
  - `maxContextTokens` — number
  - `maxOutputTokens` — number

**Behavior:**
- Generates id and timestamps
- Validates endpoint is a valid URL
- Capabilities must be manually configured (cannot be introspected)

**Returns:** Created LocalModel

---

### findById

Retrieves a LocalModel by ID.

**Input:**
- `id` — ULID

**Returns:** LocalModel or null

---

### findAll

Lists all LocalModels with optional filtering.

**Input:**
- `filters` — optional object:
  - `provider` — `local` | `custom`, filter by provider type

**Returns:** Array of LocalModels

---

### findByIdentifier

Finds a LocalModel by its user-defined identifier.

**Input:**
- `identifier` — string

**Behavior:**
- Identifier should be unique but is not strictly enforced
- Returns first match if duplicates exist

**Returns:** LocalModel or null

---

### update

Updates LocalModel properties.

**Input:**
- `id` — ULID
- `changes` — object with optional fields:
  - `identifier` — string
  - `endpoint` — string
  - `authConfig` — AuthConfig object
  - `capabilities` — ModelCapabilities object

**Behavior:**
- Updates `updatedAt` timestamp
- Validates endpoint if changed

**Returns:** Updated LocalModel

---

### delete

Removes a LocalModel definition.

**Input:**
- `id` — ULID

**Behavior:**
- Removes LocalModel record
- Does not affect Agents referencing this model (they will have invalid `modelRef`)
- Consider warning user if Agents reference this model

**Returns:** Boolean success

---

## LocalModel Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | ULID | Primary identifier |
| `identifier` | string | User-defined model name (e.g., "llama3:70b") |
| `provider` | enum | `local` \| `custom` |
| `endpoint` | string | Full URL to the model endpoint |
| `authConfig` | AuthConfig? | Authentication configuration |
| `capabilities` | ModelCapabilities | User-specified capabilities |
| `createdAt` | timestamp | When created |
| `updatedAt` | timestamp | When last updated |

---

## AuthConfig Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | enum | `none` \| `bearer` \| `basic` |
| `credentialRef` | string? | Reference to credential in secure storage |

---

## ModelCapabilities Properties

| Property | Type | Description |
|----------|------|-------------|
| `supportsImages` | boolean | Can process image inputs |
| `supportsAudio` | boolean | Can process audio inputs |
| `supportsToolUse` | boolean | Can use function/tool calling |
| `maxContextTokens` | number | Maximum context window size |
| `maxOutputTokens` | number | Maximum response length |

---

## Model Reference Format

When Agents reference a LocalModel, the `modelRef` format is:

```
local:{ulid}
```

Example: `local:01HQ3K4N7Y8M2P5R6T9W0X1Z2A`

This distinguishes local models from remote models which use:

```
{provider}:{identifier}
```

Example: `anthropic:claude-sonnet-4-20250514`

---

## Network Accessibility

LocalModels require network-accessible endpoints, which can be challenging for mobile users with home servers.

**Limitations:**
- Mobile device must reach the endpoint
- Local network models only work when on same network
- Requires port forwarding, VPN, or tunneling for remote access

**Suggested Solutions (for users):**
- Tailscale or other mesh VPN
- Dynamic DNS with port forwarding
- Cloud-hosted inference (becomes `custom` provider)
- ngrok or similar tunneling services

Document these limitations in Field Guide and setup flow.

---

## Capability Introspection

Unlike remote models, local model capabilities **cannot be introspected automatically**. Users must configure these manually or accept defaults.

**Default Capabilities (if not specified):**
- `supportsImages` — false
- `supportsAudio` — false
- `supportsToolUse` — false
- `maxContextTokens` — 4096
- `maxOutputTokens` — 2048

Consider providing presets for common local model setups (Ollama, LM Studio, etc.).

---

## Related Documentation

- [Agents Model](../../model/agents.md) — Agent entity and modelRef
- [Agent Repository](./agent-repository.md) — Agent persistence
- [LLM Provider Contracts](../llm-provider.md) — Remote model catalog service