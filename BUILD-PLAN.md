# Aspen Grove — Build Plan

> Dense, high-level roadmap for implementation. All specs are written; this is the execution plan.

---

## Phase 0: Foundation

**Goal**: Core infrastructure that everything else depends on.

- [ ] Project setup (React Native, TypeScript, ESLint, Prettier)
- [ ] WatermelonDB setup with base schema
- [ ] Secure storage abstraction (Keychain/Keystore)
- [ ] File system abstraction (media storage paths)
- [ ] Navigation shell (tab structure, basic screens)

**Depends on**: Nothing  
**Enables**: Everything else

---

## Phase 1: Core Data Layer 

**Goal**: Entities and repositories — the foundation of all features.

### Domain Layer
- [ ] Entity interfaces (LoomTree, Node, Edge, Agent, Document, etc.)
- [ ] Value objects (Content types, NodeMetadata, EdgeSource)
- [ ] Hash computation utilities (provenance)

### Repository Layer
- [ ] LoomTreeRepository
- [ ] NodeRepository (with `localId` generation, `findByLocalId`)
- [ ] EdgeRepository (with `addVersionSource` for hyperedges)
- [ ] AgentRepository
- [ ] DocumentRepository
- [ ] GroveRepository
- [ ] TagRepository, LinkRepository

### Infrastructure
- [ ] WatermelonDB model implementations
- [ ] Repository implementations
- [ ] Migration system

**Depends on**: Phase 0  
**Enables**: Phase 2, 3

---

## Phase 2: LLM Provider Layer 

**Goal**: Talk to models.

- [ ] LLMProvider interface implementation
- [ ] AnthropicAdapter
- [ ] OpenAIAdapter  
- [ ] OpenRouterAdapter (covers many models)
- [ ] Streaming support
- [ ] Raw response capture (provenance)
- [ ] Model catalog service (fetch available models)
- [ ] Error handling with retry logic

**Depends on**: Phase 0 (secure storage for API keys)  
**Enables**: Phase 4 (generation), Phase 6 (loom-aware)

---

## Phase 3: Basic UI 

**Goal**: See and interact with trees.

- [ ] Grove screen (list trees, create new)
- [ ] Loom Tree view — Dialogue Mode
  - [ ] Node rendering (text, with author colors)
  - [ ] Path navigation (scroll through active path)
  - [ ] Branch point indicators
  - [ ] Sibling navigation (swipe/tap to switch branches)
- [ ] Node detail view (metadata, annotations, links)
- [ ] Settings screen (API keys, preferences)
- [ ] Agent configuration UI

**Depends on**: Phase 1  
**Enables**: User testing, Phase 4

---

## Phase 4: Generation Flow 

**Goal**: Create content with models.

- [ ] Context assembly service
  - [ ] Dialogue mode (messages array)
  - [ ] System context combination (Agent + Tree)
  - [ ] Exclusion filtering
  - [ ] Truncation strategies
- [ ] Continuation generation
  - [ ] Single continuation
  - [ ] Multiple continuations (n>1)
  - [ ] Streaming display
- [ ] Node creation from responses
- [ ] Provenance storage (RawApiResponse)
- [ ] Human node creation (user typing)

**Depends on**: Phase 1, 2, 3  
**Enables**: Core app functionality

---

## Phase 5: Tree Operations 

**Goal**: Full tree manipulation.

- [ ] Bookmark (add/remove, labels)
- [ ] Annotate (create annotation nodes)
- [ ] Prune/Restore (soft delete branches)
- [ ] Link (node↔node, node↔document)
- [ ] Tag system (create, assign, filter)
- [ ] Search (full-text across trees/documents)

**Depends on**: Phase 4  
**Enables**: Complete Dialogue Mode experience

---

## Phase 6: Loom-Aware System 

**Goal**: Models as collaborators.

### Context Extensions
- [ ] Per-node metadata injection
- [ ] System-level loom context
- [ ] Operational memory (pins, stashes, action trace)
- [ ] Loom-aware addendum to system prompt

### Tool Parser
- [ ] `→` syntax parser
- [ ] Natural language classifier (pattern matching first)
- [ ] Tool execution engine
- [ ] Result formatting
- [ ] Batching support

