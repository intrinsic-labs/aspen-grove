# Aspen Grove — Agent Guide

How to work in this repository. Read this first; follow the doc map when you need detail.

## What Aspen Grove is

An open-source mobile **loom** for getting to know language models. You branch a conversation, draw several continuations, set them side by side, edit and carry on, and start to see how the model thinks. It is not a chat client, not a productivity tool and not a coding harness.

It is for people curious about what models are like: the loom and cyborgism crowd, researchers, and newcomers who want their first real look.

Standing decisions:

- **Local-first, bring your own keys, open source.** Nothing depends on an Intrinsic Labs server.
- **Models come through OpenRouter, plus LM Studio for local models.** No native Anthropic or OpenAI adapters.
- **A loom, not a harness:** no connectors, no web search, no MCP passthrough.
- **Latent Spaces is the reference for look and behavior, not for its data model.** Latent Spaces is the SwiftUI prototype (`loom-swift`).
- **Clean architecture** (Domain, Application, Infrastructure, Interface).
- **Ship a narrow v1 against a written definition of done.** Scope arguments lose to it.

## Scope

### v1

The Beta 1 loop, which is built:

- Dialogue trees with branching: regenerate from any node to grow siblings; inline continuation rail to browse them; switch paths
- Edit-as-branch: editing a node creates a new human node with `editedFrom`, as a sibling
- Bookmarks (with a browse sheet), prune/restore, tags with tree-list filters, search across trees
- Provenance as it stands: hash chains plus stored raw responses, verified on every model turn and shown in the node detail sheet
- Open Loom import and export (plus Markdown export of the active path)
- Per-tree agents (shared library agents or tree-owned copies), streaming, auto titles
- Latent Spaces' character voices (Lily, Jefferson, Eve): Voice Mode reads model responses aloud on device (`expo-speech`), double-tap to listen, tap to stop

Still to build for v1:

- **Several continuations at once, compared side by side.** Today each generate makes one continuation.
- **Latent Spaces' UI and UX brought over exactly.**

The Beta 1 milestones and v1 list live in [.dev/BUILD-PLAN.md](./.dev/BUILD-PLAN.md).

### After v1, in order

1. **LoomDisplay**: the model draws ASCII animation frames; the first `→` model-ergonomic tool. The `→` tools spec is kept in [docs/architecture/specs/loom-tools/](./docs/architecture/specs/loom-tools/README.md); LoomDisplay itself has no spec yet.
2. **Buffer mode with base models**: spec kept in [buffer-mode.md](./docs/architecture/specs/buffer-mode.md).
3. **Backrooms**: models talking to each other on one tree, the human observing. Sketched in [future use cases](./docs/use-cases/future-use-cases.md).

### Cut

Do not build or re-document these: sync, sharing and publishing; the Field Guide; the memory/stash system; the documents editor (and cross-tree Links); RFC 3161 timestamps, TLS Notary and other provenance extras; hosted-inference revenue; native provider adapters; provider tools, connectors, web search or MCP.

One leftover stays on purpose: the extra values in the `Provider` type (`hyperbolic`, `anthropic`, `openai`, `google`, `local`, `custom`). Stored data can carry them (agent `modelRef`s are parsed against that list, `raw_api_responses.provider`, secure-store key names), so dropping them could break an existing install. Don't build on them. Older installs may also hold a `useMcpTools` key in `user_preferences.lmstudio_settings`; it is ignored and dropped on the next save.

## Stack

Expo SDK 54, React Native 0.81, expo-router, TypeScript, WatermelonDB (SQLite, JSI), Jest. Native modules mean a development build (`expo run:ios` / `expo run:android`), not Expo Go. The UI is dark-only for now. Credentials live in `expo-secure-store`.

## Where code lives

```
src/
├── domain/               pure TypeScript: entities/ (LoomTree, Node, Edge, Path, Agent,
│                         Grove, Tag, RawApiResponse, UserPreferences, Content, ...),
│                         value-objects/ (ULID, LocalId, ModelRef, ContentHash)
├── application/
│   ├── use-cases/        one class per use case (SendDialogueTurn, GenerateDialogueContinuation,
│   │                     EditDialogueNode, SwitchDialoguePath, Import/ExportLoomTree, ...)
│   ├── repositories/     interfaces: core/, organization/, supporting/
│   └── services/         context/ (assembly, truncation), llm/ (ILlmProvider, registry,
│                         retry), open-loom/ (format, import adapters, export), provenance/,
│                         security/ (ICredentialStore), content hashing
├── infrastructure/
│   ├── persistence/watermelon/  schema, migrations, models, Watermelon*Repository
│   ├── llm/              OpenRouterAdapter, LMStudioAdapter, OpenRouterModelCatalog,
│   │                     ProviderRegistry
│   ├── security/         ExpoSecureCredentialStore
│   ├── bootstrap/        startup orchestration, first-launch defaults
│   └── logging/          __DEV__-gated dev log
├── interface/
│   ├── composition/      AppServicesProvider: the composition root that wires
│   │                     repositories, providers and use cases
│   ├── components/       screens and feature components (chat/, settings/, drawer/, home/)
│   ├── hooks/, services/ (file share/pick), ui/ (tokens, primitives)
└── app/                  expo-router routes; thin files that render interface components
```

Implemented repositories: Agent, Edge, Grove, LoomTree, Node, Path, PathState, RawApiResponse, Tag, UserPreferences. Providers: OpenRouter and LM Studio only.

