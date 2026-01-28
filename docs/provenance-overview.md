# Aspen Grove — Provenance & Verification

> This document describes Aspen Grove's approach to proving the authenticity and integrity of model-generated content.

---

## The Core Challenge

Without API providers cryptographically signing their responses, true *proof* of origin is impossible. You control the client — any response passes through your code before storage. HTTPS proves you talked to the real API endpoint, but that proof is ephemeral.

We can't solve this problem completely, but we can make fabrication difficult, tampering detectable, and evidence comprehensive.

---

## Verification Tiers

Aspen Grove provides a layered verification strategy. Each tier adds confidence, and they work together to build a comprehensive evidence trail.

### Tier 1: Hash Chains (Default)

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
- SHA-256 hash of the complete RawApiResponse

This creates a hash chain similar to git. Any modification to any node in the chain is detectable — the hashes won't validate. This proves **integrity** (nothing was altered after creation), even though it can't prove **origin**.

For model-generated nodes, tying the hash to the full API response means any tampering with the stored evidence invalidates the node's hash.

---

### Tier 2: Trusted Timestamps (Default)

Upon node creation, we submit the content hash to an **RFC 3161 timestamp authority**. This provides a cryptographic proof that "this hash existed at time T," signed by a trusted third party.

This proves you didn't fabricate the content *after the fact*. Combined with the hash chain and raw API response metadata, it becomes increasingly implausible to fake a response that:
- Has internally consistent timestamps
- Matches a valid RFC 3161 timestamp certificate
- Contains coherent API metadata (request IDs, rate limit headers, model versions)

Free RFC 3161 services (e.g., FreeTSA) make this practical for all users.

---

### Tier 3: Raw API Response Storage (Default)

The complete, unmodified API response is stored for every model-generated node:
- Full response body
- HTTP headers (including request IDs, timestamps, rate limit state)
- Client-side timing information

Raw responses are:
- **Compressed** (gzip) to minimize storage impact
- **Stored separately** from the node content (not on the hot path)
- **Linked by Node ID** for on-demand access
- **Retained for the lifetime of the node**

This is evidence, not proof — but it's comprehensive evidence that would be difficult to fabricate consistently.

---

### Tier 4: TLS Notary (Future)

[TLS Notary](https://tlsnotary.org/) is a protocol that enables cryptographic proof that specific data came from a specific server, without requiring server cooperation. It uses secure multi-party computation during the TLS handshake to create a portable proof of origin.

This is the closest thing to true verification without API provider support.

**Current limitation**: TLS Notary adds significant latency (~10-15 seconds per request depending on network conditions). This is unacceptable for most users but valuable for researchers who need maximum assurance and can tolerate the delay.

**Plan**: Offer TLS Notary as an opt-in "high assurance mode" once the protocol matures and performance improves. Users who need provable provenance can enable it per-Loom Tree or per-session.

---

### Tier 5: Provider Signatures (Aspirational)

The cleanest solution: API providers sign their responses with a private key. Anyone can verify with the public key. This solves the problem completely.

This doesn't exist yet. As Aspen Grove gains traction in the research community, we'll advocate for this feature with major providers.

---

## Summary

| Tier | What It Proves | Default | Latency Impact |
|------|----------------|---------|----------------|
| Hash Chains | Integrity (no tampering after creation) | ✓ | None |
| RFC 3161 Timestamps | Existence at specific time | ✓ | Minimal |
| Raw API Storage | Comprehensive evidence of origin | ✓ | None (async) |
| TLS Notary | Cryptographic proof of origin | Future | +10-15s |
| Provider Signatures | Complete proof | Requires provider support | None |

---

## What This Means in Practice

**For casual users**: You get integrity guarantees automatically. If someone tampers with your conversation history, you'll know.

**For researchers**: You get timestamped, evidence-backed records suitable for publication and peer review. While not cryptographic proof, the combination of hash chains, trusted timestamps, and raw API responses creates a strong evidentiary trail.

**For the future**: As TLS Notary matures and (hopefully) providers add response signing, Aspen Grove's architecture is ready to incorporate true cryptographic proof.

---

## Related Documentation

- [Architecture: Provenance Entities](./architecture/model/provenance.md) — Technical specification for RawApiResponse, TimestampCertificate, and hash chain computation (authoritative source)
- [Architecture: Core Entities](./architecture/model/core-entities.md) — Node entity definition with contentHash field

---

*Provenance is about building trust through transparency. We can't prove everything, but we can make the evidence comprehensive and the tampering detectable.*