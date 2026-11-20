import * as SecureStore from 'expo-secure-store';

// The sign-in session holds refresh tokens, so on a phone it goes in the Keychain / Keystore.
// SecureStore values are limited to about 2 KB and a session is larger, so it is stored in chunks.
const CHUNK = 1800;
export const secureStorage = {
  async getItem(k: string) {
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    if (!n) return null;
    let out = '';
    for (let i = 0; i < n; i++) out += (await SecureStore.getItemAsync(`${k}.${i}`)) ?? '';
    return out;
  },
  async setItem(k: string, v: string) {
    await secureStorage.removeItem(k);
    const n = Math.ceil(v.length / CHUNK);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${k}.${i}`, v.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(`${k}.n`, String(n));
  },
  async removeItem(k: string) {
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
    await SecureStore.deleteItemAsync(`${k}.n`);
  },
};