Imports use the aliases `@domain/*`, `@application/*`, `@infrastructure/*`, `@interface/*` and `@/*` (tsconfig).

Every route, screen and feature is mapped in [FEATURE_MAP.md](./FEATURE_MAP.md).

## Architecture and layer rules

Dependencies point inward. `eslint-plugin-boundaries` (see `eslint.config.mjs`) enforces it and `npm run lint` fails on a violation:

| Layer | May import |
|-------|-----------|
| `src/domain` | domain only |
| `src/application` | domain, application |
| `src/infrastructure` | domain, application, infrastructure |
| `src/interface` and `src/app` | all layers |

- Application defines interfaces (repositories, `ILlmProvider`, `ICredentialStore`); infrastructure implements them; `AppServicesProvider` injects them. Use cases never import infrastructure.
- Domain has no framework dependencies: no React, no WatermelonDB, no Expo.
- Keep files short and single-purpose. A new concern gets its own file in the layer it belongs to; route files in `src/app/` stay thin.

See [ADR-003](./docs/architecture/adr/003-layer-boundaries.md).

## Invariants

Break one of these and the loom stops being trustworthy.

- **Nodes are immutable.** Content never changes after creation; only metadata (bookmarked, pruned, excluded) does.
- **Edits create nodes.** An edit makes a new human-authored node with `editedFrom` set to the original, attached as a sibling (a branch) in dialogue mode.
- **Raw response bytes are hashed before parsing.** Adapters compute SHA-256 of the raw bytes on receipt (`rawBytesHash`); the model node's content hash chains its content, parent hashes, `createdAt`, author agent ID and that raw hash. Every model node gets a stored, gzipped `RawApiResponse` and is verified on creation (`createVerifiedModelContinuationNode`).
- **Routing is per agent.** There is no global active provider. Each request resolves its adapter from the agent's `modelRef` (`openrouter:{id}` or `lmstudio:{id}`); a dialogue tree points at its model agent through `LoomTree.defaultModelAgentId`.
- **Streamed deltas never hit the database.** Deltas update UI state only; the node is persisted once, on completion or interruption.
- **Branches are not entities.** A branch point is just a node with several continuation edges; paths are computed.
- **IDs are ULIDs;** `localId` is a short tree-unique prefix used in context.

## Checks

Run before you commit:

```
npm run typecheck   # tsc, no emit
npm run lint        # eslint, including layer boundaries
npm test            # jest
npm run check:map   # FEATURE_MAP.md matches the routes and screens
```

How to run the app and verify a change on a device or simulator: [VERIFY.md](./VERIFY.md).

**Map rule:** when you add, remove or change a route, screen or feature, update its entry in [FEATURE_MAP.md](./FEATURE_MAP.md) in the same change, then run `npm run check:map`.

Don't commit secrets, API keys or local `.env` files. Keys are the user's own and live in secure storage only.

## Doc map

| Need | Read |
|------|------|
| Run and verify the app | [VERIFY.md](./VERIFY.md) |
| Routes, screens, features | [FEATURE_MAP.md](./FEATURE_MAP.md) |
| Build and ship to TestFlight | [docs/shipping.md](./docs/shipping.md) |
| Milestones, v1, after v1 | [.dev/BUILD-PLAN.md](./.dev/BUILD-PLAN.md) |
| Per-tree agents (design history) | [.dev/agent-centric-dialogue-settings.md](./.dev/agent-centric-dialogue-settings.md) |
| Terminology | [docs/domain-language/](./docs/domain-language/README.md) |
| How people use it | [docs/use-cases/](./docs/use-cases/README.md) |
| Architecture index | [docs/architecture/README.md](./docs/architecture/README.md) |
| Decisions | [docs/architecture/adr/](./docs/architecture/adr/) (WatermelonDB, multimodal storage, layers) |
| Entities | [docs/architecture/model/](./docs/architecture/model/) (core entities, agents, organization, provenance) |
| Contracts | [repositories](./docs/architecture/contracts/repositories/README.md), [LLM provider](./docs/architecture/contracts/llm-provider.md), [media storage](./docs/architecture/contracts/media-storage.md) |
| Context assembly | [docs/architecture/specs/context-assembly.md](./docs/architecture/specs/context-assembly.md) |
| Dialogue UI and settings | [dialogue-ui-branching-and-streaming.md](./docs/architecture/specs/dialogue-ui-branching-and-streaming.md), [dialogue-settings-ui.md](./docs/architecture/specs/dialogue-settings-ui.md) |
| Latent Spaces UI transfer | [loom-swift-prototype-ui-transfer-audit.md](./docs/architecture/specs/loom-swift-prototype-ui-transfer-audit.md), [loom-ui-rebuild-implementation-plan.md](./docs/architecture/specs/loom-ui-rebuild-implementation-plan.md) |
| Provenance | [docs/provenance-overview.md](./docs/provenance-overview.md), [model/provenance.md](./docs/architecture/model/provenance.md) |
| Open Loom file format | [docs/open-loom/spec.md](./docs/open-loom/spec.md) |
| After v1 | [loom-tools/](./docs/architecture/specs/loom-tools/README.md), [buffer-mode.md](./docs/architecture/specs/buffer-mode.md), [future use cases](./docs/use-cases/future-use-cases.md) |
| React Native primer (pre-implementation, general) | [.dev/rn-guide-for-n00bs.md](./.dev/rn-guide-for-n00bs.md) |

Where a doc and `src/` disagree, the code is ground truth for what is implemented; fix the doc. On scope, the decisions at the top of this file win over any older doc.
