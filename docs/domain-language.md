# Aspen Grove — Domain Language

> This document defines the core terminology and concepts used throughout Aspen Grove. All code, documentation, and discussion should use these terms consistently.

---

## Core Concepts

### Loom

The central data structure and interaction paradigm of Aspen Grove. A **Loom** is a hypergraph-backed tree that represents a branching exploration of dialogue or text. Unlike linear chat, a Loom preserves all paths taken and not taken, allowing navigation through possibility space.

The name references the **Loom of Time** — a representation of the universe as a tapestry where choices weave potentials into realities.

A Loom is the atomic unit of LLM interaction in Aspen Grove. Every conversation, every text buffer session, every exploration is a Loom.

---

### Node

A single unit of content within a Loom. Nodes are the vertices of the hypergraph.

A Node contains:

- **ID** — a ULID (Universally Unique Lexicographically Sortable Identifier)
- **Content** — the actual payload (see Content Types below)
- **Author** — reference to the Agent that created this node
- **Timestamp** — when the node was created
- **Metadata** — additional information (bookmarks, tags, etc.)
- **Content Hash** — hash of (content + parent hashes + timestamp) for tamper-evidence

Nodes are **immutable** once created. Edits create new nodes rather than modifying existing ones.

#### Content Types

Nodes are multimodal by design. The content field is typed and extensible:

- **Text** — the primary type; markdown-compatible string content
- **Image** — reference to image data (stored separately)
- **Audio** — reference to audio data
- **Mixed** — structured combination of multiple content types

Design for extension: new content types can be added without changing the core node structure.

---

## Provenance & Verification

Aspen Grove takes provenance seriously. For researchers and anyone who needs to demonstrate that model outputs are authentic, we provide a tiered verification strategy.

### The Core Challenge

Without API providers cryptographically signing their responses, true *proof* of origin is impossible. You control the client — any response passes through your code before storage. HTTPS proves you talked to the real API endpoint, but that proof is ephemeral.

We can't solve this problem completely, but we can make fabrication difficult, tampering detectable, and evidence comprehensive.

### Tier 1: Hash Chains (Default)

Each node stores a **content hash** computed from:
- The node's content
- The hashes of all parent nodes (via incoming edges)
- The creation timestamp
- The author agent ID

This creates a hash chain similar to git. Any modification to any node in the chain is detectable — the hashes won't validate. This proves **integrity** (nothing was altered after creation), even though it can't prove **origin**.

### Tier 2: Trusted Timestamps (Default)

Upon node creation, we submit the content hash to an **RFC 3161 timestamp authority**. This provides a cryptographic proof that "this hash existed at time T," signed by a trusted third party.

This proves you didn't fabricate the content *after the fact*. Combined with the hash chain and raw API response metadata, it becomes increasingly implausible to fake a response that:
- Has internally consistent timestamps
- Matches a valid RFC 3161 timestamp certificate
- Contains coherent API metadata (request IDs, rate limit headers, model versions)

Free RFC 3161 services (e.g., FreeTSA) make this practical for all users.

### Tier 3: Raw API Response Storage (Default)

The complete, unmodified API response is stored for every model-generated node:
- Full response body
- HTTP headers (including request IDs, timestamps, rate limit state)
- Client-side timing information

Raw responses are:
- **Compressed** (gzip) to minimize storage impact
- **Stored separately** from the node content (not on the hot path)
- **Linked by Node ID** for on-demand access
- **Retained for the lifetime of the node**

This is evidence, not proof — but it's comprehensive evidence that would be difficult to fabricate consistently.

### Tier 4: TLS Notary (Future)

