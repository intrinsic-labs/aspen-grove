import { createContext, useContext } from 'react';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';

/**
 * Where a Form is drawn. A sheet's Form sits one elevation up, so its cards
 * are lighter (`settingsForm.colors.sheetRowBackground`).
 */
export type FormSurface = 'screen' | 'sheet';

const FormSurfaceContext = createContext<FormSurface>('screen');

export const FormSurfaceProvider = FormSurfaceContext.Provider;

export const useFormSurface = (): FormSurface => useContext(FormSurfaceContext);

/** Card and highlight colors for the current surface. */
export const useFormColors = () => {
  const surface = useFormSurface();
  const { colors } = loomUiTokens.settingsForm;
  return {
    ...colors,
    card:
      surface === 'sheet' ? colors.sheetRowBackground : colors.rowBackground,
    page: surface === 'sheet' ? colors.sheetBackground : colors.background,
    // UITableViewCell's selected background, dark (systemGray4).
    pressed: surface === 'sheet' ? '#48484A' : '#3A3A3C',
  };
};
