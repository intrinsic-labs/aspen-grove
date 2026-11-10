import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Append-only JSONL cache of model replies, keyed by plan key. Resumable. */
export type ReplyCache = {
  get: (key: string) => string | undefined;
  set: (key: string, text: string) => void;
};

export const openReplyCache = (file: string): ReplyCache => {
  const entries = new Map<string, string>();
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) {
        continue;
      }
      try {
        const row = JSON.parse(line) as { key: string; text: string };
        entries.set(row.key, row.text);
      } catch {
        // A torn last line from an interrupted run: ignore it.
      }
    }
  }
  mkdirSync(dirname(file), { recursive: true });
  return {
    get: (key) => entries.get(key),
    set: (key, text) => {
      entries.set(key, text);
      appendFileSync(file, `${JSON.stringify({ key, text })}\n`);
    },
  };
};
