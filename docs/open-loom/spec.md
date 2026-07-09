# Open Loom — Portable Loom Tree Interchange Format

**Version 2.0 (draft)** · Maintained by Intrinsic Labs / Aspen Grove
**Media type:** `application/vnd.openloom+json` · **Extension:** `.openloom` (plain JSON also accepted as `.json`)

---

## 1. Purpose & design goals

Open Loom is a JSON interchange format for **loom trees** — branching, multi-author
explorations of language-model output. It exists so a tree created in one loom
(Aspen Grove, socketteer loom, Loomsidian, MiniLoom, ExoLoom, …) can be opened in
another without losing structure, attribution, or provenance.

Design goals, in priority order:

1. **Lossless for structure.** Branching topology — including hypergraph edges,
   multi-root trees, and edit lineage — survives round-trips.
2. **Provenance-capable, provenance-optional.** The format can carry full
   cryptographic provenance (content hashes, hash chains, raw API response
   evidence), but a minimal exporter can omit all of it.
3. **Readable and writable by small tools.** A conforming minimal file is a few
   dozen lines of obvious JSON. Complexity is opt-in.
4. **Forward-compatible.** Versioned, with explicit rules for unknown fields and
   a namespaced extension mechanism.

### 1.1 Relationship to Open Loom v1

Open Loom v1 (the Loom Swift prototype format) was an unversioned flat node map
with `parentId`/`childrenIds` pointers and a duplicated `bookmarkedNodes`
dictionary. v2 is a redesign, not an evolution: topology moves into explicit
edges (hypergraph support), authorship becomes a first-class object, provenance
is structured, and the container is versioned. v1 files remain importable
(§ 8.1); v2 is the only export target.

### 1.2 Lessons from the ecosystem

The format normalizes divergences observed across community looms:

| Concern | Community reality | Open Loom v2 answer |
|---|---|---|
| Topology encoding | Nested `children` objects (socketteer), flat map + parent pointer (Loomsidian), flat map + both pointers (MiniLoom) | Flat node map + explicit **edge list** (§ 4.4) |
| Multi-root | Faked with immutable empty roots, or unsupported | `rootNodeIds` array (§ 4.2) |
| Authorship | `type: user\|gen`, `meta.source: AI\|prompt\|mixed`, or absent | `author.role` enum incl. `mixed` (§ 4.3) |
| Content | Full text, chat messages, or diff-patches against parent | Content block union; importers materialize diffs (§ 4.3, § 8) |
| Provenance | Rich (socketteer `model_responses`) to none (Loomsidian) | Optional `generation` object (§ 5) |
| UI state | Mixed into data (collapsed/unread/hoisted) | Excluded from core; extensions only (§ 7) |
| Versioning | None anywhere | Required `version` field (§ 3) |

---

## 2. Conformance language

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be
interpreted as described in RFC 2119.

Two conformance roles:

