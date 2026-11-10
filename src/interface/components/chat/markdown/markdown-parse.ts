import {
  MarkdownIt,
  parser,
  type ASTNode,
} from 'react-native-markdown-display';
import { LruCache } from './lru-cache';

/**
 * One markdown-it for every message. Left to its default,
 * react-native-markdown-display builds a new MarkdownIt on every render of
 * every message, which costs more than the parse itself.
 */
export const sharedMarkdownIt = MarkdownIt({ typographer: true });

/** Enough for several big trees' active paths. */
const PARSED_MESSAGE_CAPACITY = 500;

const parsedMessages = new LruCache<string, readonly ASTNode[]>(
  PARSED_MESSAGE_CAPACITY
);

/**
 * Parses without caching, for text that is still changing (a streaming
 * reply): each partial would otherwise evict a finished message.
 */
export const parseMarkdownUncached = (source: string): readonly ASTNode[] =>
  // The library's parser hands its renderer the finished tree: return the
  // tree itself instead of rendering it.
  parser(
    source,
    (nodes) => nodes as unknown as ReturnType<typeof parser>,
    sharedMarkdownIt
  ) as readonly ASTNode[];

/**
 * The message's markdown syntax tree, parsed once per distinct text. The
 * renderer never mutates it, so a tree reopened, a branch switched back to
 * or a row re-rendered reuses the parse (and its stable keys).
 */
export const parseMarkdown = (source: string): readonly ASTNode[] =>
  parsedMessages.getOrCreate(source, () => parseMarkdownUncached(source));
