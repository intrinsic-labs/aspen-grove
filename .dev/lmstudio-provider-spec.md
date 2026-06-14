# LM Studio Provider Implementation Spec

## Overview

Add LM Studio as a provider to Aspen Grove, enabling local model inference with MCP (Model Context Protocol) tool support. LM Studio handles MCP execution server-side — Aspen Grove just sends requests.

## LM Studio API Summary

| Endpoint | Purpose | MCP Support |
|----------|---------|-------------|
| `POST /api/v1/chat` | Native chat API | ✅ Yes |
| `GET /api/v1/models` | List all models | - |
| `POST /api/v1/models/load` | Load model to memory | - |
| `POST /api/v1/models/unload` | Unload model | - |
| `POST /v1/chat/completions` | OpenAI-compatible | ❌ No |

**Key insight:** `/api/v1/chat` automatically uses MCPs already configured in LM Studio. No client-side MCP execution needed.

## Implementation Tasks

### 1. LMStudioAdapter

Create `src/infrastructure/llm/lmstudio-adapter.ts` implementing `LLMProvider` interface.

**Endpoints to support:**
- `generateCompletion` → `POST /api/v1/chat`
- `generateStreamingCompletion` → `POST /api/v1/chat` with `stream: true`
- `getCapabilities` → Query `/api/v1/models`

**Request format:**
```typescript
{
  model: string,           // e.g., "qwen2.5-7b-instruct"
  input: string,           // User message (simple) OR
  messages?: Message[],    // Full conversation
  temperature?: number,
  max_tokens?: number,
  stream?: boolean
}
```

**Response includes:** `stats.tokens_per_second`, `stats.time_to_first_token`, tool call info if MCP used.

### 2. LocalModel Entity Update

Extend `LocalModel` to support LM Studio-specific config:

```typescript
interface LMStudioConfig {
  endpoint: string;        // e.g., "http://192.168.1.100:1234"
  apiToken?: string;       // Optional auth
  useMcpTools: boolean;    // Enable server-side MCP
  autoLoad: boolean;       // JIT load models
  idleTtlSeconds?: number; // Auto-unload timer
}
```

Model reference format: `lmstudio:{model-key}` (e.g., `lmstudio:qwen2.5-7b-instruct`)

### 3. Model Discovery

Query available models via `GET /api/v1/models`. Response:
```json
{
  "data": [{
    "id": "qwen2.5-7b-instruct",
    "type": "llm",
    "state": "loaded" | "not-loaded",
    "max_context_length": 32768
  }]
}
```

### 4. Provenance

Capture raw response including:
- Full response body
- Tool call data (if MCP used)
- `stats` object for timing/token info

## Architecture Flow

```
Aspen Grove App
    ↓ HTTP request
LM Studio Server (user's desktop)
    ↓ routes to
Local LLM + MCP Servers (filesystem, web search, etc.)
    ↓ response
Aspen Grove App
```

User configures MCPs in LM Studio app. Aspen Grove just benefits from them.

## Configuration UI Fields

- Server address (required)
- API token (optional)
- Enable MCP tools (checkbox)
- Auto-load models (checkbox)
- Idle timeout (minutes)

## Testing Notes

Start LM Studio server: `lms server start --port 1234`

Test basic request:
```bash
curl http://localhost:1234/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen2.5-7b-instruct", "input": "Hello"}'
```

## Reference Docs

- LM Studio API: https://lmstudio.ai/docs/api
- MCP via API mentioned in their feature comparison table
- Supports OpenAI/Anthropic-compatible endpoints too, but native `/api/v1/chat` is preferred for MCP
