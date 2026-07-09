# Aspen Grove — Build Plan (revised 2026-07-07)

> Revised against `.dev/aspen-grove-goals.md` and a full audit of the codebase.
> Organizing principle: **ship a dialogue-mode loom I can use daily and put into TestFlight/Play beta**, then layer the differentiators (buffer mode, backrooms, import/export ecosystem, provenance UI) on top.
>
> Audience recalibration from goals doc: loom nerds / AI researchers / cyborgism crowd. Optimize for
> local-model support (LM Studio first-class), provenance as moat, import/export, and multimodal
> hypergraph trees — not for chasing general-consumer chat features.

---

## Status Snapshot (2026-07-07)

What the original phased plan called for vs. what actually exists:

| Original phase | Status |
|---|---|
| 0 Foundation | ✅ Done except media/file-system abstraction (defer until multimodal nodes) |
| 1 Core Data Layer | ✅ Done for dialogue slice (WatermelonDB v7, 9 repo impls). ❌ Tag/Link/Document/LocalModel/TimestampCertificate repos are interface-only |
| 2 LLM Providers | ◐ **Diverged, deliberately**: OpenRouter + LM Studio implemented (streaming + raw capture). Anthropic/OpenAI native adapters skipped — OpenRouter covers them. No retry logic, no OpenRouter model catalog |
| 3 Basic UI | ◐ Tree list, dialogue view, settings exist. No node detail, no agent library UI |
| 4 Generation Flow | ✅ Done for dialogue (context assembly, n>1 continuations, streaming, provenance storage). ❌ No truncation/exclusion filtering |
| 5 Tree Ops | ◐ Edit + path switching + bookmark *toggle* done. No prune UI, no tags, no links, no search, no bookmarks browse, no export |
| 6 Loom-Aware | ❌ Not started |
| 7 Buffer Mode | ❌ Not started (spec complete) |
| 8 Voice | ❌ Not started |
| 9 Summaries | ❌ Not started |
| 10 Documents | ❌ Placeholder tab only |
| 11 Provenance | ◐ **Over-delivered early (good)**: hash-chain verification implemented, tested, runs live on every model turn. ❌ No UI surface, no RFC 3161 |
| 12 Polish | ❌ Not started |

Also done, outside the original plan: **agent-centric pivot phases 1–3** (per-tree agents, tree-owned agents, agent-driven provider routing, pinned default agent — see `.dev/agent-centric-dialogue-settings.md`).

Hygiene: typecheck clean, eslint clean, 6 test suites green (core use cases + provenance verification).

---

## Deliberate divergences (now canon)

