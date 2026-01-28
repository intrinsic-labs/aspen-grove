# Architecture Review Findings

> Pre-development review conducted to identify discrepancies, conflicts, and gaps in the specification. This is a working document — items are resolved through spec updates or deferred decisions.

**Review Date**: Pre-development  
**Status**: Active

---

## Summary

| Severity | Total | Resolved | Needs Work | Deferred |
|----------|-------|----------|------------|----------|
| Critical | 3 | 1 | 2 | 0 |
| Important | 5 | 2 | 3 | 0 |
| Medium | 4 | 1 | 1 | 2 |
| Minor | 5 | 2 | 1 | 2 |

---

## Critical Issues

### C1. Buffer Mode Has No Structural Model

**Status**: 🔴 Needs Work

**Location**: [domain-language.md](../../domain-language.md#buffer-mode), [core-entities.md](./model/core-entities.md)

**Problem**: Buffer Mode is described philosophically but not structurally. The Node model looks identical for both Dialogue and Buffer modes, but Buffer Mode has fundamentally different semantics:

- What constitutes a Node in Buffer Mode?
- How is human vs model authorship tracked within continuous text?
- How does branching work mid-document?

**Impact**: Cannot implement Buffer Mode without this specification.

**Resolution**: Create dedicated Buffer Mode specification. See [buffer-mode-questions.md](./specs/buffer-mode-questions.md) for open questions to resolve.

---

### C2. Context Window Construction Not Specified

**Status**: 🔴 Needs Work

**Location**: [domain-language.md](../../domain-language.md#context-window), [llm-provider.md](./contracts/llm-provider.md)

**Problem**: The algorithm for assembling context sent to models is referenced but never defined:

- How do `LoomTree.systemContext` and `Agent.systemPrompt` combine?
- How are multi-source edges (with roles) ordered?
- What's the truncation strategy when path exceeds context window?
- How are `excluded` nodes and annotations filtered?

**Impact**: Cannot implement continuation generation without this specification.

**Resolution**: Create [context-assembly.md](./specs/context-assembly.md).

---

### C3. Document Media Storage Path Undefined

**Status**: ✅ Resolved

**Location**: [media-storage.md](./contracts/media-storage.md), [organization.md](./model/organization.md)

**Problem**: Media storage organizes files by `loomTreeId`, but Documents also support ImageBlock and AudioBlock content. No path structure defined for Document media.

**Impact**: Cannot implement Document media without this clarification.

**Resolution**: Updated [media-storage.md](./contracts/media-storage.md) directory structure:

```
media/
├── loomtrees/{loomTreeId}/...
├── documents/{documentId}/...
```

**Completed**: Updated media-storage.md with new directory structure and modified store/delete operations to accept `parentType` and `parentId` parameters.

---

## Important Issues

### I1. Edge vs Link Entity Confusion

**Status**: ✅ Resolved

**Location**: [core-entities.md](./model/core-entities.md#edge), [organization.md](./model/organization.md#link)

**Problem**: Contradictory statements about when to use Edge (type=link) vs Link entity for cross-references.

**Resolution**: 
- **Remove `link` from Edge types.** Edges are only `continuation` and `annotation`.
- **All cross-references use the Link entity** (Node↔Document, LoomTree↔Document, cross-tree Node references).
- Edge constraint simplified: "All Edge sources and targets must belong to the same LoomTree" — no exceptions.

**Completed**: Removed `link` from Edge types in core-entities.md. Edge constraint now reads "All Edge sources and targets must belong to the same LoomTree" with no exceptions.

---

### I2. Streaming Provenance Hash Overstates Guarantee

**Status**: 🟡 Needs Work

**Location**: [provenance.md](./model/provenance.md#hash-chain-computation), [llm-provider.md](./contracts/llm-provider.md#raw-response-capture)

**Problem**: Spec claims hash is computed over "raw HTTP response bytes exactly as received from the wire." For streaming (SSE), there are no such bytes — the response is assembled from events.

**Impact**: Doesn't invalidate provenance, but overstates the guarantee for streaming responses.

**Resolution**: Add clarifying note to [provenance.md](./model/provenance.md) acknowledging streaming responses are assembled. Hash is over assembled content, which is still strong evidence but not byte-identical to wire format.

---

### I3. Loom-Aware Tools Not Specified

**Status**: 🟡 Needs Work

**Location**: [domain-language.md](../../domain-language.md#loom-aware), [llm-provider.md](./contracts/llm-provider.md)

**Problem**: Loom-Aware agents can "perform tree operations via tool calls" but no tool definitions provided.

**Impact**: Cannot implement Loom-Aware model agents without tool specifications.

**Resolution**: Create [loom-tools.md](./contracts/loom-tools.md) specifying tool definitions for navigation, summarization, and tree operations.

---

### I4. Web Search Tool Not Specified

**Status**: 🟡 Needs Work

**Location**: [use-cases.md](../../use-cases.md) (§2.2 Collaborative Problem-Solving)

**Problem**: Web search listed as "Required Tool" but no contract specification exists.

**Decision**: Implement as custom Aspen Grove service (not provider-specific plugin) for cross-provider consistency. Use external search API (Tavily, SerpAPI, or Brave Search).

**Resolution**: Create [web-search.md](./contracts/web-search.md) service contract.

---

### I5. Node Editing Contradicts Immutability

**Status**: ✅ Resolved (pending Buffer Mode spec)

**Location**: [domain-language.md](../../domain-language.md#node), [use-cases.md](../../use-cases.md) (§2.1 Buffer Mode Writing)

**Problem**: Nodes are declared immutable, but Buffer Mode describes "inline editing."

**Resolution**: This is a Buffer Mode-specific concern. Resolution depends on Buffer Mode structural model (see C1). Likely approach: Buffer Mode has different editing semantics, possibly with mutable draft state before "commit."

---

## Medium Priority Issues

### M1. Two-Role Pattern UI Not Specified

**Status**: 🔵 Deferred

**Location**: [use-cases.md](../../use-cases.md) (§1.5 Assisted Exploration)

**Problem**: The Subject + Collaborator pattern is compelling but UI/UX is undefined.

**Decision**: Defer detailed spec until wireframing. Mental model: IDE with agent panel — both work on visible content, can discuss at meta level. Current data model supports this.

**Notes**: 
- Primary view: Loom Tree (the "file")
- Secondary view: Meta-discussion with Collaborator (slide-over or bottom sheet)
- Both agents can reference specific nodes

---

### M2. Voice Mode Edge Cases

**Status**: 🟡 Needs Work

**Location**: [domain-language.md](../../domain-language.md#voice-mode)

**Problem**: Several edge cases undefined:
- What if user takes >4 seconds to think?
- How to recover from connection drops?
- How to indicate "I'm still thinking, don't stop listening"?

**Resolution**: Add "Edge Cases & Recovery" subsection to Voice Mode spec.

---

### M3. Provenance QR Code Scope

**Status**: ✅ Resolved

**Location**: [use-cases.md](../../use-cases.md) (§1.6 Provenance Verification)

**Problem**: QR code feature implied a web verification service.

**Resolution**: QR code is for **local verification between Aspen Grove instances**. Data encoded in QR, scanned by another Aspen Grove app which verifies locally. No web service required.

**Action**: Clarify in use-cases.md. Mark as post-MVP.

---

### M4. RFC 3161 Failure UX

**Status**: 🔵 Deferred

**Location**: [provenance.md](./model/provenance.md)

**Problem**: No specification for what users see when timestamp requests fail.

**Decision**: Defer to implementation. Add brief "Failure States" section during development.

---

## Minor Issues

### m1. Local Model Network Accessibility

**Status**: 🔵 Deferred

**Location**: [agents.md](./model/agents.md#localadapter)

**Problem**: Local models require network-accessible endpoints, which is a significant constraint for mobile users with home servers.

**Resolution**: Document limitation in Field Guide and setup flow. Suggest solutions (Tailscale, dynamic DNS). No spec change needed.

---

### m2. Tag Case-Insensitivity Implementation

**Status**: 🟡 Needs Work

**Location**: [organization.md](./model/organization.md#tag), [repositories.md](./contracts/repositories.md#tagrepository)

**Problem**: Tags are case-insensitive unique, but no implementation guidance for SQLite.

**Resolution**: Add implementation note to repositories.md: use `COLLATE NOCASE` or normalize to lowercase on insert.

---

### m3. Human Entity Over-Engineered

**Status**: ✅ Resolved

**Location**: [agents.md](./model/agents.md)

**Problem**: Separate Human entity seems over-engineered for single-user MVP.

**Resolution**: Collapse Human into Agent:
- Remove `Human` entity
- `Agent` with `type: human` stores preferences directly (or references `UserPreferences` singleton)
- `backendId` only applies to `type: model` agents
- One Grove, one owner Agent (default human), multiple configured Agents

**Completed**: 
- Rewrote agents.md with simplified model
- Added `UserPreferences` singleton for app-wide preferences
- Changed `Agent.backendId` to `Agent.modelRef` (null for human agents)
- Updated repositories.md: replaced `HumanRepository` with `UserPreferencesRepository`
- Updated organization.md: `Grove.ownerId` → `Grove.ownerAgentId`

---

### m4. Export Formats Not Specified

**Status**: 🔵 Deferred

**Location**: [use-cases.md](../../use-cases.md) (§3.3 Exporting and Sharing)

**Problem**: Markdown, JSON, PDF exports mentioned but contents not specified.

**Decision**: Defer to implementation. Consider dedicated spec if export fidelity matters for provenance story.

---

### m5. Field Guide Storage

**Status**: ✅ Resolved

**Location**: [domain-language.md](../../domain-language.md#field-guide)

**Problem**: Field Guide content storage not specified.

**Resolution**: Field Guide content fetched from headless CMS (Sanity). Not bundled in app, not user-editable. Allows content updates without app releases.

**Action**: Add note to domain-language.md.

---

## Action Items

### Immediate (Before Development)

1. [ ] Create [specs/buffer-mode.md](./specs/buffer-mode.md) — resolve C1
2. [ ] Create [specs/context-assembly.md](./specs/context-assembly.md) — resolve C2
3. [x] Update [media-storage.md](./contracts/media-storage.md) with Document paths — resolve C3 ✓
4. [x] Update [core-entities.md](./model/core-entities.md) to remove `link` edge type — resolve I1 ✓
5. [x] Update [agents.md](./model/agents.md) to simplify Human/Agent model — resolve m3 ✓

### Before Related Features

6. [ ] Create [contracts/loom-tools.md](./contracts/loom-tools.md) — resolve I3
7. [ ] Create [contracts/web-search.md](./contracts/web-search.md) — resolve I4
8. [ ] Add streaming clarification to [provenance.md](./model/provenance.md) — resolve I2
9. [ ] Add Voice Mode edge cases to [domain-language.md](../../domain-language.md) — resolve M2
10. [ ] Add tag implementation note to [repositories.md](./contracts/repositories.md) — resolve m2

### Documentation Updates

11. [ ] Clarify Provenance QR scope in [use-cases.md](../../use-cases.md) — resolve M3
12. [ ] Add Field Guide CMS note to [domain-language.md](../../domain-language.md) — resolve m5

---

## File Organization Notes

Several existing files are long and monolithic. Consider breaking up during resolution:

- `domain-language.md` — could split Voice Mode into separate spec
- `agents.md` — could split provider adapters into separate files
- `repositories.md` — could split into one file per repository

Apply incrementally as files are touched for other changes.