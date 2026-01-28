# UserPreferencesRepository

> Manages the singleton UserPreferences record for app-wide user settings.

---

## Overview

UserPreferences is a **singleton** — exactly one record exists per app installation. This repository provides access to app-wide preferences that are not tied to any specific Agent or Grove.

---

## Operations

### get

Retrieves the UserPreferences record, creating it with defaults if not exists.

**Input:** None

**Behavior:**
- Returns existing UserPreferences if present
- Creates with default values if not present (first access)
- Guarantees a record always exists after this call

**Default Values:**
- `displayName` — "Human"
- `email` — null
- `avatarRef` — null
- `defaultVoiceModeEnabled` — false
- `defaultTemperature` — null
- `theme` — `system`
- `fontSize` — 16
- `fontFace` — system default
- `nodeViewStyle` — `filled`
- `nodeViewCornerRadius` — 12
- `verboseErrorAlerts` — false

**Returns:** UserPreferences record

---

### update

Updates UserPreferences fields.

**Input:**
- `changes` — object with optional fields:
  - `displayName` — string, user's chosen name
  - `email` — string, for future account/sync features
  - `avatarRef` — string, reference to avatar image in media storage
  - `defaultVoiceModeEnabled` — boolean
  - `defaultTemperature` — number (0.0-2.0), preferred temperature for new model agents
  - `theme` — enum: `light` | `dark` | `system`
  - `fontSize` — number, UI text size in points
  - `fontFace` — string, UI font family name
  - `nodeViewStyle` — enum: `filled` | `outlined`
  - `nodeViewCornerRadius` — number (0-28)
  - `verboseErrorAlerts` — boolean, show detailed error info

**Behavior:**
- Updates `updatedAt` timestamp
- Only updates provided fields (partial update)

**Returns:** Updated UserPreferences

---

## Constraints

- **No create operation** — the singleton is created automatically on first `get()`
- **No delete operation** — the singleton persists for app lifetime
- **Not linked to Grove or Agent** — it's truly global app state
- **One record per installation** — enforced at repository level

---

## Design Rationale

Previous versions had a separate `Human` entity that Agents referenced. This was simplified because:

- MVP is single-user — no need to model multiple humans locally
- Human-specific preferences are app-wide, not per-Agent
- The Agent abstraction already handles identity for authorship
- Future multi-user (collaboration) will be server-mediated, not local

UserPreferences captures what's truly app-wide (theme, font size, etc.) while Agent handles identity and authorship within the tree.

---

## Properties Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | ULID | generated | Primary identifier (singleton) |
| `displayName` | string | "Human" | User's chosen name |
| `email` | string? | null | For future account features |
| `avatarRef` | string? | null | Reference to avatar image |
| `defaultVoiceModeEnabled` | boolean | false | Voice Mode default state |
| `defaultTemperature` | number? | null | Default for new model agents |
| `theme` | enum | `system` | `light` \| `dark` \| `system` |
| `fontSize` | number | 16 | UI text size in points |
| `fontFace` | string | system | UI font family |
| `nodeViewStyle` | enum | `filled` | `filled` \| `outlined` |
| `nodeViewCornerRadius` | number | 12 | 0-28 range |
| `verboseErrorAlerts` | boolean | false | Show detailed errors |
| `createdAt` | timestamp | generated | When created |
| `updatedAt` | timestamp | generated | When last updated |

---

## Related Documentation

- [Agents Model](../../model/agents.md) — Agent entity (uses displayName as default)
- [Agent Repository](./agent-repository.md) — Agent persistence
- [Grove Repository](./grove-repository.md) — Grove persistence