import { createContext, useContext } from 'react';

const ErrorDetailsDefaultContext = createContext(false);

/**
 * Whether failure details start expanded (the "Verbose Error Alerts"
 * setting) for everything under a screen, so deep surfaces such as a failed
 * continuation card don't need it passed down to them.
 */
export const ErrorDetailsDefaultProvider = ErrorDetailsDefaultContext.Provider;

export const useErrorDetailsExpandedByDefault = (): boolean =>
  useContext(ErrorDetailsDefaultContext);