[TLS Notary](https://tlsnotary.org/) is a protocol that enables cryptographic proof that specific data came from a specific server, without requiring server cooperation. It uses secure multi-party computation during the TLS handshake to create a portable proof of origin.

This is the closest thing to true verification without API provider support.

**Current limitation**: TLS Notary adds significant latency (~10-15 seconds per request depending on network conditions). This is unacceptable for most users but valuable for researchers who need maximum assurance and can tolerate the delay.

**Plan**: Offer TLS Notary as an opt-in "high assurance mode" once the protocol matures and performance improves. Users who need provable provenance can enable it per-Loom or per-session.

### Tier 5: Provider Signatures (Aspirational)

The cleanest solution: API providers sign their responses with a private key. Anyone can verify with the public key. This solves the problem completely.

This doesn't exist yet. As Aspen Grove gains traction in the research community, we'll advocate for this feature with major providers.

### Summary

| Tier | What It Proves | Default | Latency Impact |
|------|----------------|---------|----------------|
| Hash Chains | Integrity (no tampering after creation) | ✓ | None |
| RFC 3161 Timestamps | Existence at specific time | ✓ | Minimal |
| Raw API Storage | Comprehensive evidence of origin | ✓ | None (async) |
| TLS Notary | Cryptographic proof of origin | Future | +10-15s |
| Provider Signatures | Complete proof | Requires provider support | None |

---

### Edge

A directed hyperedge connecting one or more source Nodes to a target Node. Edges represent relationships between nodes in the Loom.

In a hypergraph, edges can connect **multiple sources** to a target. This is important for representing complex generation relationships (e.g., an image + text prompt together producing a new node).

Edges carry:

- **ID** — a ULID
- **Sources** — array of source Node references, each with a Role
- **Target** — the Node this edge points to
- **Edge Type** — the nature of the connection (see Edge Types below)

#### Source Roles

When an edge has multiple sources, each source has a **role** describing its contribution:

- **Primary** — the main content being continued
- **Context** — additional context influencing generation (e.g., an image, a reference document)
- **Instruction** — a prompt or directive guiding the generation

#### Edge Types

- **Continuation** — the target node is a continuation from the source(s). This is the primary edge type for Loom traversal.
- **Annotation** — the target node is a comment or note attached to the source (not part of the main flow, excluded from model context by default)
- **Link** — a reference connection to another node (possibly in a different Loom). Used for cross-referencing and knowledge graph construction.

> **Note on Branches**: "Branch" is not an edge type. A branch is simply the situation where multiple continuation edges originate from the same node. The structure captures branching inherently.

---

### Path

A linear sequence of Nodes connected by Continuation edges, representing one possible traversal through the Loom. When you "read" a conversation, you're reading a Path.

The **Active Path** is the currently selected traversal — what the user sees as the "current conversation."

Paths are computed, not stored. They are derived by traversing edges from a given node back to the Root.

---

### Branch Point

A Node that has multiple outgoing Continuation edges — meaning the exploration forked here. Branch Points are where multiple continuations were generated, or the human chose to try a different direction.

---

### Root

The first Node in a Loom. Every Loom has exactly one Root. The Root may be empty (representing a blank starting point) or may contain initial context/system instructions.

---

### Leaf

A Node with no outgoing Continuation edges. Leaves are the "ends" of explored paths — places where a branch of exploration stopped (for now).

---

### Continuation

A generated response to a given Path. When you request a Continuation, the generating agent receives the Active Path as context and produces a new Node.

Multiple Continuations from the same point create sibling Nodes and a Branch Point.

---

### Sibling

Nodes that share the same parent Node (i.e., they are alternative continuations from the same point). Siblings represent the "multiverse" — different possibilities that emerged from the same moment.

---

## Interaction Modes

### Dialogue Mode

A Loom interaction style where content is organized as discrete messages with clear author attribution. The familiar back-and-forth of conversation, but with branching.

The term "dialogue" is chosen deliberately over "chat" to encourage a more thoughtful, deliberate approach to interaction.

---

### Buffer Mode

A Loom interaction style where there are no message boundaries — just continuous text. The model's completions stream directly into the document. Think "collaborative text editor" rather than "conversation."

**Branching is fully supported in Buffer Mode.** You can generate N continuations from any point in the buffer. User text and model text are distinguished via color or other UI treatment, not structural separation.

Inspired by Zed's text threads and base-model interactions.

---

### Loom-Aware

An Agent-level toggle that determines whether the agent has access to Loom navigation and manipulation tools.

A **Loom-Aware** agent can:
- See metadata about the tree structure (branch points, sibling counts, path history)
- Navigate to other branches
- Request summaries of alternative paths
- Perform tree operations via tool calls

An agent that is **not Loom-Aware** sees only the Active Path — they experience the interaction as linear.

**Important**: This is an Agent-level setting. Humans are agents too. A human can toggle Loom-Aware off for themselves. Conversely, a model can be Loom-Aware even when the human is not.

This enables the **two-role pattern**: one agent as the "subject" (not Loom-Aware, being studied), another as the "collaborator" (Loom-Aware, helping navigate and analyze).

---

## Agents

### Agent

The core abstraction for any entity that can participate in or operate on a Loom. **Both humans and models are agents.**

The Loom and its operations treat all Agents uniformly — the tree doesn't care what's behind the agent.

An Agent has:

- **ID** — a ULID
- **Name** — display name
- **Type** — `human` or `model`
- **Backend** — reference to the underlying Human profile or Model configuration
- **Configuration** — agent-specific parameters (temperature, system prompts, etc.)
- **Permissions** — what operations this agent can perform (`read`, `write`)
- **Loom-Aware** — whether this agent has access to tree navigation tools

#### Why This Abstraction?

- **Modularity**: Tree operations accept an Agent ID, not model-specific parameters
- **Flexibility**: You can have N agents backed by the same model with different configurations
- **Consistency**: Humans and models are treated identically at the API level
- **Extensibility**: User profiles, teams, and future agent types fit naturally

---

### Human

The backend type for a human agent. Stores user profile information.

One human user may have multiple Agent configurations (e.g., different "modes" of working).

---

### Model

The backend type for an LLM agent. A Model stores **only what's needed to call the API**:

- **Identifier** — the model name/version (e.g., `claude-sonnet-4-20250514`, `gpt-4o`)
- **Provider** — the API provider (`anthropic`, `openai`, `local`, etc.)
- **Endpoint** — API URL (for custom/local deployments)
- **Credentials Reference** — pointer to stored API key (never stored directly)

**Configuration lives at the Agent level, not the Model level.** This separation means:
- One model can back multiple differently-configured agents
- Switching models for an agent is a simple backend swap
- Model definitions stay simple and reusable

---

## Tree Operations

These are the core operations for manipulating a Loom. They are available to any Agent with appropriate permissions. The API is agent-agnostic.

### Generate Continuation

Create a new Node by requesting a continuation from a given point.

Parameters:
- **From Node** — the node to continue from (ID)
- **Agent** — which agent generates the continuation (ID)
- **Count** — how many alternative continuations to generate (default: 1)

The system:
1. Computes the Path from Root to the specified Node
2. Retrieves the Agent's configuration and backend Model
3. Sends the Path (as context) to the Model
4. Creates new Node(s) with Continuation edges from the source

---

### Fork

Manually create a new branch from an existing Node. Unlike Generate Continuation, Fork creates a human-authored (or manually specified) Node as an alternative path.

---

### Navigate

Change the Active Path to traverse through a different branch. This doesn't modify the tree — it changes what the user is looking at.

---

### Bookmark

Mark a Node for easy retrieval. Bookmarks persist across sessions and can be labeled.

---

### Annotate

Attach a note to a Node without affecting the conversation flow. Creates an Annotation-type edge. Annotations are excluded from model context by default.

---

### Prune

Mark a branch as "pruned" — not deleted, but hidden from default views. Pruned branches can be restored. This is a soft delete.

---

### Export Path

Serialize a specific Path (or the entire Loom) to an external format (Markdown, JSON, etc.).

---

### Merge

Combine insights from multiple Paths into a new Node. This is a creative/editorial operation — the agent synthesizes content from different branches.

---

## File System Concepts

### Grove

The top-level container for all user data. A Grove contains Looms, Documents, and organizational structures. One user has one Grove.

(The name completes the metaphor: individual Looms are trees; together they form a Grove.)

---

### Document

A file that is not a Loom — plain notes, markdown files, reference material. Documents can link to Looms and vice versa.

---

### Link

A bidirectional reference between any two items (Nodes, Looms, Documents). Links create the knowledge graph that connects everything.

---

### Tag

A label that can be applied to Nodes, Looms, or Documents for organization and filtering.

---

## Context & Memory

### Context Window

The content sent to a model when requesting a Continuation. By default, this is the Active Path from Root to the current Node.

For multi-source edges, context may include content from all source nodes according to their roles.

---

### System Context

Persistent instructions included at the start of every Context Window for a given Loom or Agent. Similar to a system prompt.

---

### Raw API Response

The complete, unmodified response object from an API call, stored alongside the Node it generated. Includes headers, timestamps, request IDs, and the full response body.

Used for:
- Provenance evidence (supporting claims about node origin)
- Debugging and research
- Potential future verification if API providers add signing

Raw responses are stored separately from Node content but linked by Node ID. Users can access them on demand via a "View Provenance" action.

---

### Excluded Content

Nodes or Annotations marked to be excluded from the Context Window. Useful for human-only notes or meta-commentary that shouldn't influence the model.

---

## Technical Decisions

### IDs: ULIDs

All entities use **ULIDs** (Universally Unique Lexicographically Sortable Identifiers):

- Sortable by creation time (useful for ordering without extra queries)
- Same 128-bit space as UUIDs (no collision concerns)
- Well-supported in JavaScript (`ulid` package)
- Compatible with WatermelonDB

### Persistence: WatermelonDB

Local-first storage using **WatermelonDB**:

- Built for React Native
- Offline-first with sync primitives
- SQLite under the hood
- Fits the local-first philosophy

Schema should be designed with future sync in mind.

### Permissions Model

Simple for now:
- **Read** — can view the Loom and its contents
- **Write** — can create nodes, edges, and perform tree operations

Can be expanded later if needed.

---

## MVP Features

These are part of the initial implementation:

### Field Guide

Curated content explaining how to think about and work with LLMs. The Field Guide is the educational backbone of Aspen Grove — it helps users understand not just *how* to use the tool, but *why* it works the way it does.

Contents:
- **Conceptual articles** — explaining looms, latent space, multiverse thinking
- **Prompting guides** — how to engage models effectively
- **Tool documentation** — how to use Aspen Grove's features
- **External resources** — links to valuable research and reading

The Field Guide *container* is MVP. The *content* will expand over time.

The Field Guide may later include:
- Interviews with LLM researchers
- Personal observation notebook for documenting findings
- Community-contributed guides

---

## Future Concepts (Not MVP)

These terms are defined for conceptual clarity but are not part of the initial implementation:

### Backroom
A space for multi-model conversations where models talk to each other, optionally observed by the human.

### Ruminate
A mode where the model continues processing asynchronously when the human is away.

### Activation Memory
A memory system based on storing neural activation patterns rather than text summaries (speculative/research).

---

## Naming Conventions

When implementing, use these terms consistently:

| Concept | Variable/Type Name |
|---------|-------------------|
| Loom | `Loom` |
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

---

## Open Questions

- **Cloud Sync Service**: Supabase is a candidate for auth + backup + sync. Could also consider encrypted backup to iCloud/Google Drive for simplicity. Decision deferred until sync is needed.

- **API Provider Signatures**: True proof of model identity requires providers to sign responses. This doesn't exist yet. Worth advocating for as the ecosystem matures.

- **Multi-user/Collaboration**: Out of scope for MVP, but the Agent abstraction should accommodate it when needed.

---

*This document should evolve as the domain becomes clearer through implementation.*