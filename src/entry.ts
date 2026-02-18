import 'react-native-get-random-values';

if (
  __DEV__ &&
  typeof (globalThis as { crypto?: { getRandomValues?: unknown } }).crypto
    ?.getRandomValues !== 'function'
) {
  console.error(
    '[startup] crypto.getRandomValues missing before router entry; ULID generation will fail'
  );
}

import 'expo-router/entry';
