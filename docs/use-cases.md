# Aspen Grove — Use Cases

> This document describes how users interact with Aspen Grove to accomplish their goals. Use cases are organized by primary intent and reference the domain language defined in `domain-language.md`.

---

## Overview

Aspen Grove serves three interconnected purposes:

1. **Exploration & Study** — Understanding how models think, behave, and respond
2. **Creation & Collaboration** — Working with models to produce meaningful output
3. **Knowledge Management** — Organizing, connecting, and preserving what emerges

These aren't separate modes — they blend together. A user might start exploring a model's behavior, shift into collaborative writing, and end up with notes they want to preserve. The system supports this fluidity.

---

## 1. Exploration & Study

These use cases center on understanding models — their capabilities, quirks, biases, and behaviors. This is Aspen Grove's distinctive strength.

### 1.1 Branching Exploration

**Goal**: Explore how a model responds differently to the same prompt.

**Flow**:
1. User creates a new Loom in Dialogue Mode
2. User writes a prompt and requests multiple Continuations (e.g., 5)
3. System generates 5 sibling Nodes from the same Branch Point
4. User reviews siblings, comparing tone, content, reasoning
5. User bookmarks interesting variations
6. User continues from one or more branches, creating many possible Paths
7. User annotates nodes with observations

**Value**: Reveals the probability space behind a single prompt. Users see that models don't have "an answer" — they have a distribution of possible answers. This builds intuition for how to steer models.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

### 1.2 Comparative Model Study

**Goal**: Compare how different models respond to the same prompt.

**Flow**:
1. User creates a Loom with an initial prompt Node
2. User configures multiple Agents backed by different Models (e.g., Claude, GPT-4, Llama)
3. User generates Continuations from the same Node using each Agent
4. System creates sibling Nodes, each tagged with its generating Agent
5. User compares responses side-by-side
6. User continues promising branches with the same or different models
7. User documents findings via Annotations or linked Documents

**Value**: Direct comparison reveals model personalities, strengths, and blind spots. Over time, users develop preferences and intuitions for which models suit which tasks.

**Agents Involved**: Human (Loom-Aware), Multiple Models (not Loom-Aware)

---

### 1.3 Prompt Iteration Study

**Goal**: Understand how small prompt changes affect model output.

**Flow**:
1. User creates a Loom with a base prompt
2. User generates a Continuation
3. User Forks from the Root, creating a variant prompt (slightly reworded)
4. User generates a Continuation from the variant
5. Repeat: create multiple prompt variants as siblings of the Root
6. User compares the downstream effects of each variant
7. User identifies which phrasings produce better results

**Value**: Builds prompting skill. Users learn that word choice, framing, and structure have real effects — and they can see those effects directly.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

### 1.4 Behavioral Documentation

**Goal**: Document and catalog observed model behaviors for future reference.

**Flow**:
1. User explores a model using any of the above patterns
2. User identifies an interesting behavior (e.g., "Claude tends to hedge when asked about X")
3. User Annotates the relevant Node(s) with observations
4. User creates a Document in the Grove summarizing the finding
5. User Links the Document to the relevant Nodes and pages/articles from the Field Guide
6. User Tags the Document for later retrieval (e.g., `#claude`, `#hedging`, `#uncertainty`)

**Value**: Transforms ephemeral observations into persistent knowledge. Users build a personal research archive that grows over time.

---

### 1.5 Assisted Exploration (Two-Role Pattern)

**Goal**: Use a Loom-Aware model to help analyze a non-Loom-Aware model.

**Flow**:
1. User creates a Loom with two Agents:
   - **Subject Agent**: backed by the model being studied, Loom-Aware = OFF
   - **Collaborator Agent**: backed by a capable model, Loom-Aware = ON
2. User interacts with the Subject Agent, generating branches
3. User invokes the Collaborator Agent to analyze the tree:
   - "Summarize the differences between these three branches"
   - "What patterns do you see in how the subject responds to X?"
   - "Which branch shows the strongest reasoning?"
4. Collaborator navigates the tree via tool calls, reads siblings, provides analysis, prompts the Subject itself to try things
5. User uses insights to guide further exploration

**Value**: Leverages model capability to accelerate research. The human remains in control, but gets analytical assistance.

**Agents Involved**: Human (Loom-Aware), Subject Model (not Loom-Aware), Collaborator Model (Loom-Aware)

---

### 1.6 Provenance Verification

**Goal**: Verify and demonstrate that a node genuinely came from a claimed source.

**Flow**:
1. User generates content from a model
2. System automatically:
   - Computes and stores content hash (chained to parents)
   - Submits hash to RFC 3161 timestamp authority
   - Stores compressed raw API response
3. Later, user (or third party) wants to verify authenticity
4. User invokes "View Provenance" on the Node
5. System displays:
   - Hash chain validation status
   - RFC 3161 timestamp certificate
   - Raw API response with metadata (request ID, headers, timestamps)
