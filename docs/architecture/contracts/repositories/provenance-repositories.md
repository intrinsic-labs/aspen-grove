# Provenance Repositories

> Manages persistence for RawApiResponse and TimestampCertificate — the provenance evidence structures.

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

## TimestampCertificateRepository

Manages RFC 3161 timestamp certificates for provenance verification.

### Operations

#### create

Creates a new TimestampCertificate record.

**Input:**
- `nodeId` — ULID, reference to the Node this timestamp certifies
- `contentHash` — string, the hash that was timestamped (should match Node.contentHash)
- `timestampAuthority` — string, URL of the timestamp authority used
- `certificate` — string, base64-encoded timestamp certificate
- `timestamp` — timestamp, the certified time from the authority

**Behavior:**
- Generates id and timestamp
- Sets `verified` to false initially
- Certificate is obtained asynchronously after Node creation

**Returns:** Created TimestampCertificate

---

#### findByNode

Retrieves the TimestampCertificate for a Node.

**Input:**
- `nodeId` — ULID

**Returns:** TimestampCertificate or null

---

#### findPending

Finds Nodes awaiting timestamp certificates.

**Behavior:**
- Returns Nodes that have no associated TimestampCertificate yet
- Used by background job to retry failed timestamp requests

**Returns:** Array of Nodes

---

#### findUnverified

Finds TimestampCertificates that haven't been verified locally.

**Behavior:**
- Returns certificates where `verified` = false
- Used by background verification job

**Returns:** Array of TimestampCertificates

---

#### markVerified

Marks a certificate as locally verified.

**Input:**
- `id` — ULID

**Behavior:**
- Sets `verified` = true
- Sets `verifiedAt` = current timestamp

**Returns:** Updated TimestampCertificate

---

#### delete

Removes a TimestampCertificate record.

**Input:**
- `id` — ULID

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
- TimestampCertificate: retained for lifetime of Node
- Both deleted when Node is hard-deleted

### Estimates

- 1000 model-generated Nodes ≈ 5-15MB provenance data
- Consider optional pruning for very old, verified Nodes (keep hash, remove raw response)

---

## Verification Workflow

### Timestamp Certificate Flow

1. Node created → contentHash computed
2. Background job submits hash to timestamp authority
3. Certificate received → `create()` called
4. Background job calls `findUnverified()`
5. Verification performed on each certificate
6. `markVerified()` called on success

### Hash Verification Flow

1. User requests verification
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