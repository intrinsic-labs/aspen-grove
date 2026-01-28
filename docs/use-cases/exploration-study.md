# Exploration & Study Use Cases

> Understanding how models think, behave, and respond. This is Aspen Grove's distinctive strength.

---

## 1.1 Branching Exploration

**Goal**: Explore how a model responds differently to the same prompt.

**Flow**:
1. User creates a new Loom Tree in Dialogue Mode
2. User writes a prompt and requests multiple Continuations (e.g., 5)
3. System generates 5 sibling Nodes from the same Branch Point
4. User reviews siblings, comparing tone, content, reasoning
5. User bookmarks interesting variations
6. User continues from one or more branches, creating many possible Paths
7. User annotates nodes with observations

**Value**: Reveals the probability space behind a single prompt. Users see that models don't have "an answer" — they have a distribution of possible answers. This builds intuition for how to steer models.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

## 1.2 Comparative Model Study

**Goal**: Compare how different models respond to the same prompt.

**Flow**:
1. User creates a Loom Tree with an initial prompt Node
2. User configures multiple Agents backed by different Models (e.g., Claude, GPT-4, Llama)
3. User generates Continuations from the same Node using each Agent
4. System creates sibling Nodes, each tagged with its generating Agent
5. User compares responses side-by-side
6. User continues promising branches with the same or different models
7. User documents findings via Annotations or linked Documents

**Value**: Direct comparison reveals model personalities, strengths, and blind spots. Over time, users develop preferences and intuitions for which models suit which tasks.

**Agents Involved**: Human (Loom-Aware), Multiple Models (not Loom-Aware)

---

## 1.3 Prompt Iteration Study

**Goal**: Understand how small prompt changes affect model output.

**Flow**:
1. User creates a Loom Tree with a base prompt
2. User generates a Continuation
3. User Forks from the Root, creating a variant prompt (slightly reworded)
4. User generates a Continuation from the variant
5. Repeat: create multiple prompt variants as siblings of the Root
6. User compares the downstream effects of each variant
7. User identifies which phrasings produce better results

**Value**: Builds prompting skill. Users learn that word choice, framing, and structure have real effects — and they can see those effects directly.

**Agents Involved**: Human (Loom-Aware), Model (not Loom-Aware)

---

## 1.4 Behavioral Documentation

**Goal**: Document and catalog observed model behaviors for future reference.

**Flow**:
1. User explores a model using any of the above patterns
2. User identifies an interesting behavior (e.g., "Claude tends to hedge when asked about X")
3. User Annotates the relevant Node(s) with observations
4. User creates a Document in the Grove summarizing the finding
5. User Links the Document to the relevant Nodes and pages/articles from the Field Guide
6. User Tags the Document for later retrieval (e.g., `#claude`, `#hedging`, `#uncertainty`)

**Value**: Transforms ephemeral observations into persistent knowledge. Users build a personal research archive that grows over time.

**Agents Involved**: Human (Loom-Aware)

---

## 1.5 Assisted Exploration (Two-Role Pattern)

**Goal**: Use a Loom-Aware model to help analyze a non-Loom-Aware model within a Loom Tree.

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

## 1.6 Provenance Verification

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
   - QR encodes provenance data directly (hash, timestamp certificate, summary)
   - Scanned by another Aspen Grove instance, which verifies locally
   - No web service required — verification is device-to-device
   - Useful for in-person verification, presentations, or sharing research findings
   - *Note: Post-MVP feature*

**Value**: Research credibility. Users can demonstrate that outputs are genuine, not fabricated. QR codes make verification accessible to anyone with a phone.

**Extends With** (Future): TLS Notary integration for cryptographic proof

---

## Related Documentation

- [Domain Language: Core Concepts](../domain-language/core-concepts.md) — Loom Tree, Node, Edge, Path
- [Domain Language: Interaction Modes](../domain-language/interaction-modes.md) — Loom-Aware settings
- [Provenance Overview](../provenance-overview.md) — Verification and authenticity
- [Creation & Collaboration](./creation-collaboration.md) — Related use cases