# Dialogue UI Branching + Streaming Spec (Prototype Parity)

Status: Draft  
Audience: Interface, Application, and Infrastructure implementers  
Scope: Dialogue mode only

## 1) Product Goals

- Replicate the proven prototype interaction model for tree navigation on mobile.
- Keep the default chat reading experience linear and uncluttered.
- Add true assistant token streaming in UI without regressing input/scroll performance.
- Preserve current provenance guarantees and use existing application layer contracts where possible.

## 2) Non-Goals (This Slice)

- No Buffer mode UI.
- No markdown rendering in chat content.
- No provenance verification UI beyond node-detail metadata surfacing.
- No multi-provider tool UI expansion beyond current OpenRouter support.

## 3) UX Rules (Required)

- Inline authorship labels are hidden by default in the main chat stream.
- Authorship/model/provenance metadata is shown in node detail and continuation/detail surfaces.
- Assistant messages render as full-width text blocks (no bubble by default).
- User messages render using the configured node style (`filled`/`outlined`) and corner radius from `UserPreferences`.
- Branch controls are contextual to a selected node, not global controls in the top bar.

## 4) Prototype-Parity Interaction Model

### 4.1 Main Dialogue View

- Vertical scroll of node content in active path order.
- Node-level long press opens action menu:
  - Regenerate Response
  - Continuations
  - Rewind To Node
  - Copy Text
  - Node Info
  - Bookmark
- Node may expose inline continuations affordance (`Continuations: N`).
- Composer remains pinned at bottom, keyboard-aware.

### 4.2 Continuation Browser

- Entered from node action or inline continuations affordance.
- Horizontal rail of continuation preview cards for selected source node.
- Card metadata includes:
  - model/provider label
  - branch depth/count badge in square brackets
  - active-branch indicator (green check) if card node is on current active path
- Gestures:
  - single tap: expand preview/focus card
  - double tap: make current node (switch active path)
  - long press: continuation menu
- Continuation menu:
  - Make Current Node
  - Retrace Branch
  - Copy Text
  - Bookmark

### 4.3 Node Detail Surface

- Full node text with metadata header:
  - author (User / model id)
  - local id
  - optional provider/model reference
- Menu:
  - Copy All Text
  - Rewind To Node
  - Bookmark

## 5) Domain/Application Mapping

| UI mechanism | Domain concept | Existing use case / contract | New work needed |
|---|---|---|---|
| Main chat sequence | `PathNode[]` materialized active path | `IPathRepository.getNodeSequence`, `INodeRepository.findById` | Build a dedicated read-model hook for active path rows |
| "Make current node" | Active path switch | `SwitchDialoguePathUseCase.execute` | Wire from continuation card double-tap/menu |
| "Regenerate response" | New continuation from selected node | `GenerateDialogueContinuationUseCase.execute` | Wire from node menu and enable streaming callback |
| Sending user turn | Human node + model continuation | `SendDialogueTurnUseCase.execute` | Add UI streaming row updates via `onAssistantTextDelta` |
| Interrupted stream persistence | Model node may be partial | `SendDialogueTurnUseCase` / `GenerateDialogueContinuationUseCase` | Add partial-finalization path that commits non-empty streamed text on timeout/network failure |
| Continuations list for node | Outgoing continuation edges | `IEdgeRepository.findBySourceNodeId`, `INodeRepository.findById` | Add app-layer query service/use case to return preview DTOs |
| Active-branch indicator | Node membership in current path | `IPathRepository.getNodeSequence` | Compare continuation node ids against active path set |
| "Rewind to node" | Truncate/switch active path to target | `SwitchDialoguePathUseCase.execute` | Provide menu action wrapper |
| Bookmark actions | Node metadata mutation | `INodeRepository.updateMetadata` | Add small use case for intent clarity |
| Node provenance display | `RawApiResponse`, `Node.contentHash`, parent edges | existing repositories + provenance service outputs | Read-only DTO for node detail metadata |

## 6) Streaming Behavior Spec (Performance-Critical)

### 6.1 Source of Truth

- Persisted source of truth remains Watermelon entities (`Node`, `Edge`, `PathNode`, `RawApiResponse`).
- Streaming text is transient UI state while in flight.
- If stream is interrupted after receiving non-empty assistant text, that partial text is promoted to persisted state as a real assistant node.

### 6.2 Rendering Strategy

- On send/regenerate:
  - insert user node immediately when `onUserNodeCommitted` fires (already implemented).
  - create a transient `pendingAssistantRow` in controller state.
- On each `onAssistantTextDelta`:
  - append delta to a mutable buffer reference.
  - flush to React state on a frame throttle (target ~30 fps max) to avoid re-render-per-token.
- On completion:
  - remove transient row.
  - refresh rows from persistence once (single read sync point).

### 6.3 Constraints

- Never write incremental token deltas to DB during streaming.
- Persist at most once for assistant output:
  - normal completion path, or
  - interrupted partial-finalization path (only if streamed text is non-empty).
