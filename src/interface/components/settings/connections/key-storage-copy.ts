/**
 * What the Connections page says about where an API key lives, per
 * platform. Keys go to `expo-secure-store` with its defaults (see
 * ExpoSecureCredentialStore), so only what that does is claimed:
 *
 * - iOS: the Keychain, readable while unlocked, not iCloud-synchronizable.
 *   Default Keychain items can ride in an encrypted device backup, so there
 *   is no "no backups" claim.
 * - Android: encrypted with a key held in the Android Keystore; its config
 *   plugin (on by default in app.json) leaves the stored values out of Auto
 *   Backup and device transfer.
 *
 * Latent Spaces' AES-GCM and biometric claims apply to neither.
 */
type KeyStorageCopy = {
  /** The hero card's bullets (ApiKeysHeroSection). */
  readonly bullets: readonly string[];
  /** The OpenRouter key sheet's footer (OpenRouterKeySheet). */
  readonly sheetFooter: string;
};

const SHARED_BULLETS = [
  'Sent only to the provider it belongs to',
  'No Aspen Grove server in between',
] as const;

const IOS: KeyStorageCopy = {
  bullets: [
    'Secure storage in the iOS Keychain',
    'Never synced to iCloud Keychain',
    ...SHARED_BULLETS,
    'iOS app sandboxing',
  ],
  sheetFooter:
    'Your API key will be stored in the iOS Keychain on this device. Save an empty field to remove it.',
};

const ANDROID: KeyStorageCopy = {
  bullets: [
    'Encrypted with the Android Keystore',
    'Left out of Android backups',
    ...SHARED_BULLETS,
    'Android app sandboxing',
  ],
  sheetFooter:
    'Your API key will be encrypted with the Android Keystore on this device. Save an empty field to remove it.',
};

export const keyStorageCopy = (os: string): KeyStorageCopy =>
  os === 'android' ? ANDROID : IOS;