- **Providers = OpenRouter + LM Studio** for beta. OpenRouter is the many-models gateway; LM Studio is the first-class local provider (aligned with goals: local/self-hosted emphasis). Native Anthropic/OpenAI adapters are **post-beta, if ever**. Ollama adapter is post-beta (cheap: reuse LM Studio's OpenAI-compat path).
- **Provenance-first** was the right instinct — goals doc names provenance a product moat. Verification service is done; the *visible* part (node detail provenance view) moves into Beta 1.
- **Mobile agent harness / phone-actions**: cut, per goals doc ("I'm not building OpenClaw"). What survives is what already exists: LM Studio's server-side MCP passthrough (`useMcpTools`). No client-side tool execution, no iOS Shortcuts bridge.

---

## Milestone A — Finish the plumbing (before any new features) ✅ (2026-07-07)

**Goal**: everything already started gets finished or removed. No half-built layers under new construction.

### A1. Agent-centric pivot, phases 4–6 (from `.dev/agent-centric-dialogue-settings.md`) — *top priority* ✅
- [x] DialogueSettingsSheet: per-tree agent tweaks from the chat screen (shared-agent fork prompt: "edit shared" vs "customize for this tree") — `chat/dialogue-settings/`, spec in `docs/architecture/specs/dialogue-settings-ui.md`
- [x] Settings → Agents library: real CRUD (create/edit shared agents), replacing the "Agents (placeholder)" section — `settings/agents/` with editor sheet, templates, catalog picker
- [x] Settings → Connections section: OpenRouter key + LM Studio endpoint/token/MCP/auto-load **only** — `settings/connections/` with "Test connection"
- [x] Removed ProviderPickerSection, singleton assistant helpers, and the implicit create-agent-on-settings-save hack
- [x] Wired `CreateSharedAgent`, `UpdateAgentConfiguration`, `ForkAgentForTree`, `UpdateTreeDefaultAgent`
- [x] Tree agent changeable after creation (chat ⚙️ → Switch agent)
- [x] `useSettingsController` split into `useConnectionsController` / `useAppearanceController` / `useAgentsLibraryController`; temperature dual-write gone

### A2. Context assembly hardening ✅
- [x] Exclusion filtering (pruned/excluded) — verified already present; covered by new tests
- [x] Truncation: `truncateMiddle` default + ~4 chars/token estimation + 1024-token response buffer + min 4 recent messages; system context never truncated (`application/services/context/`). `rollingWindow`/`stopAtLimit` are stubbed strategies for later
- [x] Agent `maxTokens`/`stopSequences` verified flowing end-to-end (was already plumbed; now tested). Note: per-model context window comes from `configuration.customParameters.maxContextTokens` when set, else a documented 128k default

### A3. Error handling & reliability ✅
- [x] `onSetUpError` captured via `persistence/watermelon/setup-error.ts` and surfaced through the AppBootstrapGate
- [x] Retry-with-backoff (`services/llm/retry.ts`): retryable errors only, max 2 retries, 500ms/1500ms, honors provider `retryAfterMs`; streaming retries only before the first chunk
- [x] `console.info` remnants stripped (chat controller, collect-completion, ephemeral-tree hook); startup orchestrator routes through `__DEV__`-gated `dev-log`
- [x] `jsi: true` kept intentionally on both platforms — watermelondb 0.28 supports Android JSI and falls back to the async dispatcher if JSI init fails

### A4. Model selection UX (plumbing half of it) ✅
- [x] `OpenRouterModelCatalog`: public catalog fetch, 24h cache in WatermelonDB LocalStorage, stale-on-error fallback
- [x] Unified picker data source (`useModelPickerData`) feeding the agent editor for both OpenRouter (searchable + custom ids) and LM Studio (live discovery)

---

## Milestone B — Loom UX to prototype parity ✅ (2026-07-08)

**Goal**: the dialogue surface earns the "mobile loom" title. Reference: Swift prototype + `docs/architecture/specs/loom-ui-rebuild-implementation-plan.md`. Functionality-first; visual polish only where it *is* the functionality.

- [x] **Inline continuation rail**: renders inside the message scrollview directly under the rail's source node (`ChatMessageList` hosts `ContinuationRail`, pushes content down)
- [x] Node tap affordances: single-tap toggles the rail for that node; inline caption under nodes with `Continuations: N` + bookmark + pruned indicators (`ChatRow` now carries `continuationCount`/`pruned`, batch edge lookup in `loadDialogueRowsForPath`)
- [x] **Node detail sheet** (`chat/node-detail/`): full text, metadata, generation info (provider/model/request id/latency/token usage from `rawApiResponseRepo.findByNodeId`), and a live provenance panel that runs `verifyModelNodeProvenance` per node — works for any model node, not just the latest turn. Replaces the `Alert.alert` Node Info
- [x] Continuation card single-tap = detail sheet (deferred past the double-tap window), double-tap = make current
- [x] Bookmarks browse: `BookmarksSheet` (prototype's BookmarkSheet shape) from a chat-header bookmark button; `nodeRepo.findBookmarked`, tap = rewind, Details = node detail sheet
- [x] Prune/restore in node context menu + detail sheet (`updateMetadata({ pruned })`); pruned rows render dimmed with caption
- [x] Design tokens: `theme.styles` merged into `loomUiTokens` (single source, values marked provisional — auto-extracted and drifted; reconcile against the Swift prototype in the design pass); `colors` prop-drilling removed, hook-only access
- [x] Dark-only for beta made explicit in `useAspenGroveTheme` (dead light palette removed; lives in git history)

**Explicitly deferred styling**: the "unique/out-there" cross-platform visual identity. Keep the current serif+mono dark vibe (it's already 70% of the prototype's feel); do the real design pass after beta feedback.

---

## Milestone C — What loom nerds need on day one ✅ (2026-07-08)

**Goal**: the features the goals doc calls "paramount" for the actual audience.

**Direction locked in during build**: Aspen Grove imports from *any* loom format (adapter registry), but exports *only* Open Loom (+ Markdown path for humans).

- [x] **Import/export** — elevated from a Phase-5 line item to a pillar:
  - [x] **Open Loom v2 spec authored** at `docs/open-loom/spec.md` — versioned, hypergraph-native (flat node map + explicit hyperedge list), multi-root, content-block unions, 3-tier provenance (descriptive/integrity/evidence), namespaced extensions. Informed by a survey of socketteer loom, Loomsidian, MiniLoom, ExoLoom, and the Swift prototype's v1
  - [x] Export tree as Open Loom JSON (full fidelity: nodes, edges, agents, hash chain, raw-response evidence, with privacy toggles) + export active path as Markdown — `application/services/open-loom/`, `ExportLoomTreeUseCase`, `ExportPathMarkdownUseCase`
  - [x] Import adapters: Open Loom v2, Open Loom v1 (Swift prototype), socketteer/loom (incl. bare-node leniency + `model_responses` provenance), Loomsidian (plugin data.json, multi-note). MiniLoom detected but deferred (needs diff-match-patch materialization). `ImportLoomTreeUseCase` re-mints ULIDs, recomputes local hashes, synthesizes roots for multi-root trees, rebuilds the active path
  - [x] Share sheet integration (expo-sharing/file-system/document-picker): export via chat header menu, import via tree-list header button
- [x] Search across trees (`nodeRepo.searchByContent` LIKE query; Search tab replaces the Documents placeholder tab; results grouped by tree, tap → node detail)
- [x] Tag repository impl (`WatermelonTagRepository`, schema v8 `tags`/`tag_assignments`) + minimal tag UI (chat menu → Tags sheet to assign/create; tree list filter chips)

Also shipped in this pass (user-requested):
- [x] Tree list sorted by most-recent message (`loom_trees.last_message_at`, touched by send/continuation use cases — metadata edits no longer reorder the list)
- [x] AI conversation titles: one extra call to the tree's agent model after the first response (`GenerateTreeTitleUseCase`), gated by new `UserPreferences.autoTitleEnabled` toggle (Settings → Behavior), only ever replaces default timestamp titles
- [x] Settings restructured from one flat scroll into a nested stack (Settings home → Agents / Connections / Typography / Behavior with native push/pop)
- [x] Schema v8 migration: `last_message_at`, `auto_title_enabled`, tag tables, index on `nodes.loom_tree_id`

---

## Milestone D — Beta ship (TestFlight + Play)

**Goal**: approvable builds, honest first-run experience.

- [x] Hide or replace the Documents placeholder tab (a visibly dead tab is a review-quality smell) — replaced with the Search tab in Milestone C
- [ ] First-run onboarding-lite: what a loom is (3 screens max), connect OpenRouter or LM Studio, create first tree. The full Field Guide (Sanity CMS) stays post-beta; a static "what is this" screen is enough
- [ ] Empty states (no API key, no trees, LM Studio unreachable) with actionable guidance
- [ ] Error-handling audit: every provider/DB failure has a user-visible, non-technical surface
- [ ] App icons, splash, store listings, screenshots
- [ ] Privacy policy + data disclosure (keys in Keychain/Keystore, all data local, gzip'd raw API responses on device)
- [ ] EAS build profiles, TestFlight + Play internal track submission
- [ ] Performance sanity pass on a large tree (500+ nodes): list virtualization, path-switch latency

**Beta 1 definition of done**: create tree → pick/configure agent → converse with branching → browse siblings inline → edit-as-branch → bookmark → view provenance → export → survives restart. On both platforms, against both OpenRouter and LM Studio.

---

## Post-beta ladder (rough order)

1. **Buffer Mode** (`docs/architecture/specs/buffer-mode.md`) — spec complete; core of the "notes a base model can continue" pillar. Biggest single chunk remaining
2. **Backrooms / multi-agent trees** — two agents on one tree, alternating turns, human observes/intervenes. Builds directly on the per-tree agent layer (agent plan Phase 7: `participatingAgentIds`). Cheap-ish and highly differentiating — promote into beta 2 if momentum is good
3. **Documents & knowledge layer** (Phase 10) — block editor, node/tree embeds, links. Repo interfaces exist
4. **Summaries** (Phase 9) — needed before loom-aware tools; also improves long-tree context
5. **Loom-aware tools** (Phase 6, `docs/architecture/specs/loom-tools/`) — the two-role collaborator pattern; depends on summaries + tree ops
6. **Provenance completion** — RFC 3161 timestamps + verification UI polish (hash chains already live)
7. **Voice Mode** (Phase 8) — deprioritized: not mentioned in goals doc; revisit after beta feedback
8. **Ollama adapter**; native Anthropic/OpenAI adapters only if users demand them
9. **Sync subscription** (E2EE device sync, Obsidian-style) — the monetization candidate; needs backend decision (deferred per docs review)
10. **Publishing/sharing platform** ("LessWrong for looms", Intrinsic Labs-curated) — separate product; needs market research first
11. **Interp/latent-space mapping experiments** — the long-tail moat features; design after real usage

---

## Dependency notes

- A must precede B's settings-adjacent work (B builds on the post-pivot settings/agent structure)
- A2 (truncation) and A3 (retry) are independent — parallelize freely
- C is independent of B except the share-sheet entry point
- D depends on A + B; C's import/export is strongly desired for beta but severable
- Post-beta items 1, 2, 3 are mutually independent; 5 depends on 4

---

## Standing invariants (from docs, unchanged)

- Nodes immutable; edits create nodes with `editedFrom`; edited nodes are always human-authored
- Raw response bytes hashed before parsing; provenance capture on every model node
- No global active provider — routing is per-agent `modelRef`
- Clean architecture, dependencies inward; boundaries enforced by eslint-plugin-boundaries
- Streamed deltas never hit the DB; persist once on completion/interruption
