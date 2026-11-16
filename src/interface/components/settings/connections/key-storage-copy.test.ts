import { keyStorageCopy } from './key-storage-copy';

describe('keyStorageCopy', () => {
  it('names the Keychain on iOS', () => {
    const copy = keyStorageCopy('ios');
    expect(copy.sheetFooter).toContain('iOS Keychain');
    expect(copy.bullets).toContain('Secure storage in the iOS Keychain');
  });

  it('names the Android Keystore on Android, and never the Keychain', () => {
    const copy = keyStorageCopy('android');
    expect(copy.sheetFooter).toContain('Android Keystore');
    expect(copy.bullets).toContain('Encrypted with the Android Keystore');
    const all = [copy.sheetFooter, ...copy.bullets].join('\n');
    expect(all).not.toMatch(/Keychain|iCloud|iOS/);
  });

  it('keeps the claims both platforms share', () => {
    for (const os of ['ios', 'android']) {
      expect(keyStorageCopy(os).bullets).toEqual(
        expect.arrayContaining([
          'Sent only to the provider it belongs to',
          'No Aspen Grove server in between',
        ])
      );
    }
  });
});
