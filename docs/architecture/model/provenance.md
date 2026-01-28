# Provenance Entities Model Specification

> Specification for RawApiResponse, TimestampCertificate, and hash chain computation — the provenance and verification structures of Aspen Grove.

---

## Overview

Provenance entities provide evidence of Node authenticity without guaranteeing proof. These structures support the tiered verification strategy described in the [provenance Overview](../../provenance-overview.md).

*Note: the model proposed here does not provide origin proof. This is an area of active research and Aspen Grove aims to implement origin proof in the future. Read more in the [provenance overview.](../../provenance-overview.md)*

This document is the **authoritative source** for hash chain computation and verification algorithms.

---

## RawApiResponse

Complete, unmodified API response stored for model-generated Nodes.

### Properties

- **id** — ULID, primary identifier
- **nodeId** — ULID, reference to the Node this response generated
- **provider** — enum: `openrouter` | `hyperbolic` | `anthropic` | `openai` | `google` | `local` | `custom`
- **requestId** — optional string, provider's request identifier from headers
- **modelIdentifier** — string, the model name returned by the API
- **responseBody** — string, complete JSON response body (compressed)
- **responseHeaders** — string, JSON object of HTTP headers (compressed)
- **requestTimestamp** — timestamp, when the request was sent
- **responseTimestamp** — timestamp, when the response was received
- **latencyMs** — number, response time in milliseconds
- **tokenUsage** — optional TokenUsage object
- **compressionType** — enum: `none` | `gzip`
- **createdAt** — timestamp

### TokenUsage Properties

- **promptTokens** — number, tokens in the input
- **completionTokens** — number, tokens in the output
- **totalTokens** — number, sum of prompt and completion

### Constraints

- One RawApiResponse per model-generated Node
- Human-authored Nodes do not have RawApiResponse records
- Response body and headers are stored compressed to minimize storage
- Never modify after creation — these are evidence records

### Indexes

- Primary: id
- By nodeId (for lookup from Node — unique)
- By provider + requestTimestamp (for debugging/research)

### Storage Notes

- responseBody and responseHeaders use gzip compression
- Decompression happens on-demand when viewing provenance
- Expected size: 2-10KB compressed per response
- Consider archival strategy for very old responses

---

## TimestampCertificate

RFC 3161 timestamp authority certificate proving a hash existed at a specific time.

### Properties

- **id** — ULID, primary identifier
- **nodeId** — ULID, reference to the Node this timestamp certifies
- **contentHash** — string, the hash that was timestamped (should match Node.contentHash)
- **timestampAuthority** — string, URL of the timestamp authority used
- **certificate** — string, base64-encoded timestamp certificate
- **timestamp** — timestamp, the certified time from the authority
- **verified** — boolean, whether the certificate has been verified locally
- **verifiedAt** — optional timestamp, when verification was performed
- **createdAt** — timestamp

### Constraints

- One TimestampCertificate per Node (optional — depends on network availability)
- contentHash must match the Node's contentHash at time of creation
- Certificates are obtained asynchronously after Node creation
- Failed timestamp attempts should be logged but not block Node creation

### Indexes

- Primary: id
- By nodeId (for lookup from Node — unique)
- By verified = false (for retry queue)
- By timestampAuthority (for authority-specific queries)

### Verification Process

1. Extract timestamp and hash from certificate
2. Verify certificate signature against authority's public key
3. Confirm hash matches Node.contentHash
4. Set verified = true and verifiedAt = now

---

## Provenance View

Not a stored entity — a computed view combining provenance data for display.

### Components

- Node.contentHash and hash chain validity
- TimestampCertificate status (present, verified, timestamp)
- RawApiResponse availability and summary
- Parent chain verification status

### Display Information

- **Hash Chain Status** — valid | invalid | unverified
- **Timestamp Status** — certified | pending | unavailable
- **Certified Time** — timestamp from authority (if available)
- **API Evidence** — available | unavailable
- **Provider Request ID** — for cross-referencing with provider logs

---

## Hash Chain Computation

The contentHash on each Node provides tamper evidence. The computation differs for human-authored vs model-generated nodes to maximize provenance integrity.

### Human-Authored Nodes

Inputs to hash:
1. Serialized content (deterministic JSON serialization)
2. Array of parent node contentHashes (via incoming Continuation edges), sorted
3. createdAt timestamp (ISO 8601)
4. authorAgentId

Human nodes are self-contained — all inputs are stored on the Node itself.

### Model-Generated Nodes

