const TRY_AGAIN = 'Start its local server, then try again.';

const isLoopbackEndpoint = (endpoint: string): boolean =>
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(endpoint);

const savedAddress = (endpoint?: string): string | undefined =>
  endpoint?.trim() || undefined;

/**
 * What a chat notice says when LM Studio isn't answering. The address gets a
 * line of its own, so a narrow notice never breaks it mid-URL (after
 * "http://") and it reads as the thing to check.
 */
export const lmStudioUnreachableMessage = (endpoint?: string): string => {
  const address = savedAddress(endpoint);
  if (!address) {
    return `LM Studio isn't answering. ${TRY_AGAIN}`;
  }
  const loopbackHint = isLoopbackEndpoint(address)
    ? " On a phone, use your computer's network address instead of localhost."
    : '';
  return `LM Studio isn't answering at this address:\n${address}\n${TRY_AGAIN}${loopbackHint}`;
};

/**
 * The same, sized for a continuation card (275 pt, at most 7 lines): the
 * address still on its own line, near the top so a long one is never cut,
 * and the phone hint in a few words.
 */
export const lmStudioUnreachableCardMessage = (endpoint?: string): string => {
  const address = savedAddress(endpoint);
  if (!address) {
    return `LM Studio isn't answering. ${TRY_AGAIN}`;
  }
  const loopbackHint = isLoopbackEndpoint(address)
    ? "\nOn a phone, use your computer's address."
    : '';
  return `LM Studio isn't answering at\n${address}\nStart its server, then try again.${loopbackHint}`;
};
