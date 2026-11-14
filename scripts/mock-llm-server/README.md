# mock-llm-server

A stand-in for LM Studio so the app can be driven end to end without a model
or a key. It serves only what the app's LM Studio adapter
(`src/infrastructure/llm/LMStudioAdapter.ts`, `lmstudio/*`) calls:

| Endpoint | Used by |
|----------|---------|
| `GET /api/v1/models` | Connections' "Test connection" and the agent editor's model list |
| `POST /v1/chat/completions` with `"stream": true` (SSE) | send, regenerate, parallel continuations |
| `POST /v1/chat/completions` with `"stream": false` | auto titles, and the fallback after a streaming `invalidRequest` |

Anything else answers 404 and is logged as "not mocked" (the adapter's
`/api/v1/models/load` and `/unload` have no caller in the app).

Needs Node 22.18 or newer (runs the `.ts` files directly; no dependencies).

## Run

```sh
node scripts/mock-llm-server/cli.ts --port 1235              # 60 tokens at 20/s
node scripts/mock-llm-server/cli.ts --port 1235 --slow       # 3 tokens/s: time to tap stop
node scripts/mock-llm-server/cli.ts --port 1235 --fail-every 4 --fail-status 422
node scripts/mock-llm-server/cli.ts --port 1235 --fail-every 3 --fail-mode drop
```

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
| `--missing-model` | `mock-missing` | listed, but every completion on it answers 404 |
| `--fail-every N` | `0` (never) | completion requests N, 2N, 3N... fail |
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
that moment (`active=N`), which shows whether parallel streams overlap. A
completion's start line also shows the `max_tokens`, `temperature` and system
message it was sent with, so a tree's Model Settings can be checked end to
end.

## Test

```sh
npm test -- --no-watchman scripts/mock-llm-server
```
