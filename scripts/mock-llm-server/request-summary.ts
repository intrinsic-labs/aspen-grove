/**
 * The generation settings a chat request carries, for the request's log
 * line: `max_tokens`, `temperature` and the system message (the agent's
 * prompt and the tree's system message), so a run can show that a tree's
 * Model Settings reached the provider.
 */
export const requestSummary = (body: {
  readonly messages?: unknown;
  readonly max_tokens?: unknown;
  readonly temperature?: unknown;
}): string => {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = messages
    .filter((message) => (message as { role?: unknown })?.role === 'system')
    .map((message) => (message as { content?: unknown }).content)
    .filter((content): content is string => typeof content === 'string')
    .join(' | ')
    .replace(/\s+/g, ' ');
  return [
    `max_tokens=${typeof body.max_tokens === 'number' ? body.max_tokens : '-'}`,
    `temperature=${typeof body.temperature === 'number' ? body.temperature : '-'}`,
    `system=${JSON.stringify(system)}`,
  ].join(' ');
};