6. User exports provenance data for external verification if needed
7. User can generate a **Provenance QR Code** for sharing:
   - QR encodes a URL pointing to a verification endpoint
   - When scanned, displays: content hash, timestamp certificate, provenance summary
   - Enables low-friction verification without requiring Aspen Grove installation
   - Useful for publications, presentations, or sharing research findings

**Value**: Research credibility. Users can demonstrate that outputs are genuine, not fabricated. QR codes make verification accessible to anyone with a phone.

**Extends With** (Future): TLS Notary integration for cryptographic proof

---

## 2. Creation & Collaboration

These use cases center on producing output — writing, thinking, problem-solving — with models as collaborators. Voice Mode can enhance several of these workflows for hands-free use.

### 2.1 Buffer Mode Writing

**Goal**: Write and explore with seamless human-model co-authorship.

**Flow**:
1. User creates a Loom in Buffer Mode
2. User writes text (opening paragraph, story fragment, article intro, etc.)
3. User requests Continuation — model completes the text directly, streaming into the document
4. User edits inline, mixing their writing with model completions
5. Color/styling distinguishes human text from model text
6. At key decision points, user generates multiple Continuations (e.g., 3 different directions)
7. User navigates between branches, comparing directions
8. User pulls good ideas from different branches into the active line
9. Eventually, user settles on a final Path
10. User Exports the Path as a clean document

**Value**: Writing becomes exploration rather than commitment. Seamless co-authorship rather than turn-taking. Users can try risky directions knowing they can always backtrack.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

### 2.2 Collaborative Problem-Solving

**Goal**: Work through a complex problem with model assistance.

**Flow**:
1. User toggles Voice Mode ON (from menu bar or settings)
2. User creates a Loom in Dialogue Mode
3. User describes the problem via speech — app transcribes and sends after 4-second pause
4. Model offers initial analysis or solution, using **web search tools** to gather relevant information
5. Response is read aloud; node text changes color during speech
6. Speech finishes → app listens for user's follow-up
7. User pushes back, asks clarifying questions, or requests alternatives — all via voice
8. At key junctures, user stops to generate multiple Continuations (manual interaction)
9. User follows multiple branches in parallel, comparing where they lead
10. User Annotates dead ends with why they failed
11. User converges on a solution, documented across the successful Path

**Required Tools**:
- **Web Search**: Model can search the web for current information, documentation, research. Essential for real-world problem-solving.
- **Voice Mode**: Hands-free interaction via native platform APIs. Speech-to-text for input (auto-sends after 4s pause), text-to-speech for output. Critical for mobile/in-motion use. See domain language for full specification.

**Value**: Complex problems rarely have one right answer. Branching lets users explore the solution space systematically rather than getting stuck on the first idea. Voice Mode enables problem-solving while driving, walking, or otherwise occupied — the conversational loop continues hands-free until the user needs to branch or navigate.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware or Loom-Aware depending on need)

---

### 2.3 Iterative Refinement

**Goal**: Progressively improve a piece of content through model feedback.

**Flow**:
1. User creates a Loom with their draft content
2. User asks model for critique or suggestions
3. Model provides feedback
4. User Forks, incorporating some suggestions
5. User generates new critique on the revised version
6. Repeat, with each iteration as a new branch
7. User can Navigate back to compare versions
8. User Exports the final refined version

**Value**: Revision history is preserved and navigable. Users can see how the work evolved and revisit earlier stages.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

### 2.4 Multi-Model Collaboration

**Goal**: Leverage different models' strengths in a single creative process.

**Flow**:
1. User creates a Loom with multiple configured Agents (different models)
2. User starts with Model A for initial ideation (creative, divergent)
3. User switches to Model B for critique (analytical, precise)
4. User generates alternatives with Model C (different perspective)
5. Each Node is tagged with its generating Agent
6. User synthesizes the best elements via Merge or manual editing

**Value**: Models have different strengths. Multi-model workflows let users compose those strengths intentionally.

**Agents Involved**: Human (Loom-Aware), Multiple Models (various Loom-Aware settings)

---

## 3. Knowledge Management

These use cases center on organizing, connecting, and preserving what emerges from exploration and creation.

### 3.1 Building a Personal Knowledge Base

**Goal**: Accumulate insights, notes, and artifacts in an organized structure.

**Flow**:
1. User creates Documents for standalone notes and reference material
2. User creates Looms for model interactions
3. User Links related items (Document ↔ Loom, Node ↔ Document, etc.)
4. User applies Tags for cross-cutting organization
5. Over time, the Grove becomes a connected knowledge graph
6. User searches and navigates via Links and Tags

**Value**: Nothing is lost. Every interaction, every insight has a place and can be found again.

**Agents Involved**: Human (Loom-Aware)

---

### 3.2 Linking Insights to Evidence

**Goal**: Connect conclusions to the interactions that generated them.

**Flow**:
1. User explores a topic across multiple Loom Trees
2. User synthesizes findings in a Document
3. User Links specific claims in the Document to specific Nodes that support them
4. Reader (including future self) can follow Links to see the primary evidence
5. If the Loom has provenance data, claims can be verified against raw model output

**Value**: Research integrity. Conclusions are traceable to sources.