Inputs to hash:
1. Serialized content (deterministic JSON serialization)
2. Array of parent node contentHashes (via incoming Continuation edges), sorted
3. createdAt timestamp (ISO 8601)
4. SHA-256 hash of the raw API response bytes (headers + body as a single blob, pre-compression)

**Important**: The hash is computed over the **raw HTTP response bytes** exactly as received from the wire — not over our parsed `RawApiResponse` domain object. This ensures the hash is tied to the actual provider response, not our representation of it.

Model nodes tie their hash to the full API response evidence. This means:
- Raw response bytes must be hashed *immediately* upon receipt, before any parsing
- The raw bytes are then stored (compressed) in the `RawApiResponse` entity
- Verification requires access to the original raw bytes
- Any tampering with the stored response invalidates the Node hash

### Why Different Approaches?

- **Human nodes** — The Agent abstraction is meaningful; it represents a real person's identity within the app
- **Model nodes** — The Agent abstraction is application-level; provenance should tie to actual API evidence, not our internal configuration

### Algorithm

1. Concatenate inputs with delimiter
2. Compute SHA-256 hash
3. Encode as hex string

### Properties

- Any modification to content or ancestry invalidates the hash
- Root nodes have no parent hashes (empty array)
- Hash verification traverses from root to validate entire chain
- Model node verification requires joining with RawApiResponse data

---

## Hash Chain Verification

Process for verifying the integrity of a Node and its ancestry.

### Single Node Verification

1. Retrieve Node and its incoming Continuation edges
2. Retrieve parent Nodes via edge sources
3. Check `Node.authorType` to determine hash algorithm:
   - `human` → use human-authored algorithm
   - `model` → use model-generated algorithm
4. Recompute expected contentHash:
   - **For human-authored nodes**: content + parent hashes + createdAt + authorAgentId
   - **For model-generated nodes**: content + parent hashes + createdAt + SHA-256(raw response bytes)
5. Compare computed hash to stored Node.contentHash
6. Result: match = valid, mismatch = tampered

*Note: The `authorType` field on Node is denormalized from `Agent.type` for efficient verification. See [Core Entities](./core-entities.md) for the Node schema.*

### Full Path Verification

1. Compute path from root to target Node
2. Verify each Node in sequence, starting from root
3. Root Node has no parent hashes (verified against empty array)
4. Each subsequent Node verified against its verified parents
5. Any failure invalidates the entire path

### Verification Results

- **valid** — all hashes match, chain intact
- **invalid** — one or more hashes don't match
- **incomplete** — missing data prevents full verification

---

## Timestamp Authority Configuration

### Default Authority

- [FreeTSA](https://freetsa.org) — free, reliable, widely recognized
- Fallback authorities can be configured

### Request Process

1. Node created with contentHash computed
2. Background job submits hash to timestamp authority
3. Certificate received and stored
4. Verification performed
5. Status updated on TimestampCertificate

### Failure Handling

- Network failures: retry with exponential backoff
- Authority unavailable: try fallback authority
- Persistent failure: mark as unavailable, Node still valid
- Timestamps are evidence, not requirements — Nodes exist without them

---

## Future: TLS Notary Integration

Not implemented in MVP, but schema should accommodate.

### Planned Entity: TlsNotaryProof

- **id** — ULID
- **nodeId** — ULID
- **proof** — binary, the notarized TLS session proof
- **serverIdentity** — string, verified server hostname
- **sessionTimestamp** — timestamp
- **verified** — boolean

### Integration Notes

- Optional, user-enabled per Loom Tree or session
- Significant latency impact (currently 10-15 seconds per request; may improve over time)
- Provides strongest available proof without provider cooperation
- Store proof as binary blob (not human-readable)

---

## Related Documentation

- [Provenance Overview](../../provenance-overview.md) — High-level explanation of the tiered verification strategy
- [Core Entities](./core-entities.md) — Node entity definition (references this document for hash computation)
- [Agents](./agents.md) — Agent and Model entity definitions

---

## Retention and Cleanup

### Default Retention

- RawApiResponse: retained for lifetime of Node
- TimestampCertificate: retained for lifetime of Node
- Deleted when Node is hard-deleted

### Storage Considerations

- Estimate 5-15KB per model-generated Node (response + certificate)
- 1000 Nodes ≈ 5-15MB provenance data
- Consider optional pruning for old, verified Nodes (keep hash, remove raw response)

### Export Considerations

- Provenance data should be exportable with Node
- Include: contentHash, timestamp certificate, summary of API response
- Exclude: full response body (privacy, size) unless explicitly requested