/** "Aspen Grove v1.0.0 (12)"; the build is left off where there is none. */
export const appVersionLabel = (
  version: string | null,
  build: string | null
): string => {
  const base = `Aspen Grove v${version ?? ''}`;
  return build ? `${base} (${build})` : base;
};
