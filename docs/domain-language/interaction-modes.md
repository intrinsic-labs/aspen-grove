# Interaction Modes

> How users interact with Loom Trees: Dialogue Mode, Buffer Mode, character voices, and Loom-Aware settings.

---

## Dialogue Mode

A Loom Tree interaction style where content is organized as discrete messages with clear author attribution. The familiar back-and-forth of conversation, but with branching.

The term "dialogue" is chosen deliberately over "chat" to encourage a more thoughtful, deliberate approach to interaction.

---

## Buffer Mode

**Status:** after v1 (buffer mode with base models). Not implemented; the spec is kept for later.

A Loom Tree interaction style where there are no message boundaries — just continuous text. The model's completions stream directly into the document. Think "collaborative text editor" rather than "conversation."

**Branching is fully supported in Buffer Mode.** You can generate N continuations from any point in the buffer. User text and model text are distinguished via color or other UI treatment, not structural separation.

Inspired by Zed's text threads and base-model interactions.

### Edit Behavior Comparison

Since nodes are immutable, editing always creates a new node with `editedFrom` set to track lineage. The tree behavior differs by mode:

| Mode | Edit Behavior | Tree Result |
|------|---------------|-------------|
| **Dialogue** | Edit creates branch, conversation continues from edit point | Sibling node (traditional branch, separate downstream) |
| **Buffer** | Edit in place, downstream preserved | Version node (hyperedge keeps downstream attached) |

This means editing a message in Dialogue Mode feels like "what if I said this instead?" while editing in Buffer Mode feels like normal document editing.

> For full specification, see [Buffer Mode Spec](../architecture/specs/buffer-mode.md).

---

## Character Voices

Named voices that read nodes aloud, brought over from Latent Spaces (the Swift prototype, `LoomVoice` and `SpeechSynthesizer` in `~/dev/mobile/loom-swift`). Each voice is a character with a name, a system text-to-speech voice, a pitch, a short self-introduction and a color. In Latent Spaces they are Jefferson, Lily and Eve.

**Status:** part of v1, not yet built. `UserPreferences.defaultVoiceModeEnabled` exists in the schema but nothing reads it yet.

### Behavior (as in Latent Spaces)

- The user picks a voice in Settings; tapping a voice plays its sample line
- With voices on, a new model node is read aloud as it lands, and any node can be played or stopped from its controls
- The chosen voice's color tints the node being read

There is no dictation, auto-listen or silence timeout: voices read, they don't listen.

---

## Loom-Aware

An Agent-level toggle that determines whether the agent has access to Loom Tree navigation and manipulation tools.

**Status:** the `loomAware` flag exists on Agent; the tools it unlocks are after v1 (see [Loom Tools](../architecture/specs/loom-tools/README.md)).

A **Loom-Aware** agent can:
- See metadata about the tree structure (branch points, sibling counts, path history)
- Navigate to other branches
- Request summaries of alternative paths
- Perform tree operations via tool calls

An agent that is **not Loom-Aware** sees only the Active Path — they experience the interaction as linear.

**Important**: This is an Agent-level setting. Humans are agents too. A human can toggle Loom-Aware off for themselves. Conversely, a model can be Loom-Aware even when the human is not.

This enables the **two-role pattern**: one agent as the "subject" (not Loom-Aware, being studied), another as the "collaborator" (Loom-Aware, helping navigate and analyze). For the full loom aware tooling spec, see [Loom Tools](../architecture/specs/loom-tools/README.md).

---

## Related Documentation

- [Core Concepts](./core-concepts.md) — Loom Tree, Node, Edge, Path
- [Agents](./agents.md) — Agent abstraction for humans and models
- [Buffer Mode Spec](../architecture/specs/buffer-mode.md) — Detailed Buffer Mode specification
- [Use Cases: Creation & Collaboration](../use-cases/creation-collaboration.md) — Buffer Mode workflows (post-v1)
