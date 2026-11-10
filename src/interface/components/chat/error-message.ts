/** The message shown in the chat error banner for any caught value. */
export const toErrorMessage = (caught: unknown): string =>
  caught instanceof Error ? caught.message : String(caught);
