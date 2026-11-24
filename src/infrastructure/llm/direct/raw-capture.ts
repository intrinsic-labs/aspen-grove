import { computeSha256Hash } from '@application/services/content-hash-service';
import type { RawResponseCapture } from '@application/services/llm';
import { headersToString } from '../openrouter/helpers';

/** Same canonical headers + unmodified body representation as OpenRouter. */
export const createDirectRawCapture = (
  requestTimestamp: Date,
  model: string
) => {
  let responseHeaders = '';
  let requestId: string | undefined;
  const chunks: string[] = [];
  return {
    headers(headers: Headers) {
      responseHeaders = headersToString(headers);
      requestId =
        headers.get('request-id') ?? headers.get('x-request-id') ?? undefined;
    },
    append(chunk: string) {
      chunks.push(chunk);
    },
    async finish(modelIdentifier = model): Promise<RawResponseCapture> {
      const responseBody = chunks.join('');
      const rawBytes = `${responseHeaders}\n\n${responseBody}`;
      const rawBytesHash = await computeSha256Hash(rawBytes);
      const responseTimestamp = new Date();
      return {
        rawBytes,
        rawBytesHash,
        responseHeaders,
        responseBody,
        requestId,
        modelIdentifier,
        requestTimestamp,
        responseTimestamp,
        latencyMs: responseTimestamp.getTime() - requestTimestamp.getTime(),
      };
    },
  };
};
