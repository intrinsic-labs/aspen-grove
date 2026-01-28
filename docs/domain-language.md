# Aspen Grove — Domain Language

> This document defines the core terminology and concepts used throughout Aspen Grove. All code, documentation, and discussion should use these terms consistently.

---

## Core Concepts

### Loom Tree

The central data structure of Aspen Grove. A **Loom Tree** is a hypergraph-backed tree that represents a branching exploration of dialogue or text. Unlike linear chat, a Loom Tree preserves all paths taken and not taken, allowing navigation through possibility space.

The name references the **Loom of Time** — a representation of the universe as a tapestry where choices weave potentials into realities.

A Loom Tree is the atomic unit of LLM interaction in Aspen Grove. Every conversation, every text buffer session, every exploration is a Loom Tree.

#### Related Terminology

- **Loom Tree** — the hypergraph data structure (the thing)
- **Looming** or **Weaving** — the act of exploring and creating within a Loom Tree (the activity)
- **Loom** — a category of LLM interface that enables branching, tree-based interaction (the tool type). Aspen Grove is a Loom.

---

### Node

A single unit of content within a Loom Tree. Nodes are the vertices of the hypergraph.

Nodes are **immutable** once created. Edits create new nodes rather than modifying existing ones. Each node carries a content hash for tamper-evidence as part of the [provenance system](./provenance-overview.md).

Nodes are **multimodal by design** — they can contain text, images, audio, or combinations thereof.

> For full property list and technical constraints, see [Architecture: Core Entities](./architecture/model/core-entities.md).

---

## Provenance & Verification

Aspen Grove takes provenance seriously. For researchers and anyone who needs to demonstrate that model outputs are authentic, we provide a tiered verification strategy including hash chains, RFC 3161 timestamps, and raw API response storage.

See [Provenance & Verification](./provenance-overview.md) for full details.

---

### Edge

A directed hyperedge connecting one or more source Nodes to a target Node. Edges represent relationships between nodes in the Loom Tree.

In a hypergraph, edges can connect **multiple sources** to a target. This is important for representing complex generation relationships (e.g., an image + text prompt together producing a new node).

There are three edge types:
- **Continuation** — the target node continues from the source(s); the primary edge type for traversal
- **Annotation** — a comment or note attached to a node (excluded from model context by default)
- **Link** — a cross-reference to another node (possibly in a different Loom Tree)

> **Note on Branches**: "Branch" is not an edge type. A branch is simply the situation where multiple continuation edges originate from the same node.

> For full property list including source roles, see [Architecture: Core Entities](./architecture/model/core-entities.md).

---

### Path

A linear sequence of Nodes connected by Continuation edges, representing one possible traversal through the Loom Tree. When you "read" a conversation, you're reading a Path.

The **Active Path** is the currently selected traversal — what the user sees as the "current conversation."

Paths are computed, not stored. They are derived by traversing edges from a given node back to the Root.

---

### Branch Point

A Node that has multiple outgoing Continuation edges — meaning the exploration forked here. Branch Points are where multiple continuations were generated, or the human chose to try a different direction.

---

### Root

The first Node in a Loom Tree. Every Loom Tree has exactly one Root. The Root may be empty (representing a blank starting point) or may contain initial context/system instructions.

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

A Loom Tree interaction style where content is organized as discrete messages with clear author attribution. The familiar back-and-forth of conversation, but with branching.

The term "dialogue" is chosen deliberately over "chat" to encourage a more thoughtful, deliberate approach to interaction.

---

### Buffer Mode

A Loom Tree interaction style where there are no message boundaries — just continuous text. The model's completions stream directly into the document. Think "collaborative text editor" rather than "conversation."

**Branching is fully supported in Buffer Mode.** You can generate N continuations from any point in the buffer. User text and model text are distinguished via color or other UI treatment, not structural separation.

Inspired by Zed's text threads and base-model interactions.

---

### Voice Mode

An app-wide toggle that enables hands-free interaction with Loom Trees. Designed for mobile use while driving, walking, or otherwise occupied. Voice Mode supports the looming/weaving activity through speech rather than text input.

#### Core Behavior

When Voice Mode is **ON**:
1. User sends prompt (text or speech-to-text via native platform API)
2. Model generates response → Node created
3. Response fully received → text-to-speech reads the node aloud
4. Node text changes color during speech (visual feedback)
5. Speech finishes → app listens for next voice input
6. If speech detected, auto-sends after 4-second pause of silence
7. If no speech detected within 4 seconds, app stops listening

