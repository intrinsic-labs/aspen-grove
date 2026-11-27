# mock-llm-server

A deterministic stand-in for LM Studio, Anthropic Messages and OpenAI Responses,
so adapters can be checked without a model or a real key:

| Endpoint | Used by |
|----------|---------|
| `GET /v1/models` | Anthropic (`x-api-key`) and OpenAI model discovery |
| `POST /v1/messages` | Anthropic plain JSON or named SSE events |
| `POST /v1/responses` | OpenAI plain JSON or Responses SSE events |
| `GET /api/v1/models` | Connections' "Test connection" and the agent editor's model list |
| `POST /v1/chat/completions` with `"stream": true` (SSE) | send, regenerate, parallel continuations |
| `POST /v1/chat/completions` with `"stream": false` | auto titles, and the fallback after a streaming `invalidRequest` |
| `POST /v1/completions` (JSON or `"stream": true` SSE) | the base-model text route: OpenRouter's legacy route and LM Studio's, for buffer mode |

**The base model.** `GET /api/v1/models` also lists `mock-base`, shown as "Writing fixture
(base)", loaded, after `mock-model` (the app's LM Studio list orders loaded models by display
name, so the first loaded model, and onboarding's default, stays `mock-model`). It answers
only `POST /v1/completions`, which accepts a string `prompt` and that model; a body with
`messages`, a non-string `prompt` or any model but `mock-base` is refused (400, 400, 404), and
a chat request for `mock-base` gets 404. It is not in `GET /v1/models`, so it never appears
under the Anthropic or OpenAI pickers. Replies are `choices[].text`, deterministic, always
beginning with a space (`continuationTokens`, `reply-text.ts`), different for each request
number (parallel slots), and capped by `max_tokens` (finish reason `length`). SSE sends one
event per token, a finish event with empty text, a usage-only event when
`stream_options.include_usage` is set, then `[DONE]`. Request numbering, pacing,
`--fail-every`, `--fail-in-burst`, `--fail-mode` and `--drop-after` are shared with the chat
routes (one count: a chat request and a text request are #1 and #2). To point OpenRouter's
adapter at it, set the OpenRouter endpoint to `http://localhost:1235/v1/chat/completions`;
the adapter derives `/v1/completions` beside it.

Anything else answers 404 and is logged as "not mocked" (the adapter's
`/api/v1/models/load` and `/unload` have no caller in the app).

Needs Node 22.18 or newer (runs the `.ts` files directly; no dependencies).

## Run

```sh
node scripts/mock-llm-server/cli.ts --port 1235              # 60 tokens at 20/s
node scripts/mock-llm-server/cli.ts --port 1235 --slow       # 3 tokens/s: time to tap stop
node scripts/mock-llm-server/cli.ts --port 1235 --fail-every 4 --fail-status 422
node scripts/mock-llm-server/cli.ts --port 1235 --fail-every 3 --fail-mode drop
node scripts/mock-llm-server/cli.ts --port 1235 --fail-in-burst 2 --fail-status 422  # one parallel card fails
```

For direct-adapter tests, initialize with any non-empty test key and override the full
completion endpoint to `http://localhost:1235/v1/messages` or `/v1/responses`.
Discovery uses `/v1/models` on the same origin. Use `--model gpt-4.1` for OpenAI:
the default `mock-model` is deliberately outside its text-model family filter.
These endpoints use the same pacing,
token caps (`max_tokens` or `max_output_tokens`), failure injection, titles and independent
parallel requests as the chat mock. Keys are not validated by this local fixture.

**Direct providers in the app.** Give each provider its own server (each lists and answers
for one `--model`) and start Metro, or build a development build, with the full completion
URL in `EXPO_PUBLIC_ANTHROPIC_ENDPOINT` / `EXPO_PUBLIC_OPENAI_ENDPOINT`; release builds refuse
them. Then add any non-empty key in Settings → Connections:

```sh
node scripts/mock-llm-server/cli.ts --port 1236 --model claude-sonnet-mock   # Anthropic
node scripts/mock-llm-server/cli.ts --port 1237 --model gpt-4.1              # OpenAI
EXPO_PUBLIC_ANTHROPIC_ENDPOINT=http://localhost:1236/v1/messages \
EXPO_PUBLIC_OPENAI_ENDPOINT=http://localhost:1237/v1/responses \
  npx expo start --dev-client --port 8081
```

`.maestro/mock/direct-providers.yaml` drives this end to end. On an Android emulator, `adb
reverse` each port as VERIFY.md section 9 shows.

Then in the app: Settings → Connections → LM Studio endpoint
`http://localhost:1235` → Test connection, and create an agent on the LM Studio
model `mock-model`. Port 1234 is LM Studio's own default; keep clear of it.

| Option | Default | Effect |
|--------|---------|--------|
| `--port`, `--host` | `1235`, `127.0.0.1` | where it listens |
| `--pace` | `20` | streamed tokens per second |
| `--slow` | off | pace 3 tokens/s |
| `--words` | `60` | tokens per reply (a request's `max_tokens` caps it; finish reason `length`) |
| `--model` | `mock-model` | the model it lists and answers for; any other id gets 404 |
| `--base-model` | `mock-base` | the base model `POST /v1/completions` answers for |
| `--missing-model` | `mock-missing` | listed as downloaded but not loaded; every completion on it answers 404 (LM Studio with JIT loading off) |
| `--fail-every N` | `0` (never) | completion requests N, 2N, 3N... fail |
| `--fail-in-burst N` | `0` (never) | in each burst of overlapping completion requests (one set of parallel cards), the Nth to arrive fails if it is streamed; a burst starts when a request arrives with none open, so single sends (always first) never fail with N ≥ 2. Positions are counted on arrival, so they follow the order the app opened the requests: with 3 cards and N = 2, the second card fails |
| `--fail-mode` | `status` | `status`: answer `--fail-status`; `drop`: cut the connection after `--drop-after` tokens |
| `--fail-status` | `500` | HTTP status of an injected failure |
| `--drop-after` | `8` | tokens sent before a dropped stream is cut |
| `--quiet` | off | no per-request log lines |

Replies are deterministic: "Mock reply #<request number>." then words seeded by
the request number and the last message, so parallel cards differ but a rerun
in the same order repeats them.

Auto-Title's call (non-streaming, with the "You title conversations." system
prompt or a user message opening "Title this conversation.";
`title-request.ts`) is answered with a title instead: "Mock title #<request
number>". It counts as a request, so `--fail-every` can fail it too.

Two things about failures, both from the app's retry policy
(`src/application/services/llm/retry.ts`):

- A 5xx is retryable, so the app retries it (twice, before any text arrives)
  as new requests that usually succeed. To see a card or row fail outright,
  use a non-retryable status: `--fail-status 422`.
- A drop after some text is not retried: the partial text is saved with a
  `[stream interrupted: ...]` line. `--drop-after 0` drops before any text,
  which the app retries like a network error.

Each request logs a start and an end line with the number of requests open at
that moment (`active=N`), and a streamed one its place in the current burst
(`burst=N`), which shows whether parallel streams overlap: three cards that
really run at once log `burst=1`, `burst=2`, `burst=3`; three sent one after
another would each log `burst=1`. A `--fail-in-burst` failure can only happen
when streams overlap. A
text completion's start line shows its route, the prompt's byte length (never the prompt),
`max_tokens` and `active=N`. A chat
completion's start line also shows the `max_tokens`, `temperature` and system
message it was sent with, so a tree's Model Settings can be checked end to
end.

## Test

```sh
npm test -- --no-watchman scripts/mock-llm-server
```
