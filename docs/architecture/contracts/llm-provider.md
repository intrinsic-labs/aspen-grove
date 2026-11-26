# LLM Provider Service Contracts Specification

> Abstract interfaces for LLM API interactions. Infrastructure layer implements these contracts for each provider.

---

## Overview

The LLM provider abstraction enables:

- Uniform interface across **OpenRouter**, **LM Studio**, **Anthropic Messages** and **OpenAI Responses**
- Provider choice stays an adapter detail; application logic never changes per provider
- Testability with mock implementations
- Provider-specific features exposed through capability detection

---

## ProviderRegistry

The `ProviderRegistry` holds a collection of `LLMProvider` adapters and resolves which adapter should handle a given request.

### Routing Principle

There is **no "active provider"** — the registry does not hold any global state about which provider is currently selected. Every request carries an `Agent` with it, and that Agent's `modelRef` (formatted `{provider}:{identifier}`) is what determines the provider. This is consistent with the Agent-centric architecture: provider/model choice belongs to the Agent, not to the app.

### Operations

- **getProvider(name)** — Look up an adapter by provider name. Used when callers already know the provider (rarely needed outside infrastructure).
- **getProviderForAgent(agent)** — Resolve the adapter responsible for a given Agent's model. The primary request-path entry point. Throws if the agent is not a model agent, has no `modelRef`, or its provider is not registered.
- **getProviderForModelRef(modelRef)** — Same as above but accepts the raw `ModelRef` string. Useful when the full Agent object isn't available.
- **getAvailableProviders()** — Enumerate providers that the registry can route to.

### Implementation Notes

- Each request initializes the resolved adapter with the provider's credentials (fetched from secure storage per-provider) before issuing the completion call. The registry itself does not hold credentials.
- Provider-specific operations (model catalog discovery, server health checks) are exposed via adapter-specific escape hatches (e.g., `getOpenRouterAdapter`, `getLMStudioAdapter`) and are not part of the `IProviderRegistry` contract.

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

