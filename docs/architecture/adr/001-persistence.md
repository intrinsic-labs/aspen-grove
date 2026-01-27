# ADR-001: Persistence with WatermelonDB

**Status**: Accepted  
**Date**: 2025-01-15  
**Context**: Choosing a local-first database for React Native

---

## Decision

Use **WatermelonDB** as the persistence layer for Aspen Grove.

---

## Context

Aspen Grove requires a local-first database that can:

- Run on iOS and Android via React Native
- Handle complex relational data (Loom Trees are graphs with many relationships)
- Support lazy loading for large trees without loading everything into memory
- Provide reactive/observable queries for UI updates
- Enable future sync capabilities for multi-device support

---

## Options Considered

### WatermelonDB
- Built specifically for React Native
- SQLite under the hood (proven, fast)
- Lazy loading via relations
- Observable queries integrate well with React
- Sync primitives built in for future cloud sync
- Active maintenance

### Realm (MongoDB Atlas Device SDK)
- More powerful query language
- Heavier runtime footprint
- Being transitioned to Atlas Device SDK (uncertainty)
- More complex setup

### Raw SQLite (via expo-sqlite or react-native-sqlite-storage)
- Maximum control
- No ORM or reactive layer — would need to build ourselves
- More boilerplate for common operations

### MMKV
- Extremely fast key-value storage
- Too simple for relational tree data
- No query capabilities

---

## Rationale

WatermelonDB hits the sweet spot:

- **React Native native** — no fighting the framework
- **Lazy by default** — critical for large Loom Trees with hundreds of nodes
- **Observable** — UI stays in sync without manual refresh logic
- **Sync-ready** — when we add cloud backup, the primitives are there
- **SQLite foundation** — battle-tested, debuggable, well-understood

The main tradeoff is that WatermelonDB has its own patterns and requires schema definition upfront. This is acceptable given the clear domain model we've defined.

---

## Consequences

### Positive
- Lazy loading prevents memory pressure from large trees
- Reactive queries simplify UI state management
- Future sync implementation has a clear path
- SQLite means data is inspectable and portable

### Negative
- Schema changes require migrations
- Learning curve for WatermelonDB-specific patterns
- Some boilerplate for model definitions

### Risks
- WatermelonDB maintenance could slow (mitigated: it's open source and SQLite-based, so we could fork or migrate if needed)

---

## References

- [WatermelonDB Documentation](https://watermelondb.dev/)
- [WatermelonDB GitHub](https://github.com/Nozbe/WatermelonDB)