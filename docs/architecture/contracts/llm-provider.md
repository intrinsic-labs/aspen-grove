# LLM Provider Service Contracts Specification

> Abstract interfaces for LLM API interactions. Infrastructure layer implements these contracts for each provider.

---

## Overview

The LLM provider abstraction enables:

- Uniform interface across providers (Anthropic, OpenAI, Google, local models)
- Easy addition of new providers without changing application logic
- Testability with mock implementations
- Provider-specific features exposed through capability detection

---

## LlmProvider Interface

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

- **supportsStreaming** — boolean, can stream response tokens
- **supportsImages** — boolean, can accept image inputs
- **supportsAudio** — boolean, can accept audio inputs
- **supportsToolUse** — boolean, can use function/tool calling
- **supportsSystemPrompt** — boolean, has dedicated system prompt field
- **maxContextTokens** — number, maximum context window
- **maxOutputTokens** — number, maximum response length
- **supportedModels** — array of model identifiers available

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

### AnthropicAdapter

- Endpoint: https://api.anthropic.com/v1/messages
- Authentication: x-api-key header
- Models: claude-sonnet-4-20250514, claude-3-5-haiku, etc.
- Specific features: native system prompt, strong tool use

### OpenAiAdapter

- Endpoint: https://api.openai.com/v1/chat/completions
- Authentication: Bearer token
- Models: gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.
- Specific features: function calling, JSON mode

### GoogleAdapter

- Endpoint: Vertex AI or AI Studio endpoints
- Authentication: OAuth or API key
- Models: gemini-pro, gemini-ultra, etc.
- Specific features: multi-turn conversation format differences

### LocalAdapter

- Endpoint: configurable (e.g., localhost:8080)
- Authentication: none or basic auth
- Models: whatever the local server provides (llama.cpp, ollama, etc.)
- Specific features: may not support all capabilities

### CustomAdapter

- Endpoint: user-configured
- Authentication: user-configured
- For self-hosted or alternative providers
- Capability detection via introspection or manual configuration

---

## Provenance Integration

### Raw Response Capture

Every completion request must capture the complete HTTP response:

- Full response body (JSON)
- Response headers (especially request IDs, timestamps)
- Request timing (latency)
- Model identifier from response (may differ from request)

### Capture Points

- Non-streaming: capture complete response before parsing
- Streaming: accumulate chunks, capture final assembled response
- Errors: capture error response body

### Storage Handoff

- Provider returns rawResponse in CompletionResponse
- Calling use case passes to RawApiResponseRepository
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