**Agents Involved**: Human (Loom-Aware)

---

### 3.3 Exporting and Sharing

**Goal**: Share discoveries with others outside Aspen Grove.

**Flow**:
1. User selects a Path, Loom, or Document to export
2. User chooses export format (Markdown, JSON, PDF)
3. System serializes content with appropriate structure
4. For Looms, user chooses whether to export:
   - Single Path (linear conversation)
   - Full tree (all branches)
   - Selected branches
5. User shares the exported file

**Value**: Knowledge doesn't stay locked in the app. Users can publish, collaborate externally, or archive.

**Extends With** (Future): Direct publishing to web, collaborative sharing with other Aspen Grove users

---

### 3.4 Learning via Field Guide

**Goal**: Understand how to use Aspen Grove and think about LLMs effectively.

**Flow**:
1. New user opens the Field Guide
2. User reads conceptual articles explaining Looms, latent space, multiverse thinking
3. User follows prompting guides to improve their interaction patterns
4. User references tool documentation when learning new features
5. User explores external resources for deeper learning
6. As user gains experience, they contribute observations to their own notes (linked to Field Guide concepts)

**Value**: The tool teaches its own philosophy. Users don't just learn buttons — they learn a way of thinking.

**Agents Involved**: Human

**Extends With** (Future): Personal observation notebook integrated with Field Guide, researcher interviews, community guides

---

## 4. Cross-Cutting Scenarios

These scenarios combine multiple use case patterns.

### 4.1 Research Project

**Goal**: Conduct a structured investigation into a model behavior or capability.

**Flow**:
1. User creates a Document outlining research questions
2. User creates multiple Loom Trees to explore different aspects
3. User uses Branching Exploration (1.1) and Comparative Model Study (1.2) patterns
4. User documents findings via Behavioral Documentation (1.4)
5. User links everything together in the Grove
6. User synthesizes a final report Document with Links to supporting evidence
7. User exports for publication or sharing

**Value**: Full research workflow in one environment — exploration, documentation, synthesis, export.

---

### 4.2 Long-Form Writing Project

**Goal**: Write a substantial piece (article, story, essay) with model collaboration.

**Flow**:
1. User creates a Document for outline and notes
2. User creates a Loom in Buffer Mode for drafting
3. User uses Buffer Mode Writing (2.1) to explore directions
4. User uses Iterative Refinement (2.3) to improve sections
5. User links outline Document to relevant Loom branches
6. User exports final Path as polished document

**Value**: The messy, non-linear process of writing is preserved and navigable. The final output is clean.

---

### 4.3 Model Onboarding

**Goal**: Get to know a new model's personality and capabilities.

**Flow**:
1. User adds a new Model to their Grove
2. User creates an Agent backed by the new Model
3. User runs through a personal "interview" Loom Tree — standard questions they ask every model
4. User generates multiple Continuations to see response variance
5. User compares to other models' interviews (Comparative Model Study, 1.2)
6. User documents first impressions (Behavioral Documentation, 1.4)
7. User references Field Guide for model-specific considerations

**Voice Mode variant**: User conducts the interview hands-free while on a walk. Toggle Voice Mode on, ask questions verbally, listen to responses, double-tap interesting nodes to replay them later. A relaxed way to get acquainted with a new model.

**Value**: Intentional relationship-building with models. Users develop informed preferences rather than defaulting to whatever's hyped.

---

## Agent Capabilities Summary

| Use Case | Human Loom-Aware | Model Loom-Aware | Notes |
|----------|------------------|------------------|-------|
| Branching Exploration | ✓ | ✗ | Human navigates, model responds |
| Comparative Model Study | ✓ | ✗ | Multiple models, none see tree |
| Prompt Iteration Study | ✓ | ✗ | Human creates variants |
| Behavioral Documentation | ✓ | — | Human-only activity |
| Assisted Exploration | ✓ | ✓ (collaborator) | Two-role pattern |
| Provenance Verification | ✓ | — | Human-only activity |
| Buffer Mode Writing | ✓ | ✗ | Human navigates, model completes |
| Collaborative Problem-Solving | ✓ | Optional | Web search + voice enabled |
| Iterative Refinement | ✓ | ✗ | Human drives iteration |
| Multi-Model Collaboration | ✓ | Varies | Per-agent configuration |
| Knowledge Management | ✓ | — | Human-only activity |
| Field Guide Learning | — | — | Passive consumption |

---

## Future Use Cases (Not MVP)

These require features beyond the initial implementation:

### Backroom Observation
Watch multiple models converse with each other. Human observes and occasionally intervenes. Requires: Backroom feature.

### Asynchronous Rumination
Leave a problem with a model, return later to find it has explored branches on its own. Requires: Ruminate mode, background processing.

### Collaborative Research
Multiple humans share a Grove, building on each other's work. Requires: Multi-user support, sync.

### Activation Pattern Analysis
Visualize and compare model activations across branches. Requires: Activation Memory system, interpretability tooling.

---

*This document should evolve as we learn from actual usage patterns.*