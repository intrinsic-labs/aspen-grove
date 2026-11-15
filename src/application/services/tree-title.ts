/**
 * Tree titles before anyone names a tree.
 *
 * A tree starts with the repository's placeholder, `Loom Tree <ISO time>`.
 * Its first message then titles it the way Latent Spaces does
 * (HomeScreenView.swift:248-251): the first four words, with "..." when
 * there are more. Auto-titling may later replace either.
 */

const DEFAULT_TITLE_PATTERN = /^Loom Tree \d{4}-\d{2}-\d{2}T/;

const FIRST_MESSAGE_TITLE_WORDS = 4;

/** The placeholder title a tree has until it is titled. */
export const isDefaultTreeTitle = (title: string): boolean =>
  DEFAULT_TITLE_PATTERN.test(title);

/**
 * The first four words of the first message, "..." marking the rest.
 * Line breaks count as spaces so the title stays on one line.
 */
export const titleFromFirstMessage = (text: string): string => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const title = words.slice(0, FIRST_MESSAGE_TITLE_WORDS).join(' ');
  return words.length > FIRST_MESSAGE_TITLE_WORDS ? `${title}...` : title;
};

/**
 * Whether a title is still one the app chose (the placeholder, or the one
 * taken from this first message), so titling may replace it. A title the
 * user typed is never replaced.
 */
export const isProvisionalTreeTitle = (
  title: string,
  firstMessage: string
): boolean =>
  isDefaultTreeTitle(title) || title === titleFromFirstMessage(firstMessage);
