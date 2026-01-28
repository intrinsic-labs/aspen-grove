# Conventions

> Technical decisions, naming conventions, and open questions for Aspen Grove development.

---

## Technical Decisions

Key technical decisions are documented in Architecture Decision Records:

- **IDs** — ULIDs for all entities (sortable, unique, compatible with WatermelonDB)
- **Persistence** — WatermelonDB for local-first, offline-capable storage
- **Permissions** — Simple read/write model for MVP

> See [Architecture Decision Records](../architecture/adr/) for full context and rationale.

---

## Naming Conventions

When implementing, use these terms consistently:

| Concept | Variable/Type Name |
|---------|-------------------|
| Loom Tree | `LoomTree` |
| Node | `Node` |
| Edge | `Edge` |
| Path | `Path` |
| Branch Point | `BranchPoint` |
| Active Path | `activePath` |
| Continuation | `Continuation` |
| Sibling | `sibling` / `siblings` |
| Grove | `Grove` |
| Document | `Document` |
| Agent | `Agent` |
| Human | `Human` |
| Model | `Model` |
| Content Hash | `contentHash` |
| Source Role | `SourceRole` |

### Casing Rules

- **Types/Classes** — PascalCase (`LoomTree`, `Node`, `Agent`)
- **Variables/Properties** — camelCase (`activePath`, `contentHash`, `authorAgentId`)
- **Constants** — SCREAMING_SNAKE_CASE (`MAX_CONTEXT_TOKENS`, `DEFAULT_TEMPERATURE`)
- **File names** — kebab-case (`loom-tree.ts`, `content-hash.ts`)

### Naming Principles

1. **Be explicit** — prefer `authorAgentId` over `authorId` when context matters
2. **Avoid abbreviations** — `LoomTree` not `LT`, `contentHash` not `cHash`
3. **Match domain language** — code should read like the spec
4. **Plural for collections** — `siblings`, `tags`, `edges`

---

## Open Questions

These questions are tracked but not yet resolved:

### Cloud Sync Service

Supabase is a candidate for auth + backup + sync. Could also consider encrypted backup to iCloud/Google Drive for simplicity. Decision deferred until sync is needed.

### API Provider Signatures

True proof of model identity requires providers to sign responses. This doesn't exist yet. Worth advocating for as the ecosystem matures.

### Multi-user/Collaboration

Out of scope for MVP, but the Agent abstraction should accommodate it when needed. Future work will need to address:
- Shared Groves
- Permission models beyond read/write
- Conflict resolution for concurrent edits
- Identity and authentication

---

## Code Organization Principles

### Layer Separation

1. **Domain Layer** — entities, value objects, domain logic (no framework dependencies)
2. **Application Layer** — use cases, orchestration (depends on domain)
3. **Infrastructure Layer** — persistence, API clients, platform APIs (implements contracts)
4. **Presentation Layer** — React Native components, screens, navigation

### Dependency Direction

Dependencies flow inward:
- Presentation → Application → Domain
- Infrastructure → Application → Domain
- Never: Domain → Infrastructure

### Contract Pattern

- Application layer defines abstract contracts (interfaces)
- Infrastructure layer provides concrete implementations
- Enables testing with mock implementations
- Enables swapping implementations without changing business logic

---

## Documentation Principles

### Spec Documents

- **Authoritative** — specs are the source of truth
- **Versioned** — include changelog at the bottom
- **Linked** — cross-reference related documents
- **Actionable** — should enable implementation without guesswork

### Code Comments

- **Why, not what** — explain reasoning, not mechanics
- **Link to specs** — reference spec documents for complex behavior
- **TODO format** — `// TODO: [description] — see [issue/spec]`

---

## Related Documentation

- [Architecture Decision Records](../architecture/adr/) — Detailed technical decisions
- [Architecture Overview](../architecture/README.md) — System structure
- [Review Findings](../architecture/review-findings.md) — Tracked issues and resolutions