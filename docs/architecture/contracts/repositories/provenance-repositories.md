# Provenance Repositories

> Manages persistence for RawApiResponse — the provenance evidence structure. (RFC 3161 timestamp certificates are out of scope; an unused `ITimestampCertificateRepository` interface remains in code.)

---

## RawApiResponseRepository

Manages storage of complete API responses for model-generated Nodes.

### Operations

#### create

Creates a new RawApiResponse record.

**Input:**
- `nodeId` — ULID, reference to the Node this response generated
- `provider` — enum: `openrouter` | `hyperbolic` | `anthropic` | `openai` | `google` | `local` | `custom`
- `requestId` — optional string, provider's request identifier from headers
- `modelIdentifier` — string, the model name returned by the API
- `responseBody` — string, complete JSON response body
- `responseHeaders` — string, JSON object of HTTP headers
- `requestTimestamp` — timestamp, when the request was sent
- `responseTimestamp` — timestamp, when the response was received
- `latencyMs` — number, response time in milliseconds
- `tokenUsage` — optional TokenUsage object:
  - `promptTokens` — number
  - `completionTokens` — number
  - `totalTokens` — number

**Behavior:**
- Generates id and timestamp
- Compresses `responseBody` and `responseHeaders` (gzip)
- Sets `compressionType` to `gzip`

**Returns:** Created RawApiResponse

---

#### findByNode

Retrieves the RawApiResponse for a Node.

**Input:**
- `nodeId` — ULID

**Behavior:**
- Decompresses `responseBody` and `responseHeaders` on retrieval

**Returns:** RawApiResponse or null

---

#### delete

Removes a RawApiResponse record.

**Input:**
- `id` — ULID

**Returns:** Boolean success

---

#### deleteByNode

Removes the RawApiResponse for a specific Node.

**Input:**
- `nodeId` — ULID

**Behavior:**
- Useful when deleting a Node and its associated provenance

**Returns:** Boolean success

---

## Storage Considerations

### Compression

RawApiResponse data is compressed to minimize storage impact:

- `responseBody` — gzip compressed
- `responseHeaders` — gzip compressed
- `compressionType` field indicates compression method

Expected size: 2-10KB compressed per response.

### Retention

- RawApiResponse: retained for lifetime of Node
- Deleted when Node is hard-deleted

### Estimates

- 1000 model-generated Nodes ≈ 2-10MB provenance data
- Consider optional pruning for very old, verified Nodes (keep hash, remove raw response)

---

## Verification Workflow

### Hash Verification Flow

1. A new model node is created, or the user opens a node's detail sheet
2. Repository retrieves Node and RawApiResponse
3. Hash verification service recomputes hash:
   - For human nodes: content + parent hashes + createdAt + authorAgentId
   - For model nodes: content + parent hashes + createdAt + authorAgentId + SHA-256(raw response bytes)
4. Compares computed hash to stored Node.contentHash
5. Returns verification result

---

## Related Documentation

- [Provenance Model](../../model/provenance.md) — Entity definitions and hash computation
- [Provenance Overview](../../../provenance-overview.md) — High-level provenance strategy
- [Node Repository](./node-repository.md) — Node persistence and hash verification