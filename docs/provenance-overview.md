# Aspen Grove — Provenance & Verification

> How Aspen Grove makes model output tamper-evident and keeps the evidence behind it.

---

## The Core Challenge

Without API providers cryptographically signing their responses, true *proof* of origin is impossible. You control the client — any response passes through your code before storage. HTTPS proves you talked to the real API endpoint, but that proof is ephemeral.

Aspen Grove can't solve that, but it can make tampering detectable and keep comprehensive evidence. It does this with two layers, both on by default and both implemented.

---

## Hash Chains

Each Node stores a **content hash**. The inputs differ by node type:

**Human-authored nodes:**
- The node's content
- The hashes of all parent nodes (via incoming edges)
- The creation timestamp
- The author agent ID

**Model-generated nodes:**
- The node's content
- The hashes of all parent nodes (via incoming edges)
- The creation timestamp
- The author agent ID
- SHA-256 of the raw API response bytes, computed on receipt, before any parsing

This creates a hash chain similar to git. Any modification to any node in the chain is detectable — the hashes won't validate. This proves **integrity** (nothing was altered after creation), even though it can't prove **origin**.

For model-generated nodes, tying the hash to the raw response means tampering with the stored evidence invalidates the node's hash. Every new model node is verified as it is created, and the node detail sheet re-verifies any model node on demand.

---

## Raw API Response Storage

The unmodified API response is stored for every model-generated node:
- Full response body and HTTP headers (request IDs, rate-limit state)
- Request and response timing, latency
- Token usage and provider request ID

Raw responses are:
- **Compressed** (gzip) to minimize storage impact
- **Stored separately** from the node content (not on the hot path)
- **Linked by Node ID** for on-demand access
- **Retained for the lifetime of the node**

This is evidence, not proof — but it's comprehensive evidence that would be difficult to fabricate consistently.

---

## Summary

| Layer | What It Proves | Latency Impact |
|-------|----------------|----------------|
| Hash Chains | Integrity (no tampering after creation) | None |
| Raw API Storage | Comprehensive evidence of what the provider returned | None |

Trusted timestamps (RFC 3161), TLS Notary and other provenance extras are out of scope. Proof of origin would need providers to sign their responses, which none do today.

---

## What This Means in Practice

**For casual users**: You get integrity guarantees automatically. If someone tampers with your conversation history, you'll know.

**For researchers**: Exported Open Loom files carry the hash chain and raw-response evidence, so someone else can re-verify a tree in their own tools. It is an evidentiary trail, not cryptographic proof.

---

## Related Documentation

- [Architecture: Provenance Entities](./architecture/model/provenance.md) — RawApiResponse and hash chain computation (authoritative source)
- [Architecture: Core Entities](./architecture/model/core-entities.md) — Node entity definition with contentHash field
- [Provenance Repositories](./architecture/contracts/repositories/provenance-repositories.md) — Persistence operations for provenance data
- [Domain Language: Context & Memory](./domain-language/context-memory.md#raw-api-response) — Conceptual overview
- [Open Loom spec](./open-loom/spec.md) — How provenance travels in exported files
