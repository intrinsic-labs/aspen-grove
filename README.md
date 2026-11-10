# Aspen Grove

_A watered idea blooms_

A mobile loom for getting to know language models.

---

## What is this?

Aspen Grove treats a conversation with a model as a tree you can explore, not a thread you scroll. You branch a conversation, draw several continuations, set them side by side, edit and carry on, and start to see how the model thinks.

There's more going on with language models than most people realize. A chat app shows you one answer; a loom shows you the space of answers the model could have given, and lets you walk around in it. It's closer to getting to know a person than to using a productivity tool.

Aspen Grove is not a chat client and not a coding harness. It's for people curious about what models are like: the loom and cyborgism crowd, researchers, and newcomers who want a first real look.

---

## Features

Built today:

- **Branching dialogue**: regenerate from any node to grow alternatives, browse them inline under the node, and switch paths
- **Edit as a branch**: editing a message makes a new branch; the original stays
- **Bookmarks, pruning and tags**, plus search across all your trees
- **Per-tree agents**: each conversation has its own model, temperature and system prompt, from a shared library or customized for that tree
- **Streaming**, automatic conversation titles
- **Provenance**: every model response is stored raw and hash-chained to its parents, so tampering is detectable; the node detail sheet re-verifies it on demand
- **Open Loom import and export**: export a whole tree as [Open Loom](./docs/open-loom/spec.md) JSON or the current path as Markdown; import Open Loom (v1 and v2), socketteer/loom and Loomsidian files

- **Parallel continuations**: draw several at once and compare them side by side in the rail
- **Character voices** (Jefferson, Lily, Eve) that read responses aloud

Coming in v1:

- The look and feel of Latent Spaces, the SwiftUI loom this app grew from

After v1: LoomDisplay (the model draws ASCII animations), buffer mode with base models, and backrooms where models talk to each other.

---

## Your keys, your device

Aspen Grove is local-first. Your trees live on your phone, and there's no Aspen Grove server or account.

Bring your own models:

- **[OpenRouter](https://openrouter.ai/)** with your own API key, for hosted models from many providers
- **[LM Studio](https://lmstudio.ai/)** running on a computer your phone can reach, for local models

Keys are stored in the platform's secure storage (Keychain / Keystore) and sent only to the provider you chose.

---

## Running it

Aspen Grove is an Expo / React Native app that needs a development build (WatermelonDB is a native module, so Expo Go won't work). See [VERIFY.md](./VERIFY.md) for setup, running on a device or simulator, and the checks to run.

---

## Architecture

The code follows Clean Architecture in four layers under `src/`: **domain** (pure TypeScript entities and value objects), **application** (use cases, repository and provider interfaces, context assembly, Open Loom, provenance), **infrastructure** (WatermelonDB persistence, the OpenRouter and LM Studio adapters, secure storage) and **interface** (React Native components, wired together in one composition root; routes live in `src/app/` via expo-router). Dependencies point inward only, and ESLint enforces it. Nodes are immutable and every model response is hashed before it's parsed.

Contributors and coding agents should start with [AGENTS.md](./AGENTS.md); [FEATURE_MAP.md](./FEATURE_MAP.md) maps every route and screen.

---

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | How to work in the codebase |
| [VERIFY.md](./VERIFY.md) | Run the app and verify changes |
| [FEATURE_MAP.md](./FEATURE_MAP.md) | Routes, screens and features |
| [Shipping](./docs/shipping.md) | EAS build profiles and TestFlight |
| [Open Loom spec](./docs/open-loom/spec.md) | The open file format for loom trees |
| [Domain Language](./docs/domain-language/README.md) | Core concepts and terminology |
| [Use Cases](./docs/use-cases/README.md) | How people use a loom |
| [Provenance Overview](./docs/provenance-overview.md) | Hash chains and raw-response evidence |
| [Architecture](./docs/architecture/README.md) | Technical design and specifications |

---

## License

[Apache 2.0](./LICENSE)