When Voice Mode is **OFF**:
- Standard text-based interaction
- No automatic speech output or input

#### Interactions

- **Toggle**: Accessible from menu bar (any Loom Tree) or Settings screen
- **Double-tap any node**: Hear it read aloud (works regardless of Voice Mode state)
- **Single-tap during speech**: Stop playback immediately; does NOT start listening
- **Explicit listen trigger**: App only listens when directed (after speech completes in Voice Mode, or via explicit action)

#### Technical Implementation (MVP)

- **Speech-to-text**: Native platform APIs (iOS Speech framework, Android SpeechRecognizer)
- **Text-to-speech**: Native platform APIs (AVSpeechSynthesizer on iOS, TextToSpeech on Android)
- **Future**: Higher-quality TTS & transcription services as optional upgrade

#### Limitations (MVP)

- Requires app to be in foreground (background audio is post-MVP)
- Voice commands for Loom operations (e.g., "go back," "generate three more") are post-MVP
- Voice input is for prompt content only, not navigation

---

### Loom-Aware

An Agent-level toggle that determines whether the agent has access to Loom Tree navigation and manipulation tools.

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

The core abstraction for any entity that can participate in or operate on a Loom Tree. **Both humans and models are agents.**

The Loom Tree and its operations treat all Agents uniformly — the tree doesn't care what's behind the agent. This enables:

- **Modularity** — Tree operations accept an Agent, not model-specific parameters
- **Flexibility** — Multiple agents can be backed by the same model with different configurations
- **Consistency** — Humans and models are treated identically at the API level

---

### Human

The backend type for a human agent. One human user may have multiple Agent configurations (e.g., different "modes" of working).

---

### Model

The backend type for an LLM agent. Stores only what's needed to call the API (identifier, provider, endpoint, credentials reference).

**Configuration lives at the Agent level, not the Model level** — one model can back multiple differently-configured agents.

> For full property lists, see [Architecture: Agents](./architecture/model/agents.md).

---

## Tree Operations

These are the core operations for manipulating a Loom Tree. They are available to any Agent with appropriate permissions. The API is agent-agnostic.

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

Serialize a specific Path (or the entire Loom Tree) to an external format (Markdown, JSON, etc.).

---

### Merge

Combine insights from multiple Paths into a new Node. This is a creative/editorial operation — the agent synthesizes content from different branches.

---

## File System Concepts

### Grove

The top-level container for all user data. A Grove contains Loom Trees, Documents, and organizational structures. One user has one Grove.

(The name completes the metaphor: individual Loom Trees form a Grove.)

---

### Document

A file that is not a Loom Tree — plain notes, markdown files, reference material. Documents can link to Loom Trees and vice versa.

---

### Link

A bidirectional reference between any two items (Nodes, Loom Trees, Documents). Links create the knowledge graph that connects everything.

---

### Tag

A label that can be applied to Nodes, Loom Trees, or Documents for organization and filtering.

> For full property lists, see [Architecture: Organization](./architecture/model/organization.md).

---

## Context & Memory

### Context Window

The content sent to a model when requesting a Continuation. By default, this is the Active Path from Root to the current Node.

For multi-source edges, context may include content from all source nodes according to their roles.

---

### System Context

Persistent instructions included at the start of every Context Window for a given Loom Tree or Agent. Similar to a system prompt.

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

Key technical decisions are documented in Architecture Decision Records:

- **IDs** — ULIDs for all entities (sortable, unique, compatible with WatermelonDB)
- **Persistence** — WatermelonDB for local-first, offline-capable storage
- **Permissions** — Simple read/write model for MVP

> See [Architecture Decision Records](./architecture/adr/) for full context and rationale.

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

---

## Open Questions

- **Cloud Sync Service**: Supabase is a candidate for auth + backup + sync. Could also consider encrypted backup to iCloud/Google Drive for simplicity. Decision deferred until sync is needed.

- **API Provider Signatures**: True proof of model identity requires providers to sign responses. This doesn't exist yet. Worth advocating for as the ecosystem matures.

- **Multi-user/Collaboration**: Out of scope for MVP, but the Agent abstraction should accommodate it when needed.

---

*This document should evolve as the domain becomes clearer through implementation.*