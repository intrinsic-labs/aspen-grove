# Interaction Modes

> How users interact with Loom Trees: Dialogue Mode, Buffer Mode, Voice Mode, and Loom-Aware settings.

---

## Dialogue Mode

A Loom Tree interaction style where content is organized as discrete messages with clear author attribution. The familiar back-and-forth of conversation, but with branching.

The term "dialogue" is chosen deliberately over "chat" to encourage a more thoughtful, deliberate approach to interaction.

---

## Buffer Mode

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

## Voice Mode

An app-wide toggle that enables hands-free interaction with Loom Trees. Designed for mobile use while driving, walking, or otherwise occupied. Voice Mode will eventually support looming/weaving activity through speech rather than UI; for MVP it will be most useful for linear conversations in dialogue mode.

### Core Behavior

When Voice Mode is **ON**:
1. User sends prompt (typed + send button, OR dictation button for voice)
2. Model generates response → Node created
3. Response received → TTS reads it aloud
4. TTS finishes → app auto-listens with 4-second silence timeout
5. User speaks → transcribed → sent as prompt after 4-second pause of silence
6. Loop back to step 2

When Voice Mode is **OFF**:
- Standard text-based interaction
- No automatic speech output
- Dictation button still available for voice input (but no auto-listen after response)

### Silence Timeout Behavior

The 4-second timeout applies to *silence*, not speech duration. Users can speak for as long as they want.

- **After 4 seconds of silence**: If user said something → send as prompt. If user said nothing → voice chat ends (app stops listening, Voice Mode stays ON).
- **No maximum speech duration**: User can talk continuously without timeout.

### Button States

The dictation button appears next to the send button and changes based on state:

| State | Button | Tap Action |
|-------|--------|------------|
| Idle | 🎤 Dictation | Start listening |
| Listening | ⏸️ Pause | Pause listening (think mode) |
| Paused while listening | ▶️ Resume | Resume listening |
| TTS playing | ⏸️ Pause | Pause TTS playback |
| TTS paused | ▶️ Resume | Resume TTS playback |

### Think Mode (Pause While Dictating)

If user needs time to think mid-dictation:
1. Tap pause → listening stops, timeout suspended
2. Think as long as needed
3. Tap resume → 4-second timeout starts
4. If user speaks → continue transcribing
5. If 4 seconds of silence and user had already said something → send
6. If 4 seconds of silence and user said nothing → voice chat ends

### Interactions

- **Voice Mode Toggle**: Accessible from menu bar (any Loom Tree) or Settings screen
- **Dictation button**: Start voice input (always available, next to send button)
- **Double-tap any node**: Hear it read aloud (works regardless of Voice Mode state)
- **Single-tap during TTS**: Stops playback immediately; does NOT start listening

### Technical Implementation (MVP)

- **Speech-to-text**: Native platform APIs (iOS Speech framework, Android SpeechRecognizer)
- **Text-to-speech**: Native platform APIs (AVSpeechSynthesizer on iOS, TextToSpeech on Android)
- **Future**: Higher-quality TTS & transcription services as optional upgrade

### Edge Cases & Recovery

**Connection drop during generation:**
- Interrupt any current TTS
- Speak the error aloud (e.g., "Connection lost. Please try again.")
- User can retry via dictation button or typed input

**Voice chat ending:**
- Occurs when 4-second silence timeout expires with nothing said
- Voice Mode stays ON — user can re-engage via dictation button
- No automatic retry or prompt

### Limitations (MVP)

- Requires app to be in foreground (background audio is post-MVP)
- Voice commands for Loom operations (e.g., "go back," "generate three more") are post-MVP
- Voice input is for prompt content only, not navigation
- Speech-to-text happens locally — no connection drop concerns for transcription

---

## Loom-Aware

An Agent-level toggle that determines whether the agent has access to Loom Tree navigation and manipulation tools.

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
- [Use Cases: Creation & Collaboration](../use-cases/creation-collaboration.md) — Voice Mode and Buffer Mode workflows
