/**
 * Home's date header text (DateHeaderView.swift): a greeting by the time of
 * day, the date as "E, MMMM dd" and the symbol beside it.
 */

const greetingForHour = (hour: number): string => {
  if (hour < 5) {
    return 'Good Early Morning';
  }
  if (hour < 12) {
    return 'Good Morning';
  }
  if (hour < 17) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
};

/**
 * "Good Evening.\nWelcome to Aspen Grove." with no name, or
 * "Good Evening,\n<name>." (DateHeaderView.swift `getGreeting`).
 */
export const greetingText = (date: Date, name?: string | null): string => {
  const greeting = greetingForHour(date.getHours());
  const trimmed = name?.trim();
  return trimmed
    ? `${greeting},\n${trimmed}.`
    : `${greeting}.\nWelcome to Aspen Grove.`;
};

/** "Sun, November 08": DateFormatter "E, MMMM dd" in the device locale. */
export const headerDateText = (date: Date, locale?: string): string => {
  const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
  const month = date.toLocaleDateString(locale, { month: 'long' });
  const day = String(date.getDate()).padStart(2, '0');
  return `${weekday}, ${month} ${day}`;
};

export type TimeOfDaySymbol = 'sun' | 'cloud-sun' | 'moon-stars' | 'moon-zzz';

/**
 * `sun.max.fill` 5–12, `cloud.sun.fill` 12–17, `moon.stars.fill` 17–22,
 * otherwise `moon.zzz.fill` (DateHeaderView.swift `getTimeIcon`).
 */
export const timeOfDaySymbol = (date: Date): TimeOfDaySymbol => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'sun';
  }
  if (hour >= 12 && hour < 17) {
    return 'cloud-sun';
  }
  if (hour >= 17 && hour < 22) {
    return 'moon-stars';
  }
  return 'moon-zzz';
};
