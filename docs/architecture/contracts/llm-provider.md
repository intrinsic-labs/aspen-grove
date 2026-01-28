# LLM Provider Service Contracts Specification

> Abstract interfaces for LLM API interactions. Infrastructure layer implements these contracts for each provider.

---

## Overview

The LLM provider abstraction enables:

- Uniform interface across providers (OpenRouter, Hyperbolic, Anthropic, OpenAI, Google, local models, user defined providers)
- Easy addition of new providers without changing application logic
- Testability with mock implementations
- Provider-specific features exposed through capability detection

---

## LLMProvider Interface

The core interface that all provider implementations must satisfy.

### Configuration

**initialize**
- Input: credentials (from secure storage), endpoint (optional)
- Validates credentials format
- Prepares client for requests
- Returns: boolean success

**getCapabilities**
- Returns: ProviderCapabilities object describing what this provider supports

### ProviderCapabilities Properties

These are **provider-level** capabilities that apply to the API itself, not individual models. For model-specific capabilities (image/audio support, context limits, etc.), see [Model Capabilities](../model/agents.md#modelcapabilities-properties).

- **supportsStreaming** — boolean, API can stream response tokens
- **supportsSystemPrompt** — boolean, API has dedicated system prompt field (vs. injecting into messages)
- **supportedModels** — array of model identifiers available through this provider

---

## Completion Operations

### generateCompletion

Standard (non-streaming) completion request.

**Input: CompletionRequest**
- **messages** — array of Message objects (the conversation)
- **model** — string, model identifier
- **systemPrompt** — optional string, system instructions
- **temperature** — optional number (0.0-2.0)
- **maxTokens** — optional number, limit response length
- **stopSequences** — optional array of strings
- **tools** — optional array of ToolDefinition (for tool use)

**Output: CompletionResponse**
- **content** — string, the generated text
- **finishReason** — enum: `stop` | `length` | `toolUse` | `error`
- **usage** — TokenUsage object (prompt, completion, total tokens)
- **toolCalls** — optional array of ToolCall (if model invoked tools)
- **rawResponse** — the complete HTTP response for provenance storage

### generateStreamingCompletion

Streaming completion that yields tokens as they're generated.

**Input: CompletionRequest** (same as above)

**Output: AsyncIterator of StreamChunk**

Each StreamChunk contains:
- **type** — enum: `text` | `toolCallStart` | `toolCallDelta` | `toolCallEnd` | `done` | `error`
- **content** — string, the token(s) for text chunks
- **toolCall** — partial ToolCall for tool-related chunks
- **usage** — TokenUsage (present in final `done` chunk)
- **rawResponse** — complete response (present in final `done` chunk)

---

## Message Format

### Message Object

- **role** — enum: `user` | `assistant` | `system`
- **content** — MessageContent (string or array of content blocks)

### Content Block Types

**TextBlock**
- **type** — literal `text`
- **text** — string

**ImageBlock**
- **type** — literal `image`
- **source** — ImageSource object

**ImageSource**
- **type** — enum: `base64` | `url`
- **mediaType** — string (e.g., `image/png`, `image/jpeg`)
- **data** — string (base64 data or URL depending on type)

### Message Construction Notes

- Simple text messages use string content directly
- Multimodal messages use array of content blocks
- System messages may be handled differently by each provider
- Provider adapter normalizes to provider-specific format

---

## Tool Use

### ToolDefinition

- **name** — string, unique identifier for the tool
- **description** — string, explains what the tool does (for model)
- **inputSchema** — JSON Schema object describing expected parameters

### ToolCall

- **id** — string, unique identifier for this invocation
- **name** — string, which tool to call
- **arguments** — object, the parsed arguments

### ToolResult

- **toolCallId** — string, references the ToolCall.id
- **content** — string, the result to feed back to the model

### Tool Use Flow

1. Include tools in CompletionRequest
2. Model may respond with toolCalls instead of/alongside text
3. Application executes tools, gathers results
4. Send follow-up request with ToolResults
5. Model generates final response

---

## Error Handling

### LlmProviderError

Base error type for all provider errors.

- **code** — enum identifying the error type
- **message** — human-readable description
- **provider** — which provider threw the error
- **retryable** — boolean, whether retry might succeed
- **retryAfterMs** — optional number, suggested delay before retry

### Error Codes

- **authenticationFailed** — invalid or expired credentials
- **rateLimited** — too many requests, use retryAfterMs
- **contextTooLong** — input exceeds context window
- **modelNotFound** — requested model doesn't exist
- **invalidRequest** — malformed request parameters
- **serverError** — provider's servers had an error
- **networkError** — connection failed
- **timeout** — request took too long
- **contentFiltered** — response blocked by safety filters
- **unknown** — unexpected error

### Retry Strategy

- authenticationFailed: do not retry, prompt user
- rateLimited: retry after retryAfterMs
- serverError: retry with exponential backoff (max 3 attempts)
- networkError: retry with exponential backoff
- timeout: retry once with longer timeout
- Others: do not retry automatically

---

## Provider-Specific Adapters

Each provider needs an adapter implementing the LlmProvider interface.

### OpenRouterAdapter

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Authentication: Bearer token (`Authorization: Bearer <key>`)
- Models: aggregates models from multiple providers (Claude, GPT, Llama, Gemini, etc.)
- Specific features: OpenAI-compatible API, model routing/fallback, usage-based pricing, plugins (web search, PDF parsing)
- Optional headers: `HTTP-Referer` (app URL), `X-Title` (app name) for attribution

### HyperbolicAdapter

- Endpoint: `https://api.hyperbolic.xyz/v1/chat/completions`
- Authentication: Bearer token (`Authorization: Bearer <key>`)
- Models: Llama 3.1 70B/405B, Qwen, DeepSeek, and other open models
- Specific features: OpenAI-compatible API, also supports image generation and audio/TTS endpoints

### AnthropicAdapter

- Endpoint: `https://api.anthropic.com/v1/messages`
- Authentication: `x-api-key` header + `anthropic-version` header (e.g., `2023-06-01`)
- Models: claude-sonnet-4-20250514, claude-3-5-haiku, etc.
- Specific features: native system prompt field, strong tool use, message batches API

### OpenAiAdapter

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Authentication: Bearer token (`Authorization: Bearer <key>`)
- Models: gpt-4o, gpt-4-turbo, o1, o3, etc.
- Specific features: function calling, JSON mode, structured outputs, streaming

### GoogleAdapter

- Endpoint: Vertex AI (`https://[region]-aiplatform.googleapis.com`) or AI Studio (`https://generativelanguage.googleapis.com`)
- Authentication: OAuth 2.0 (Vertex AI) or API key (AI Studio)
- Models: gemini-1.5-pro, gemini-1.5-flash, gemini-ultra, etc.
- Specific features: multi-turn conversation format differences, grounding with Google Search

### LocalAdapter

- Endpoint: user-configured — must be network-accessible from mobile device
  - Local network IP: `http://192.168.1.100:1234/v1` (LM Studio default port)
  - Dynamic DNS: `http://my-home-server.duckdns.org:11434/v1` (Ollama)
  - Tailscale/ZeroTier: `http://100.x.x.x:8080/v1` (private mesh network)
- Authentication: none or basic auth (configurable)
- Models: whatever the local server provides (LM Studio, Ollama, llama.cpp, etc.)
- Specific features: typically OpenAI-compatible, may not support all capabilities

### CustomAdapter

- Endpoint: user-configured
- Authentication: user-configured (Bearer, API key, or none)
- For self-hosted or alternative providers
- Capability detection via introspection or manual configuration

---

## Provenance Integration

The LLM provider layer is critical for provenance because it's the only place we have access to the raw HTTP response bytes before any parsing or transformation. See [Provenance Entities](../model/provenance.md) for the full provenance strategy.

### Raw Response Capture

Every completion request must capture the **raw HTTP response bytes** exactly as received from the wire:

- Full response body (raw bytes, not parsed JSON)
- Response headers as raw text (especially request IDs, timestamps, rate limit state)
- Request timing (latency in milliseconds)
- Model identifier from response (may differ from request)

**Critical**: The raw bytes are used to compute a SHA-256 hash for model-generated Node provenance. This hash must be computed *before* any parsing, transformation, or domain object creation. The hash ties the Node's integrity to the actual provider response.

### Capture Flow

1. Receive HTTP response from provider
2. Immediately compute SHA-256 hash of raw bytes (headers + body as single blob)
3. Store raw bytes (will be compressed later by repository)
4. Parse response into domain objects
5. Return both parsed response AND raw bytes + hash to caller

### Capture Points

- **Non-streaming**: Capture complete response bytes before parsing
- **Streaming**: Accumulate all chunks, capture final assembled response bytes after stream completes
- **Errors**: Capture error response body (still valuable evidence)

### RawResponseCapture Object

Returned alongside CompletionResponse:

- **rawBytes** — the complete HTTP response (headers + body) as raw bytes
- **rawBytesHash** — SHA-256 hash of rawBytes, hex-encoded
- **requestTimestamp** — when the request was sent
- **responseTimestamp** — when the response was fully received
- **latencyMs** — response time in milliseconds

### Storage Handoff

- Provider returns `rawResponse` (RawResponseCapture) alongside CompletionResponse
- Calling use case passes to RawApiResponseRepository for storage
- Repository compresses and persists; hash is used in Node.contentHash computation
- Provider doesn't handle storage directly (separation of concerns)

---

## Usage Tracking

### TokenUsage Object

- **promptTokens** — number, tokens in the input
- **completionTokens** — number, tokens in the output  
- **totalTokens** — number, sum of above

### Tracking Notes

- Some providers return usage in response; use that
- Some providers only return usage for non-streaming; estimate for streaming
- Track cumulative usage for cost estimation (future feature)
- Usage is informational, not enforced (provider does enforcement)

---

## ModelCatalogService

Fetches and caches available models from remote providers. Local/custom models are persisted separately — see [LocalModelRepository](./repositories.md#localmodelrepository).

### Design Rationale

Models change frequently in the current landscape. Rather than persist a stale catalog, we fetch dynamically from providers:

- Users get access to new models immediately without app updates
- Pricing, context windows, and capabilities stay current
- Reduces maintenance burden

### Operations

**getAvailableModels**
- Input: provider
- Returns cached models if fresh, otherwise fetches from provider
- Returns: array of CatalogModel objects

**refreshCatalog**
- Input: provider (optional — refreshes all if omitted)
- Forces fresh fetch from provider(s), updates cache
- Returns: array of CatalogModel objects

**getModelInfo**
- Input: provider, modelIdentifier
- Returns: CatalogModel or null

**getCacheStatus**
- Input: provider (optional)
- Returns: cache age, staleness indicator per provider

### CatalogModel Properties

- **identifier** — string, the model ID used in API requests (e.g., "claude-sonnet-4-20250514")
- **provider** — enum: provider this model is available through
- **displayName** — string, human-readable name from provider
- **description** — optional string, provider's description
- **contextWindow** — number, max tokens
- **capabilities** — ModelCapabilities object (see [agents.md](../model/agents.md#modelcapabilities-properties))
- **pricing** — optional PricingInfo object (input/output per million tokens)

### Caching Strategy

- **TTL**: 24 hours default, configurable
- **Storage**: in-memory + lightweight file cache for offline fallback
- **Refresh triggers**: app launch, manual refresh, TTL expiration
- **Offline behavior**: serve stale cache with indicator, don't block app usage

### Provider-Specific Notes

| Provider | Catalog Endpoint | Notes |
|----------|------------------|-------|
| OpenRouter | `GET /api/v1/models` | Comprehensive, includes pricing |
| Anthropic | Hardcoded list | No public catalog API; update with SDK releases |
| OpenAI | `GET /v1/models` | Returns all models, filter to chat-capable |
| Google | Hardcoded list | Vertex AI model garden requires auth |
| Hyperbolic | `GET /v1/models` | OpenAI-compatible endpoint |
| Local/Custom | N/A | User-defined, see LocalModelRepository |

*Note: Some providers don't expose a catalog API. For these, we maintain a hardcoded list updated with app releases, supplemented by user's ability to manually specify model identifiers.*

---

## Testing Support

### MockLlmProvider

For unit and integration testing:

- Configurable responses (return specific text for specific inputs)
- Simulate errors (rate limits, auth failures, etc.)
- Simulate streaming with controllable delays
- Record requests for assertion

### Test Patterns

- Deterministic responses for use case testing
- Error injection for error handling testing
- Latency simulation for timeout testing
- No actual API calls in automated tests