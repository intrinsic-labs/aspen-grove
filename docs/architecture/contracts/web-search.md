# Web Search Service Contract

> Abstract interface for web search capabilities. Enables models to access real-time information from the web.

**Status**: Approved 
**Related**: [LLM Provider](./llm-provider.md), [Loom Tools](../specs/loom-tools/README.md)

---

## Overview

The web search service provides a consistent interface for web search across the application. It's designed to:

- Work independently of LLM provider (not tied to any provider's plugin system)
- Support both loom-aware tools (`→ search`) and provider-level tool calling
- Return AI-optimized content suitable for injection into model context
- Allow users to bring their own API keys

---

## WebSearchService Interface

### Configuration

**initialize**
- Input: credentials (API key from secure storage), provider (optional, defaults to Tavily)
- Validates credentials
- Returns: boolean success

**getProvider**
- Returns: current search provider identifier

---

## Search Operation

### search

Performs a web search and returns structured results.

**Input: SearchRequest**
- **query** — string, the search query (required)
- **options** — optional object:
  - **maxResults** — number, how many results to return (default: 5, max: 10)
  - **searchDepth** — enum: `basic` | `deep` (default: `basic`)
  - **includeDomains** — optional array of strings, domains to prefer
  - **excludeDomains** — optional array of strings, domains to exclude
  - **topic** — optional enum: `general` | `news` (default: `general`)
  - **includeContent** — boolean, whether to extract page content (default: true)

**Output: SearchResponse**
- **results** — array of SearchResult objects
- **query** — string, the original query
- **responseTimeMs** — number, search latency in milliseconds

### SearchResult

- **title** — string, page title
- **url** — string, page URL
- **snippet** — string, brief excerpt (typically 1-2 sentences)
- **content** — optional string, extracted page content (if `includeContent` was true)
- **publishedDate** — optional string, publication date if available
- **score** — optional number, relevance score (0-1)

---

## Search Depth

| Depth | Behavior | Use Case | Credit Cost |
|-------|----------|----------|-------------|
| `basic` | Fast search, snippets + limited content | Quick lookups, fact checking | 1 credit |
| `deep` | Thorough search, full content extraction | Research, comprehensive analysis | 2 credits |

---

## Error Handling

### WebSearchError

- **code** — enum identifying the error type
- **message** — human-readable description
- **retryable** — boolean, whether retry might succeed
- **retryAfterMs** — optional number, suggested delay before retry

### Error Codes

- **authenticationFailed** — invalid or missing API key
- **rateLimited** — too many requests, use retryAfterMs
- **quotaExceeded** — monthly credit limit reached
- **invalidQuery** — query is empty or malformed
- **serviceUnavailable** — search provider is down
- **timeout** — request took too long
- **unknown** — unexpected error

### Retry Strategy

- authenticationFailed: do not retry, prompt user to check API key
- rateLimited: retry after retryAfterMs
- quotaExceeded: do not retry, notify user
- serviceUnavailable: retry with exponential backoff (max 3 attempts)
- timeout: retry once with longer timeout

---

## Provider Adapters

### TavilyAdapter (Primary)

- Endpoint: `https://api.tavily.com/search`
- Authentication: API key in request body
- Features: AI-optimized content extraction, topic filtering, domain filtering
- Pricing: 1,000 free credits/month, then $0.008/credit

**Request mapping:**
```json
{
  "api_key": "<key>",
  "query": "<query>",
  "search_depth": "basic" | "advanced",
  "include_domains": [],
  "exclude_domains": [],
  "max_results": 5,
  "include_answer": false,
  "include_raw_content": false
}
```

### BraveSearchAdapter (Fallback)

- Endpoint: `https://api.search.brave.com/res/v1/web/search`
- Authentication: `X-Subscription-Token` header
- Features: Privacy-focused, good general results
- Pricing: 2,000 free queries/month, then usage-based

**Notes:**
- Brave returns traditional search results (title, URL, snippet)
- Content extraction requires separate fetch + parse
- Use as fallback if Tavily unavailable or user prefers

### Future Adapters

- **SerpAPI** — for Google results (higher cost)
- **Bing Search API** — Microsoft ecosystem integration

---

## Integration Patterns

### As Loom Tool (Collaborator)

Loom-aware collaborators can search via the `→ search` syntax:

```
→ search "Marie character archetype literary analysis"
→ search "climate change latest research 2025" topic:news
→ search "react native performance" include:reactnative.dev,expo.dev
```

**Tool Definition:**
```
→ search "[query]"
→ search "[query]" depth:[basic|deep]
→ search "[query]" topic:[general|news]
→ search "[query]" max:[n]
→ search "[query]" include:[domains] exclude:[domains]
```

**Return Format:**
```
Search: "Marie character archetype literary analysis"
5 results (234ms)

[1] "Character Archetypes in Modern Fiction" — literarydevices.net
    "The reluctant hero archetype often manifests as characters who..."
    
[2] "Understanding Marie as a Literary Figure" — jstor.org
    "Marie represents the classic 'threshold guardian' archetype..."

[3] ...

Use → search "query" depth:deep for full content extraction.
```

### As Provider Tool (Subject Model)

For subject models that support tool use, register web search as a provider tool:

```json
{
  "name": "web_search",
  "description": "Search the web for current information. Use for facts, recent events, or research.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query"
      },
      "max_results": {
        "type": "number",
        "description": "Number of results (1-10, default 5)"
      }
    },
    "required": ["query"]
  }
}
```

This uses the provider's native tool system (per [llm-provider.md](./llm-provider.md#tool-use)).

---

## Context Injection

When search results are used in model context:

### Compact Format (Default)

For context efficiency, results are summarized:

```
[Web Search: "query"]
1. Title — domain.com: Snippet text...
2. Title — domain.com: Snippet text...
...
```

### Full Format (Deep Search)

When `includeContent` is true and content is extracted:

```
[Web Search: "query"]

## Result 1: Title
Source: https://domain.com/path
Published: 2025-01-15

Extracted content here, typically 500-1000 words of relevant 
text from the page...

---

## Result 2: Title
...
```

### Token Budgeting

- Compact format: ~50-100 tokens per result
- Full format: ~200-500 tokens per result
- Default max 5 results keeps search context manageable
- Consider auto-summarizing if results exceed token threshold

---

## User Configuration

### Required

- **API Key** — User must provide their own key for their chosen provider
- Stored in secure storage (Keychain/Keystore), same pattern as LLM credentials

### Optional Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `defaultProvider` | `tavily` | Which search provider to use |
| `defaultMaxResults` | 5 | Default number of results |
| `defaultSearchDepth` | `basic` | Default search depth |
| `fallbackProvider` | `brave` | Provider to use if primary fails |

---

## Credential Management

Search provider credentials follow the same pattern as LLM providers:

```
Search credentials:
  tavily → Keychain["tavily_api_key"]
  brave → Keychain["brave_search_api_key"]
```

User adds credentials via Settings, same flow as adding LLM provider keys.

---

## Testing Support

### MockWebSearchService

For unit and integration testing:

- Configurable responses (return specific results for specific queries)
- Simulate errors (rate limits, auth failures, etc.)
- Record requests for assertion
- No actual API calls in automated tests

---

## Related Documentation

- [LLM Provider](./llm-provider.md) — Provider tool use integration
- [Loom Tools](../specs/loom-tools/README.md) — `→ search` tool syntax
- [Loom Tools Reference](../specs/loom-tools/tool-reference.md) — Tool definitions