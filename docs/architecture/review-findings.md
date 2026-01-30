# Architecture Review Findings

> Pre-development review conducted to identify discrepancies, conflicts, and gaps in the specification. This is a working document — items are resolved through spec updates or deferred decisions.

**Review Date**: Pre-development  
**Status**: Active

---

## Summary

| Severity | Total | Resolved | Needs Work | Deferred |
|----------|-------|----------|------------|----------|
| Critical | 3 | 3 | 0 | 0 |
| Important | 5 | 5 | 0 | 0 |
| Medium | 4 | 3 | 0 | 2 |
| Minor | 5 | 3 | 0 | 2 |

---

## Critical Issues

### C1. Buffer Mode Has No Structural Model

**Status**: ✅ Resolved

**Location**: [domain-language](../../domain-language/interaction-modes.md#buffer-mode), [core-entities.md](./model/core-entities.md)

**Problem**: Buffer Mode is described philosophically but not structurally. The Node model looks identical for both Dialogue and Buffer modes, but Buffer Mode has fundamentally different semantics:

- What constitutes a Node in Buffer Mode?
- How is human vs model authorship tracked within continuous text?
- How does branching work mid-document?

**Impact**: Cannot implement Buffer Mode without this specification.

**Resolution**: Created [buffer-mode.md](./specs/buffer-mode.md) specification.

**Completed**: Full specification covering:
- **Node creation**: Generation-based (working buffer commits on generate, model responses become nodes)
- **Authorship tracking**: Node-level authorship with character-level visual distinction (model text colored, human edits shown via diff)
- **Two distinct operations**: 
  - **Editing** creates version nodes (`editedFrom` relationship) — downstream nodes preserved via hyperedge
  - **Branching** creates sibling nodes — each with potentially different downstream
- **Hypergraph support**: Edges can have multiple sources, enabling edits without downstream node duplication
- See [buffer-mode-questions.md](./specs/buffer-mode-questions.md) for decision history

---

### C2. Context Window Construction Not Specified

**Status**: ✅ Resolved

**Location**: [domain-language](../../domain-language/context-memory.md#context-window), [llm-provider.md](./contracts/llm-provider.md)

**Problem**: The algorithm for assembling context sent to models is referenced but never defined:

- How do `LoomTree.systemContext` and `Agent.systemPrompt` combine?
- How are multi-source edges (with roles) ordered?
- What's the truncation strategy when path exceeds context window?
- How are `excluded` nodes and annotations filtered?

**Impact**: Cannot implement continuation generation without this specification.

**Resolution**: Created [context-assembly.md](./specs/context-assembly.md) specification.

**Completed**: Full specification covering:
- **System context combination**: Agent-level first, then Tree-level (more specific context closer to messages)
- **Multi-source edge roles**: Instruction (appended to system context), Context (before primary), Primary (main message)
- **Three truncation strategies**: `truncateMiddle` (preserve start + end), `rollingWindow` (recent only), `stopAtLimit` (fail if exceeded)
- **User-configurable options**: Truncation strategy, minimum recent nodes to preserve, token buffer for response
- **Exclusion filtering**: Nodes with `excluded`/`pruned` metadata, annotation edges filtered by default
- **Mode-specific assembly**: Dialogue Mode (messages array) vs Buffer Mode (concatenated document, no system context by default)

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

**Status**: ✅ Resolved

**Location**: [provenance.md](./model/provenance.md#hash-chain-computation), [llm-provider.md](./contracts/llm-provider.md#raw-response-capture)

**Problem**: Spec claims hash is computed over "raw HTTP response bytes exactly as received from the wire." For streaming (SSE), there are no such bytes — the response is assembled from events.

**Impact**: Doesn't invalidate provenance, but overstates the guarantee for streaming responses.

**Resolution**: Added clarifying note to [provenance.md](./model/provenance.md) acknowledging streaming responses are assembled from SSE events. Hash is computed over the fully assembled response content after stream completes — still strong evidence but not wire-identical bytes.

---

### I3. Loom-Aware Tools Not Specified

**Status**: ✅ Resolved

**Location**: [domain-language](../../domain-language/interaction-modes.md#loom-aware), [llm-provider.md](./contracts/llm-provider.md)

**Problem**: Loom-Aware agents can "perform tree operations via tool calls" but no tool definitions provided.

**Impact**: Cannot implement Loom-Aware model agents without tool specifications.

**Resolution**: Created [loom-tools.md](./specs/loom-tools.md) specification.

**Completed**: Full specification covering:
- **Tool syntax**: Natural language `→` prefix commands with batching support
- **Ambient context**: Lightweight position metadata in each turn
- **Navigation tools**: view, list, tree, switch
- **Content tools**: continue (invoke subject), respond (add own content), annotate, link, edit
- **Document tools**: read, write
- **Memory tools**: pin, stash, recall, drop, memory
- **Meta tools**: help, think (scratchpad)
- **Permissions**: Modular capability tiers (loom_aware, loom_write, loom_generate, doc_read, doc_write)
- **Error handling**: Structured errors with codes and hints
- **Summary generation**: Strategy for Node, Document, and LoomTree summaries
- **Node.localId**: Short identifier for efficient context usage (added to core-entities.md)

---

### I4. Web Search Tool Not Specified

**Status**: 🟡 Needs Work

**Location**: [use-cases](../../use-cases/creation-collaboration.md#22-collaborative-problem-solving)

**Problem**: Web search listed as "Required Tool" but no contract specification exists.

**Decision**: Implement as custom Aspen Grove service (not provider-specific plugin) for cross-provider consistency. Use external search API (Tavily, SerpAPI, or Brave Search).

**Resolution**: Create [web-search.md](./contracts/web-search.md) service contract.

---

### I5. Node Editing Contradicts Immutability

**Status**: ✅ Resolved

**Location**: [domain-language](../../domain-language/core-concepts.md#node), [use-cases](../../use-cases/creation-collaboration.md#21-buffer-mode-writing)

**Problem**: Nodes are declared immutable, but Buffer Mode describes "inline editing."

**Resolution**: Buffer Mode has specific editing semantics that preserve immutability:
- **Working buffer**: Mutable uncommitted text at document end — not yet a node
- **Editing committed nodes**: Creates a new *version node* with `editedFrom` relationship to original
- **Hyperedge support**: Downstream nodes connect via hyperedge that accepts any version, so editing doesn't require duplicating downstream nodes
- Original nodes remain immutable; edits create new nodes

See [buffer-mode.md](./specs/buffer-mode.md) for full specification.

---

## Medium Priority Issues

### M1. Two-Role Pattern UI Not Specified

**Status**: 🔵 Deferred

**Location**: [use-cases](../../use-cases/exploration-study.md#15-assisted-exploration-two-role-pattern)

**Problem**: The Subject + Collaborator pattern is compelling but UI/UX is undefined.

**Decision**: Defer detailed spec until wireframing. Mental model: IDE with agent panel — both work on visible content, can discuss at meta level. Current data model supports this.

**Notes**: 
- Primary view: Loom Tree (the "file")
- Secondary view: Meta-discussion with Collaborator (slide-over or bottom sheet)
- Both agents can reference specific nodes

---

### M2. Voice Mode Edge Cases

**Status**: ✅ Resolved

**Location**: [domain-language](../../domain-language/interaction-modes.md#voice-mode)

**Problem**: Several edge cases undefined:
- What if user takes >4 seconds to think?
- How to recover from connection drops?
- How to indicate "I'm still thinking, don't stop listening"?

**Resolution**: Added comprehensive Voice Mode specification including:
- **Think mode**: Pause button suspends timeout, user can think as long as needed, resume when ready
- **Connection drops**: Interrupt TTS, speak error aloud, user retries manually
- **Silence timeout**: 4 seconds of silence sends (if spoke) or ends voice chat (if nothing said)
- **Button states**: Dictation/Pause/Resume button next to send, context-dependent behavior
- **Voice chat ending**: Voice Mode stays ON, user re-engages via dictation button

---

### M3. Provenance QR Code Scope

**Status**: ✅ Resolved

**Location**: [use-cases](../../use-cases/exploration-study.md#16-provenance-verification)

**Problem**: QR code feature implied a web verification service.

**Resolution**: QR code is for **local verification between Aspen Grove instances**. Data encoded in QR, scanned by another Aspen Grove app which verifies locally. No web service required.

**Completed**: Updated use-cases/exploration-study.md to clarify QR encodes data directly, verification is device-to-device, no web service required. Marked as post-MVP feature.

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

### m2. Tag Case Sensitivity

**Status**: ✅ Resolved

**Location**: [organization.md](./model/organization.md#tag), [repositories](./contracts/repositories/tag-repository.md)

**Problem**: Original spec stated tags are case-insensitive unique, but this adds implementation complexity.

**Resolution**: Tags are now **case-sensitive**. `#Claude` and `#claude` are different tags. This is simpler to implement, respects user intent, and is consistent with most tagging systems.

**Completed**: Updated tag-repository.md to specify case-sensitive uniqueness and exact matching.

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

**Location**: [use-cases](../../use-cases/knowledge-management.md#33-exporting-and-sharing)

**Problem**: Markdown, JSON, PDF exports mentioned but contents not specified.

**Decision**: Defer to implementation. Consider dedicated spec if export fidelity matters for provenance story.

---

### m5. Field Guide Storage

**Status**: ✅ Resolved

**Location**: [domain-language](../../domain-language/field-guide.md)

**Problem**: Field Guide content storage not specified.

**Resolution**: Field Guide content fetched from headless CMS (Sanity). Not bundled in app, not user-editable. Allows content updates without app releases.

**Action**: Add note to domain-language.md.

---

## Action Items

### Immediate (Before Development)

1. [x] Create [specs/buffer-mode.md](./specs/buffer-mode.md) — resolve C1 ✓
2. [x] Create [specs/context-assembly.md](./specs/context-assembly.md) — resolve C2 ✓
3. [x] Update [media-storage.md](./contracts/media-storage.md) with Document paths — resolve C3 ✓
4. [x] Update [core-entities.md](./model/core-entities.md) to remove `link` edge type — resolve I1 ✓
5. [x] Update [agents.md](./model/agents.md) to simplify Human/Agent model — resolve m3 ✓
6. [x] Update [core-entities.md](./model/core-entities.md) with `editedFrom` field and hyperedge support — per buffer-mode.md ✓

### Before Related Features

7. [x] Create [specs/loom-tools.md](./specs/loom-tools.md) — resolve I3 ✓
8. [ ] Create [contracts/web-search.md](./contracts/web-search.md) — resolve I4
8. [x] Add streaming clarification to [provenance.md](./model/provenance.md) — resolve I2 ✓
9. [x] Add Voice Mode edge cases to [interaction-modes.md](../../domain-language/interaction-modes.md) — resolve M2 ✓
10. [x] Update tag case sensitivity in [repositories](./contracts/repositories/tag-repository.md) — resolve m2 ✓

### Documentation Updates

11. [x] Clarify Provenance QR scope in [use-cases](../../use-cases/exploration-study.md#16-provenance-verification) — resolve M3 ✓
12. [x] Add Field Guide CMS note to [domain-language](../../domain-language/field-guide.md) — resolve m5 ✓

---

## File Organization Notes

Several files have been reorganized into directory structures:

- ✅ `domain-language.md` → `domain-language/` directory with focused documents
- ✅ `use-cases.md` → `use-cases/` directory with focused documents
- ✅ `repositories.md` → `contracts/repositories/` directory with one file per repository
- `agents.md` — could split provider adapters into separate files (deferred)