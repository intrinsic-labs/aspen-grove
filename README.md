# Aspen Grove

_A watered idea blooms_

A mobile application for branching, tree-based interactions with large language models.

---

## What is this?

Aspen Grove is a **Loom** — an LLM interface that treats conversations as explorable trees rather than linear chats. Every response you generate, every path you take, is preserved. You can branch, backtrack, compare alternatives, and build understanding through exploration.

The core data structure is the **Loom Tree**: a hypergraph-backed tree where nodes contain content (text, images, audio) and edges represent relationships between them. Unlike traditional chat interfaces that show one linear thread, Aspen Grove lets you see and navigate the full space of possibilities.

---

## Why?

Most AI interfaces optimize for quick answers. Aspen Grove optimizes for **understanding**.

- **Models are probability spaces, not oracles** — The same prompt can yield wildly different responses. Seeing that distribution builds intuition.
- **Exploration beats optimization** — Sometimes the third branch is where the insight lives.
- **Provenance matters** — For researchers and anyone who needs to demonstrate authenticity, we provide hash chains, timestamps, and raw API response storage.

---

## Key Concepts

| Term                  | Meaning                                              |
| --------------------- | ---------------------------------------------------- |
| **Loom Tree**         | A branching tree of conversation nodes               |
| **Looming / Weaving** | The act of exploring and creating within a Loom Tree |
| **Node**              | A single piece of content (text, image, audio)       |
| **Path**              | One linear route through a tree from root to leaf    |
| **Branch Point**      | Where the tree splits into multiple possibilities    |
| **Agent**             | Any participant — human or model                     |

See [Domain Language](./docs/domain-language/README.md) for complete terminology.

---

## Features (MVP)

- **Dialogue Mode** — Branching conversations with clear turn-taking
- **Buffer Mode** — Freeform collaborative text without message boundaries
- **Voice Mode** — Hands-free interaction via speech
- **Multi-model support** — Compare responses across different LLMs
- **Provenance tracking** — Hash chains and RFC 3161 timestamps for verification
- **Multimodal nodes** — Text, images, and audio in the same tree

---

## Documentation

| Document                                             | Description                            |
| ---------------------------------------------------- | -------------------------------------- |
| [Domain Language](./docs/domain-language/README.md)  | Core concepts and terminology          |
| [Use Cases](./docs/use-cases/README.md)              | How users interact with the app        |
| [Provenance Overview](./docs/provenance-overview.md) | Verification and authenticity strategy |
| [Architecture](./docs/architecture/README.md)        | Technical design and specifications    |
| [Review Findings](./docs/architecture/review-findings.md) | Pre-development issues and resolutions |

---

## Tech Stack

- **React Native** — Cross-platform mobile
- **TypeScript** — Type safety throughout
- **WatermelonDB** — Local-first persistence with lazy loading
- **Clean Architecture** — Domain → Application → Infrastructure → Interface

---

## Project Status

🚧 **Early Development** — Architecture and specifications defined, implementation beginning.

---

## License

Apache 2.0
