import { useRef, useState } from 'react';
import type { ULID } from '@domain/value-objects';
import type { ChatRow, ChatSession } from '../types';

/**
 * The loaded dialogue: the session (tree, path, agents), the rows on its
 * active path, and the loading/error flags around them. State only; loading
 * lives in `useChatSessionLoader`.
 *
 * `activeTreeIdRef` remembers the tree once a session has initialized, so
 * actions still find it while `session` is being replaced.
 */
export const useChatSessionState = () => {
  const activeTreeIdRef = useRef<ULID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly ChatRow[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);

  return {
    activeTreeIdRef,
    loading,
    setLoading,
    error,
    setError,
    rows,
    setRows,
    session,
    setSession,
  };
};