- Never recompute full row mapping on every token delta.
- Keep list keys stable to avoid remounting row components.
- Keep auto-scroll conditional: only stick to bottom when user is already near bottom.

### 6.4 Failure Handling

- Provider/network failure (midstream):
  - if streamed assistant text length > 0:
    - finalize and persist assistant node with the partial text.
    - mark output as interrupted (see 6.5).
    - keep committed user node and append partial assistant node to path.
  - if streamed assistant text length === 0:
    - do not create assistant node.
    - keep committed user node.
  - display error state inline (existing pattern).
- Timeout:
  - same behavior as provider/network failure.
- Manual cancel (future):
  - same behavior as timeout.

### 6.5 Interrupted Output Representation

- First pass representation uses a textual interruption marker appended to persisted assistant content:
  - `\n\n[stream interrupted: <reason>]`
  - reasons: `timeout`, `network`, `provider_error`, `cancelled`
- `completion.finishReason` should remain `error` for interrupted outputs.
- Raw response capture should store whatever response bytes were actually received up to interruption.

## 7) Read Models + UI Modules (Target File Shape)

- `interface/features/dialogue/useDialogueRows.ts`
  - active path row loading, near-bottom tracking, refresh orchestration
- `interface/features/dialogue/useStreamingAssistantRow.ts`
  - transient assistant row buffer + throttled flush
- `interface/features/dialogue/useNodeContinuations.ts`
  - load continuation preview DTOs for selected source node
- `interface/features/dialogue/components/`
  - `DialogueList.tsx`
  - `UserMessageBubble.tsx`
  - `AssistantMessageBlock.tsx`
  - `ContinuationRail.tsx`
  - `NodeActionMenu.tsx`
  - `NodeDetailSheet.tsx`

Note: keep all style tokens sourced from shared UI system primitives/theme; do not duplicate literal spacing/color/font definitions across feature files.

## 8) Data DTOs (Interface Layer)

### 8.1 Dialogue Row DTO

- `id: ULID | "streaming:<id>"`
- `nodeId?: ULID`
- `text: string`
- `role: "human" | "model"`
- `isStreaming?: boolean`
- `styleVariant: "assistantPlain" | "userFilled" | "userOutlined"`

### 8.2 Continuation Preview DTO

- `nodeId: ULID`
- `previewText: string`
- `modelLabel?: string`
- `isOnActivePath: boolean`
- `onBranchCount: number`
- `isBookmarked: boolean`

## 9) First-Pass Algorithms

### 9.1 Continuation previews for source node

- Query outgoing edges via `findBySourceNodeId(sourceNodeId)`.
- Filter `edgeType === "continuation"`.
- Load target nodes.
- Sort by `createdAt` ascending for deterministic order.

### 9.2 `isOnActivePath`

- Build `Set<ULID>` from current `pathRepo.getNodeSequence(pathId)`.
- `isOnActivePath = activeSet.has(continuationNodeId)`.

### 9.3 `onBranchCount` (first pass)

- If continuation node is on active path:
  - `count = activePathLength - activeIndex(continuationNodeId)`.
- Else:
  - `count = 1`.

This matches prototype intent ("how much active branch follows this node") with minimal compute.

## 10) Settings Integration

- Continue using `UserPreferences` as styling/config source.
- Use existing fields:
  - `fontFace`
  - `fontSize`
  - `nodeViewStyle`
  - `nodeViewCornerRadius`
- Apply these to user message bubbles and composer text/input typography.
- Keep assistant messages unboxed regardless of user bubble style.

## 11) Incremental Implementation Plan

### Phase A: Streaming-only UI parity

- Add transient streaming assistant row with throttled updates.
- Keep current visual design otherwise unchanged.
- Acceptance:
  - user message appears immediately
  - assistant appears token-by-token
  - no dropped frames in normal usage

### Phase B: Node action model + continuation rail

- Add long-press node menu.
- Add continuation rail with tap/double-tap/long-press behaviors.
- Wire actions to existing use cases.
- Acceptance:
  - can switch branches from rail/menu
  - can regenerate from arbitrary node
  - active-path indicator matches path state

### Phase C: Node detail + provenance metadata surface

- Add node detail sheet with author/model/local id/hash summary fields.
- Add copy/bookmark/rewind actions.
- Acceptance:
  - no authorship labels in main feed
  - authorship visible in detail only

### Phase D: Full visual parity pass

- Align spacing, typography, surface tone, cards, and micro-interactions to prototype references.
- Acceptance:
  - screenshots from main flows are visually/mechanically equivalent

## 12) Testing Strategy

- Unit tests:
  - continuation preview mapping service
  - on-branch count computation
  - streaming reducer/throttle behavior
- Integration tests:
  - send turn with streaming deltas
  - regenerate from historical node
  - switch active path to sibling continuation
- Device validation:
  - iOS and Android keyboard + scroll + composer behavior under streaming load
  - long conversation scroll and continuation interactions