- **Exporter** — produces Open Loom documents.
- **Importer** — consumes them. Importers SHOULD be lenient (accept what they
  can interpret, preserve what they can't) and MUST NOT fail on unknown fields.

---

## 3. Document container

The top-level value is a JSON object:

```json
{
  "format": "open-loom",
  "version": "2.0",
  "exportedAt": "2026-07-08T21:14:00Z",
  "generator": { "name": "Aspen Grove", "version": "0.9.0" },
  "trees": [ /* one or more Tree objects, § 4 */ ],
  "agents": { /* optional shared agent registry, § 4.5 */ },
  "extensions": {}
}
```

| Field | Type | Req | Notes |
|---|---|---|---|
| `format` | string | MUST | Literal `"open-loom"`. Primary detection signal. |
| `version` | string | MUST | `"<major>.<minor>"`. See § 3.1. |
| `exportedAt` | timestamp | SHOULD | See § 3.2. |
| `generator` | object | SHOULD | `name` + optional `version`, free-form. |
| `trees` | Tree[] | MUST | One or more. A single-tree export is a one-element array. |
| `agents` | map | MAY | Document-level agent registry shared across trees. |
| `extensions` | object | MAY | § 7. |

### 3.1 Versioning policy

- **Minor** bumps add optional fields only. An importer for 2.0 MUST accept any
  2.x document, ignoring fields it doesn't know.
- **Major** bumps may change structure. Importers SHOULD refuse majors they
  don't understand, with a clear message.
- Exporters MUST write the lowest version that expresses their content.

### 3.2 Timestamps, IDs, and text

- Timestamps are ISO-8601 strings with timezone (UTC `Z` preferred),
  millisecond precision allowed: `"2026-07-08T21:14:00.123Z"`.
- IDs are opaque non-empty strings, unique within their scope (nodes and edges
  share a tree-wide scope; trees and agents are document-scoped). ULIDs are
  RECOMMENDED for new IDs. Importers MUST treat IDs as opaque — no format may
  be assumed — and MUST remap on collision with local data.
- All text is UTF-8. Node text SHOULD be treated as Markdown-compatible plain
  text; importers MUST NOT require it to parse as Markdown.

---

## 4. Tree

```json
{
  "id": "01J8ZC3YV3N9K5T2W7QF4XH2MB",
  "title": "Marie Character Study",
  "description": "Exploring Marie's voice across models",
  "mode": "dialogue",
  "systemContext": "You are…",
  "rootNodeIds": ["n-root"],
  "currentNodeId": "n-b3k9",
  "createdAt": "2026-06-30T10:00:00Z",
  "updatedAt": "2026-07-08T21:10:00Z",
  "nodes": { "n-root": { }, "n-a7x2": { } },
  "edges": [ ],
  "tags": [ { "name": "research", "color": "#7A9E7E" } ],
  "extensions": {}
}
```

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | MUST | |
| `title` | string | MUST | May be empty. |
| `description` | string | MAY | |
| `mode` | string | SHOULD | `"dialogue"` \| `"buffer"`; unknown values allowed, importers map to their nearest mode. Default `"dialogue"`. |
| `systemContext` | string | MAY | Tree-level system prompt. Exporters SHOULD offer excluding it (it often carries private material). |
| `rootNodeIds` | string[] | MUST | ≥ 1 entry. Multi-root trees list every root. |
| `currentNodeId` | string | MAY | The selected/active node at export time. |
| `createdAt` / `updatedAt` | timestamp | SHOULD | |
| `nodes` | map<id, Node> | MUST | Flat map; topology lives in `edges`. |
| `edges` | Edge[] | MUST | May be empty only for single-node trees. |
| `tags` | TagDef[] | MAY | Tree-level tag definitions (`name` MUST, `color` MAY). Nodes reference tags by name. |
| `agents` | map | MAY | Tree-scoped agent registry; overrides document-level on ID conflict. |
| `extensions` | object | MAY | |

### 4.1 Structural invariants

A valid tree satisfies (importers SHOULD validate and repair, not crash):

- Every `rootNodeIds` entry and `currentNodeId` resolves to a key in `nodes`.
- Every edge's `targetNodeId` and every `sources[].nodeId` resolve in `nodes`.
- No node is the target of more than one `continuation` edge **unless** the
  format consumer supports DAGs; strict-tree importers MUST keep the first
  continuation edge (in array order) and MAY drop or demote the rest.
- The continuation-edge graph is acyclic.
- Roots are exactly the nodes that are not the target of any continuation edge.
  (`rootNodeIds` is asserted redundantly so damaged files are repairable.)

### 4.2 Sibling order

Sibling order is meaningful in every surveyed loom. The order of edges in the
`edges` array defines sibling order among continuations that share a source.
Exporters MUST emit edges in intended sibling order; importers MUST preserve it.

### 4.3 Node

```json
{
  "id": "n-a7x2",
  "content": [ { "type": "text", "text": "The rain had a grammar of its own…" } ],
  "author": { "role": "model", "agentId": "agent-claude-creative" },
  "createdAt": "2026-07-01T12:30:05Z",
  "editedFrom": "n-a7x1",
  "meta": {
    "bookmarked": true,
    "bookmarkLabel": "tone shift",
    "pruned": false,
    "excluded": false,
    "tags": ["research"],
    "rating": 1,
    "note": "this is where it gets good"
  },
  "generation": { },
  "extensions": {}
}
```

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | MUST | |
| `content` | ContentBlock[] | MUST | Ordered blocks; a plain-text node is a one-element array. |
| `author` | Author | MUST | § below. |
| `createdAt` | timestamp | SHOULD | |
| `editedFrom` | string | MAY | Node ID this node was created by editing. Edit lineage, not topology. |
| `meta` | object | MAY | All subfields optional; absent = defaults below. |
| `generation` | Generation | MAY | § 5. Only meaningful when `author.role` is `model` or `mixed`. |
| `extensions` | object | MAY | |

**Author** — `{ "role": "human" | "model" | "system" | "mixed", "agentId"?: string, "name"?: string }`.
`mixed` means human-edited model output (socketteer's `source: "mixed"`).
`agentId` references an agent registry entry (§ 4.5); `name` is a fallback
display label when no registry entry exists.

**ContentBlock** — discriminated union on `type`:

- `{ "type": "text", "text": string }`
- `{ "type": "image", "ref": string, "mimeType": string, "width"?: number, "height"?: number, "altText"?: string }`
- `{ "type": "audio", "ref": string, "mimeType": string, "durationMs"?: number, "transcript"?: string }`

`ref` is either a `data:` URI (self-contained documents) or a relative path
inside an Open Loom **bundle** — a ZIP whose root contains `tree.openloom` plus
referenced media files. Exporters SHOULD prefer bundles above ~1 MB of media.
Unknown block types MUST be preserved on re-export and rendered as a
placeholder. Text-only importers MAY substitute `altText`/`transcript`.

**meta defaults:** `bookmarked` false, `pruned` false (soft-hidden branch),
`excluded` false (omitted from model context), `tags` empty, `rating` absent
(integer, negative = bad, positive = good — carries MiniLoom-style preference
signal), `note` absent (free-text annotation; richer annotations should use
annotation edges instead).

### 4.4 Edge

Topology is an explicit list of directed hyperedges — the superset that
`children` arrays, parent pointers, and Aspen Grove's multi-source edges all
project into:

```json
{
  "id": "e-1",
  "type": "continuation",
  "sources": [ { "nodeId": "n-root", "role": "primary" } ],
  "targetNodeId": "n-a7x2",
  "createdAt": "2026-07-01T12:30:05Z",
  "extensions": {}
}
```

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | SHOULD | Importers mint one if absent. |
| `type` | string | MUST | `"continuation"` (context-bearing traversal) or `"annotation"` (attached note, excluded from context by default). Unknown types are preserved but treated as annotations for traversal. |
| `sources` | Source[] | MUST | ≥ 1. `role` ∈ `"primary"` \| `"context"` \| `"instruction"`; default `"primary"`. Multi-source = hyperedge. |
| `targetNodeId` | string | MUST | |
| `createdAt` | timestamp | MAY | |

Simple parent→child links are single-source `primary` continuation edges.
Strict-tree importers MUST use the `primary` source as the parent and MAY
surface other sources as annotations.

### 4.5 Agent registry

Attribution beyond a role enum, without forcing every file to carry it:

```json
"agents": {
  "agent-claude-creative": {
    "name": "Claude Creative",
    "type": "model",
    "modelRef": "openrouter:anthropic/claude-sonnet-4.5",
    "configuration": { "temperature": 1.0, "systemPrompt": "…" }
  },
  "agent-asher": { "name": "Asher", "type": "human" }
}
```

`name` and `type` (`"human"` | `"model"`) are required per entry; `modelRef`
(`{provider}:{identifier}`) and `configuration` (free-form; recognized keys:
`systemPrompt`, `temperature`, `maxTokens`, `stopSequences`) are optional.
Exporters SHOULD offer excluding `configuration.systemPrompt` (private
material). Importers map unknown agents to local agents or plain labels.

---

## 5. Generation provenance

The `generation` object records how a model node came to exist. Every field is
optional; exporters include what they have. Three tiers:

**Tier 1 — descriptive** (every loom can write this):

```json
"generation": {
  "provider": "openrouter",
  "model": "anthropic/claude-sonnet-4.5",
  "parameters": { "temperature": 1.0, "maxTokens": 1024, "topP": null },
  "requestId": "gen-abc123",
  "requestedAt": "2026-07-01T12:30:03Z",
  "receivedAt": "2026-07-01T12:30:05Z",
  "latencyMs": 1830,
  "usage": { "promptTokens": 912, "completionTokens": 208, "totalTokens": 1120 },
  "completionIndex": 0
}
```

`completionIndex` disambiguates n>1 sampling (socketteer's `generation.index`).
`parameters` is free-form; recognized keys mirror common sampling params.

**Tier 2 — integrity** (hash chain):

```json
"contentHash": "sha256:9f2b…",
"parentHashes": ["sha256:aa31…"],
"hashAlgorithm": "sha256"
```

`contentHash` covers the node content per the exporting application's
documented scheme; `parentHashes` are the content hashes of the primary-source
parents at creation time. A verifier that knows the scheme can detect
tampering anywhere upstream. Hashes are `"<alg>:<hex>"` strings.

**Tier 3 — evidence** (raw API response):

```json
"rawResponse": {
  "bodyHash": "sha256:c04d…",
  "encoding": "gzip+base64",
  "body": "H4sIAAAA…",
  "headers": { "x-request-id": "…" }
}
```

`bodyHash` MUST be the hash of the **raw response bytes before parsing or
compression**. `body`/`headers` MAY be omitted (hash-only) to keep files small
while still committing to the evidence. Exporters SHOULD offer excluding
Tier 3 entirely — raw responses can embed the full prompt.

Importers MUST preserve `generation` verbatim on re-export even if they cannot
verify it. A relaying application MUST NOT re-sign or re-hash content it did
not generate.

---

## 6. Minimal example

A complete, conforming document — one tree, one branch point:

```json
{
  "format": "open-loom",
  "version": "2.0",
  "trees": [{
    "id": "t1",
    "title": "Hello",
    "rootNodeIds": ["a"],
    "currentNodeId": "c",
    "nodes": {
      "a": { "id": "a", "content": [{ "type": "text", "text": "Once upon a time" }], "author": { "role": "human" } },
      "b": { "id": "b", "content": [{ "type": "text", "text": " there was a fox." }], "author": { "role": "model" } },
      "c": { "id": "c", "content": [{ "type": "text", "text": " there was a loom." }], "author": { "role": "model" } }
    },
    "edges": [
      { "type": "continuation", "sources": [{ "nodeId": "a" }], "targetNodeId": "b" },
      { "type": "continuation", "sources": [{ "nodeId": "a" }], "targetNodeId": "c" }
    ]
  }]
}
```

---

## 7. Extensions

Anything not covered by the core schema goes in an `extensions` object, present
at every level (document, tree, node, edge). Keys MUST be namespaced by
reverse-DNS or product slug, e.g.:

```json
"extensions": {
  "aspen-grove": { "localId": "a7x2" },
  "loomsidian": { "unread": false, "collapsed": true }
}
```

Rules:

- Importers MUST preserve `extensions` they don't understand across re-export.
- Core semantics MUST NOT depend on extension content — a reader ignoring all
  extensions sees a correct tree.
- Per-viewer UI state (collapsed, unread, hoisted, scroll position) MUST NOT
  appear outside `extensions`.

---

## 8. Importing foreign formats

Open Loom is the export target; import should accept **any** loom. Adapters
normalize into the v2 model. Canonical mappings:

### 8.1 Open Loom v1 (Loom Swift prototype)

Detect: object with `nodes`, `bookmarkedNodes`, `rootNodeId`, and no `format`
field. Map: `parentId` → single-source continuation edge (children order from
`childrenIds`); `author` `user|assistant|system` → `human|model|system`;
`modelId` → `generation.model`; `rememberedChildId`, `currentNodeId` →
`currentNodeId`; `isBookmarked`/`bookmarkTitle` → `meta`. Ignore the redundant
`bookmarkedNodes` map. Dates are Swift reference-date seconds (seconds since
2001-01-01T00:00:00Z) when numeric.

### 8.2 socketteer/loom (original Python loom)

Detect: object with nested `root` node carrying `text`/`children`. Also accept
a bare node or bare node array (its loader's leniency, mirrored). Map: nested
`children` → continuation edges in array order; `meta.source`
`AI|prompt|mixed` → `model|human|mixed`; `meta.creation_timestamp` →
`createdAt`; `generation.id`+`index` → resolve into tree-level
`model_responses` for Tier 1/3 provenance; `tags` (incl. `bookmark`) →
`meta.bookmarked`/`meta.tags`; `chapters`/`summaries`/`canonical` →
`extensions["socketteer-loom"]`; `selected_node_id` → `currentNodeId`.

### 8.3 Loomsidian (cosmicoptima/loom for Obsidian)

Detect: `NoteState` shape — object with `nodes` map whose values carry
`parentId` + `unread`, plus `current`. Map: `parentId` → continuation edges
(sibling order undefined in source; preserve map insertion order);
`bookmarked` → `meta.bookmarked`; no authorship exists → `role: "human"` for
the root, `"model"` otherwise is *wrong* often enough that adapters SHOULD mark
all non-root nodes `"mixed"` unless better information exists; `unread`,
`collapsed`, `lastVisited` → `extensions["loomsidian"]`.

### 8.4 MiniLoom (JD-P/minihf)

Detect: object with `loomTree.nodeStore` or nodes carrying `patch` +
`type: root|user|gen`. Nodes are **diff-match-patch patches against the
parent's rendered text**; adapters MUST materialize each node's full text by
applying the patch chain from the root, storing the result as text content and
the original patch under `extensions["miniloom"].patch`. `type` `user|gen` →
`human|model`; `rating` → `meta.rating`; `summary` → `meta.note`.

### 8.5 General adapter rules

- Never invent provenance: if the source has no generation info, emit none.
- Mint ULIDs for missing/duplicate IDs; keep originals in
  `extensions["<source>"].originalId`.
- Timestamps you can't parse → omit, don't guess.
- Anything you parsed but can't map → the source-named extension namespace.

---

## 9. Security & privacy considerations

- Importers MUST treat all content as untrusted text: no code execution, no
  active Markdown/HTML content, size limits on documents and media.
- `data:` URIs and bundle members MUST be validated against declared
  `mimeType`s.
- Exporters SHOULD default to including provenance but make it visible:
  Tier 3 raw responses can contain the entire prompt, and agent
  configurations can contain private system prompts. Both MUST be excludable
  at export time.
- Hash verification failures on import are informational, not fatal — the tree
  still loads, flagged as unverified.

---

## Appendix A — Reserved values

- `author.role`: `human`, `model`, `system`, `mixed`
- `edge.type`: `continuation`, `annotation`
- `source.role`: `primary`, `context`, `instruction`
- `tree.mode`: `dialogue`, `buffer`
- `hashAlgorithm`: `sha256`
- `rawResponse.encoding`: `identity`, `gzip+base64`

Unknown values in any of these positions MUST be preserved on re-export.