### Tools Implementation
- [ ] Navigation: view, list, tree, switch
- [ ] Content: continue, respond, annotate, link, edit, bookmark, prune, restore
- [ ] Document: read, write
- [ ] Memory: pin, stash, recall, drop, memory
- [ ] Meta: help, think, search

### Web Search
- [ ] WebSearchService interface
- [ ] TavilyAdapter
- [ ] BraveSearchAdapter (fallback)

**Depends on**: Phase 4, 5  
**Enables**: Two-role pattern, AI-assisted exploration

---

## Phase 7: Buffer Mode 

**Goal**: Document-style creative writing.

- [ ] Buffer view rendering (continuous prose)
- [ ] Working buffer (uncommitted text)
- [ ] Node boundary detection
- [ ] Authorship color coding (character-level diff)
- [ ] Version nodes (`editedFrom`, hyperedge updates)
- [ ] Sibling navigation (scroll wheel UI)
- [ ] Buffer mode context assembly

**Depends on**: Phase 4, 5  
**Enables**: Creative writing workflows

---

## Phase 8: Voice Mode 

**Goal**: Hands-free interaction.

- [ ] Speech-to-text (native APIs)
- [ ] Text-to-speech (native APIs)
- [ ] Voice Mode toggle
- [ ] Auto-listen after TTS
- [ ] Silence timeout handling
- [ ] Think mode (pause/resume)
- [ ] Double-tap to replay node

**Depends on**: Phase 4  
**Enables**: Mobile-first voice workflows

---

## Phase 9: Summary System 

**Goal**: Context efficiency at scale.

- [ ] Summary generation service
- [ ] Model selection (Haiku/GPT-4o-mini with fallback)
- [ ] Node summary generation (async after creation)
- [ ] Document summary generation (on close)
- [ ] LoomTree summary generation (periodic)
- [ ] Lazy fallback for missing summaries

**Depends on**: Phase 2, 4  
**Enables**: Efficient loom-aware context

---

## Phase 10: Documents & Organization 

**Goal**: Knowledge management layer.

- [ ] Document editor (block-based)
- [ ] Block types (text, heading, code, callout, embeds)
- [ ] Node/Tree embeds in documents
- [ ] Document↔Node linking
- [ ] Tag filtering views
- [ ] Grove organization

**Depends on**: Phase 5  
**Enables**: Research workflows, knowledge synthesis

---

## Phase 11: Provenance & Verification 

**Goal**: Authenticity guarantees.

- [ ] Hash chain verification
- [ ] RFC 3161 timestamp requests
- [ ] Timestamp certificate storage
- [ ] Verification UI ("View Provenance")
- [ ] Verification status indicators

**Depends on**: Phase 4  
**Enables**: Research credibility

---

## Phase 12: Polish & Launch Prep 

- [ ] Error handling audit
- [ ] Performance optimization
- [ ] Offline behavior testing
- [ ] App store assets
- [ ] Field Guide CMS integration (Sanity)
- [ ] Onboarding flow
- [ ] Beta testing

---

## Dependency Graph

```
Phase 0 (Foundation)
    │
    ├── Phase 1 (Data Layer)
    │       │
    │       ├── Phase 3 (Basic UI)
    │       │       │
    │       │       └── Phase 4 (Generation) ← Phase 2 (LLM)
    │       │               │
    │       │               ├── Phase 5 (Tree Ops)
    │       │               │       │
    │       │               │       ├── Phase 6 (Loom-Aware)
    │       │               │       ├── Phase 7 (Buffer Mode)
    │       │               │       └── Phase 10 (Documents)
    │       │               │
    │       │               ├── Phase 8 (Voice)
    │       │               ├── Phase 9 (Summaries)
    │       │               └── Phase 11 (Provenance)
    │       │
    │       └── Phase 2 (LLM Provider)
    │
    └── Phase 12 (Polish)
```

---

## MVP Scope

**Must have (Phases 0-5):**
- Dialogue Mode trees
- Multi-model generation
- Branching and navigation
- Basic tree operations
- Provenance capture

**Should have (Phases 6-9):**
- Loom-aware collaborator tools
- Buffer Mode
- Voice Mode
- Summary system

**Nice to have (Phases 10-11):**
- Full document system
- Provenance verification UI

---

## Notes

- Phases 2 and 3 can run in parallel
- Phases 6, 7, 8 can run in parallel after Phase 5
- Each phase should end with working, testable functionality
- Specs are complete — implementation is translation, not design