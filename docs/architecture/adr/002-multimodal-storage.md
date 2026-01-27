# ADR-002: Multimodal Content Storage Strategy

**Status**: Accepted  
**Date**: 2025-01-15  
**Context**: How to store images, audio, and other non-text content in Loom Trees

---

## Decision

Store multimodal content as **references** in Nodes, with actual binary data stored separately in the filesystem or a blob store.

---

## Context

Loom Trees are designed to be multimodal — Nodes can contain text, images, audio, or combinations thereof. We need a strategy that:

- Keeps tree traversal fast (don't load megabytes of images when navigating)
- Works within mobile memory constraints
- Supports lazy loading of heavy content
- Maintains clean separation between tree structure and binary data
- Allows for future content types without schema changes

---

## Approach

### Node Content Structure

A Node's content field uses a discriminated union pattern:

- **type** — identifies the content kind (text, image, audio, mixed)
- **payload** — type-specific data

For non-text content, the payload contains a **reference** (file path or blob ID), not the actual bytes.

### Content Types

**Text**
- Inline markdown-compatible string
- Stored directly in the Node

**Image**
- Reference to file (local path or blob ID)
- Metadata: dimensions, format, thumbnail reference, alt text
- Original stored in filesystem

**Audio**
- Reference to file
- Metadata: duration, format, sample rate, transcript reference
- Original stored in filesystem

**Mixed**
- Ordered array of content blocks
- Each block is one of the above types
- Enables rich multimodal nodes (e.g., image + caption)

### File Storage

Binary files are stored in a dedicated directory structure:

- Organized by Loom Tree ID for easy cleanup on deletion
- Filenames use content hash for deduplication
- Thumbnails/previews generated and stored alongside originals
- Cleanup handled when Nodes are pruned or deleted

---

## Rationale

### Why References, Not Inline Binary?

- **Memory** — Loading a Loom Tree with 50 images inline would consume hundreds of MB
- **Performance** — Tree traversal stays fast; images load on-demand
- **Flexibility** — Can swap storage backends (local → cloud) without changing Node schema
- **Deduplication** — Same image used twice references same file

### Why Not Base64 in JSON?

- 33% size overhead from encoding
- Still loads all content into memory on tree load
- Breaks lazy loading benefits of WatermelonDB

### Why Filesystem Over SQLite BLOBs?

- SQLite BLOBs work but complicate backup/restore
- Filesystem is simpler to debug and inspect
- Platform APIs expect file paths for media playback
- Easier to implement streaming for large files

---

## Consequences

### Positive
- Tree operations remain fast regardless of media content
- Memory footprint stays bounded
- Content types extensible without schema migration
- Media playback can use native platform APIs directly

### Negative
- Two-phase cleanup needed (Node deletion + file cleanup)
- Must handle orphaned files (files without Node references)
- File path management adds complexity

### Implementation Notes

- Generate thumbnails on import for fast preview rendering
- Consider background cleanup job for orphaned files
- File paths should be relative to app data directory for portability
- Content hash enables deduplication across Loom Trees

---

## Future Considerations

- Cloud sync will need to handle binary files separately from database sync
- May want tiered storage (keep recent media local, archive old to cloud)
- Video support would follow same pattern but with more metadata