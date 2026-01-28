# Repository Contracts

> **This document has been reorganized.** Please see the new structure below.

---

## New Location

The repository contracts documentation has been split into focused documents for better maintainability:

📁 **[docs/architecture/contracts/repositories/](./repositories/README.md)**

| Document | Description |
|----------|-------------|
| [README](./repositories/README.md) | Overview, common patterns, transaction support |
| [Loom Tree Repository](./repositories/loom-tree-repository.md) | LoomTree persistence |
| [Node Repository](./repositories/node-repository.md) | Node persistence and traversal |
| [Edge Repository](./repositories/edge-repository.md) | Edge persistence |
| [Agent Repository](./repositories/agent-repository.md) | Agent persistence |
| [Grove Repository](./repositories/grove-repository.md) | Grove persistence |
| [Document Repository](./repositories/document-repository.md) | Document persistence |
| [Link Repository](./repositories/link-repository.md) | Link persistence |
| [Tag Repository](./repositories/tag-repository.md) | Tag and TagAssignment persistence |
| [Provenance Repositories](./repositories/provenance-repositories.md) | RawApiResponse and TimestampCertificate |
| [User Preferences Repository](./repositories/user-preferences-repository.md) | UserPreferences singleton |
| [Local Model Repository](./repositories/local-model-repository.md) | LocalModel persistence |

---

## Quick Links

- **Looking for common patterns?** → [README](./repositories/README.md#common-patterns)
- **Looking for transaction support?** → [README](./repositories/README.md#transaction-support)
- **Looking for hash verification?** → [Node Repository](./repositories/node-repository.md#verifyhash)
- **Looking for tag operations?** → [Tag Repository](./repositories/tag-repository.md)

---

*This file is kept for backwards compatibility. All content now lives in the `repositories/` directory.*