**Output: CompletionResponse**
- **content** — string, the generated text
- **finishReason** — enum: `stop` | `length` | `toolUse` | `error` (`toolUse` only mirrors a provider's `tool_calls` finish reason; Aspen Grove never sends tools)
- **usage** — TokenUsage object (prompt, completion, total tokens)
- **rawResponse** — the complete HTTP response for provenance storage

### generateStreamingCompletion

Streaming completion that yields tokens as they're generated.

**Input: CompletionRequest** (same as above)

**Output: AsyncIterator of StreamChunk**

Each StreamChunk contains:
- **type** — enum: `text` | `done` | `error`
- **content** — string, the token(s) for text chunks
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

Aspen Grove passes **no provider tools**: no web search, code execution, connectors or MCP. A loom, not a harness.

`CompletionRequest` has no tools field, and adapters neither send tool definitions nor parse tool calls.

Loom-aware tools (view, continue, annotate, etc., after v1) are **not** provider tools. They use the custom `→` syntax parsed client-side, which avoids provider tool system prompts that conflict with the natural-language approach. See [Loom Tools Spec](../specs/loom-tools/README.md).

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
- **cancelled** — the user stopped the request (never retry)
- **unknown** — unexpected error

### Retry Strategy

- authenticationFailed: do not retry, prompt user
- rateLimited: retry after retryAfterMs
- serverError: retry with exponential backoff (max 3 attempts)
- networkError: retry with exponential backoff
- timeout: retry once with longer timeout
- Others: do not retry automatically

---

## Provider Adapters

Four adapters implement the interface (`src/infrastructure/llm/`). Settings → Connections has a key section per hosted provider (save, test, replace, remove), and the Provider and model pickers list Anthropic and OpenAI once a key is stored. `RoutableProvider` enumerates backend adapters and `SelectableProvider` the pickable providers; today they are the same four. `KeyedProvider` is the hosted three (OpenRouter, Anthropic, OpenAI).

### OpenRouterAdapter

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Authentication: Bearer token (`Authorization: Bearer <key>`), the user's own key
- Models: aggregates models from many providers (Claude, GPT, Llama, Gemini, etc.)
- Optional headers: `HTTP-Referer` (app URL), `X-Title` (app name) for attribution

### AnthropicAdapter

- Endpoint: `https://api.anthropic.com/v1/messages`; authentication: `x-api-key`.
  Workspace-scoped keys need no extra header. Other keys require `workspaceId` in
  initialize options, sent as `anthropic-workspace-id` and preserved across request-time
  reinitialization with the same key. Changing the key clears that workspace selection.
- Uses the API version declared in `anthropic/request.ts`. The current version removes
  sampling parameters, so `temperature` is omitted. `max_tokens` is required; the adapter
  supplies a default when the agent has no limit. Agent limits must be positive integers.
- The agent prompt and all system nodes are combined, in order, into top-level `system`;
  Messages accepts only user and assistant roles. System nodes therefore apply to the
  whole request, rather than retaining their position in history. For an assistant-ending
  path (or one with only system nodes), the adapter appends a request-only user cue to
  continue, because current Claude models reject assistant prefill. No extra node is saved.
- Text deltas come from `content_block_delta`; cumulative usage comes from `message_start`
  and `message_delta`. `message_stop` is terminal. Pings, thinking and unknown event types
  are retained in raw capture but do not become visible text. Output/context limits map
  to `length`; end-turn and stop-sequence reasons map to `stop`.

### OpenAIAdapter

- Endpoint: `https://api.openai.com/v1/responses`; authentication: bearer API key.
- Responses is [OpenAI's recommended streaming API](https://developers.openai.com/api/docs/guides/streaming-responses).
  Requests send full branch history as `input`, the agent prompt as `instructions`,
  `max_output_tokens` when configured, and `store: false`. No server conversation or
  previous-response ID is used.
- Text/refusal deltas stream as text; completed and incomplete response events supply
  final usage. An output-token limit maps to `length`; failed responses and error events
  use the normal error path. Truncated streams cannot appear complete.
- Responses has no stop-sequence parameter: a non-empty list is rejected locally with
  a plain `invalidRequest` message. Sampling is sent only for the older GPT-4 text
  families known to accept it; reasoning families use provider defaults.

Both direct adapters support text only; image input is rejected explicitly. Each request
owns its abort controller, so parallel continuations remain one independent request per
slot. Stop after text yields the partial capture with `interruptedReason: cancelled`;
Stop before text throws `cancelled`. Timeouts distinguish first-byte and idle waits,
including activity from pings. All paths reuse `LlmProviderError` and the existing plain
error copy, with Anthropic and OpenAI labels.

Keys reuse `ICredentialStore` and `ExpoSecureCredentialStore` entries `anthropic_api_key`
and `openai_api_key`. Request-time key lookup requires secure storage for these providers;
there is no build-environment fallback for them. Provider IDs are `anthropic` and `openai`.

### LMStudioAdapter

- Endpoint: user-configured LM Studio server reachable from the phone (local network IP, Tailscale, etc.), default port 1234
- Completions use the OpenAI-compatible `/v1/chat/completions`: the native `/api/v1/chat` chains history statefully, which doesn't fit branching trees
- Model discovery, load and unload use LM Studio's `/api/v1/models` endpoints
- Authentication: optional API token from secure storage

---

## Provenance Integration

The LLM provider layer is critical for provenance because it's the only place we have access to the raw HTTP response bytes before any parsing or transformation. See [Provenance Entities](../model/provenance.md) for the full provenance strategy.

### Raw Response Capture

Every completion uses the same fetch-level capture convention as OpenRouter: headers exposed by fetch are sorted and serialized as `name: value` lines, followed by a blank line and the unmodified UTF-8 response body. This is a canonical application capture, not the original HTTP wire framing. It includes:

- Full response body (raw bytes, not parsed JSON)
- Response headers exposed by fetch (especially request IDs, timestamps, rate limit state)
- Request timing (latency in milliseconds)
- Model identifier from response (may differ from request)

**Critical**: The capture is hashed for model-node provenance. Non-streaming bodies are hashed before JSON parsing; streaming bodies are accumulated before event parsing and hashed when the stream ends or is interrupted, before creating a model node.

### Capture Flow

1. Receive HTTP response from provider
2. Compute SHA-256 of the canonical headers + body capture (after accumulating a stream)
3. Store raw bytes (will be compressed later by repository)
4. Return the parsed text and capture together for domain-node creation
5. Return both parsed response AND raw bytes + hash to caller

### Capture Points

- **Non-streaming**: Capture complete response bytes before parsing
- **Streaming**: Accumulate all chunks, capture final assembled response bytes after stream completes
- **Errors**: Read the error body for classification; without generated text, throw an error and persist no model node. After streamed text, return the partial capture with an interruption reason.

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

## Model Catalogs

Models are fetched, not persisted, so users get new models without app updates.

- **OpenRouter** — `OpenRouterModelCatalog` fetches the public `GET /api/v1/models` catalog and caches it for 24 hours in WatermelonDB local storage, serving the stale copy if a refresh fails
- **LM Studio** — models are discovered live from the server
- **Anthropic / OpenAI** — initialize the registry's concrete adapter with the stored key,
  then call `fetchModels()` (`GET /v1/models`); `getCachedModels()` reads its in-memory
  result. Anthropic follows `after_id` pagination and normalizes names, dates and token
  limits. OpenAI's list lacks capability metadata: a conservative family filter retains
  Responses text models and removes audio, image, embedding, moderation, search and
  Chat Completions-only variants, plus o1-pro/o3-pro which do not stream. New unknown families can still be addressed by ID.
  Both return the existing `OpenRouterCatalogModel` shape with native IDs and text
  modalities; absent prices or limits remain unknown. Changing the key or endpoint clears
  the cache. The model browser and the key sections' "Test Key" call these methods: a key is tested by `initialize` then `fetchModels()`. A development build can replace an adapter's completion URL (and so its catalog origin) with `EXPO_PUBLIC_ANTHROPIC_ENDPOINT` or `EXPO_PUBLIC_OPENAI_ENDPOINT`, applied when the adapter is constructed; release builds refuse the variables.
- Users can always type a model identifier by hand

The agent editor's and a tree's model pickers (`useModelPickerData`) read all four.

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
## Direct API references

Checked against official documentation for this implementation:

- Anthropic: [Messages](https://platform.claude.com/docs/en/api/messages/create),
  [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming),
  [models](https://platform.claude.com/docs/en/api/models/list),
  [errors](https://platform.claude.com/docs/en/api/errors),
  [API versioning](https://platform.claude.com/docs/en/api/versioning),
  [version migration](https://platform.claude.com/docs/en/api/migration-2026-10-21),
  [authentication](https://platform.claude.com/docs/en/manage-claude/authentication).
- OpenAI: [Responses](https://developers.openai.com/api/reference/resources/responses/methods/create),
  [streaming guidance](https://developers.openai.com/api/docs/guides/streaming-responses),
  [events](https://developers.openai.com/api/reference/resources/responses/streaming-events),
  [models](https://developers.openai.com/api/reference/resources/models/methods/list),
  [errors](https://developers.openai.com/api/docs/guides/error-codes),
  [current model parameter limits](https://developers.openai.com/api/docs/guides/latest-model),
  [o1-pro](https://developers.openai.com/api/docs/models/o1-pro),
  [o3-pro](https://developers.openai.com/api/docs/models/o3-pro).
