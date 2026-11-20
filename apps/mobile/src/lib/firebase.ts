import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { Platform } from 'react-native';
import { secureStorage } from './secure-storage';

// The React Native build of firebase/auth exports this, but the shared type file does not list it.
const { getReactNativePersistence } = FirebaseAuth as unknown as { getReactNativePersistence: (storage: typeof secureStorage) => Persistence };

// These values are public by design: a Firebase web config only names the project.
// What protects data is Firestore Security Rules and App Check, never hiding this config (RULES.md #6).
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
};

/** True when the app has a Firebase project to talk to. Without it the app runs on local data only. */
export const cloudReady = Boolean(config.apiKey && config.projectId && config.appId);

const app = getApps().length ? getApp() : initializeApp(cloudReady ? config : { apiKey: 'missing', projectId: 'missing', appId: 'missing' });

function makeAuth(): Auth {
  // ponytail: the web preview uses the browser's own storage; only phones get Keychain/Keystore. Web is for layout checks only.
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(secureStorage) });
  } catch {
    return getAuth(app); // fast refresh runs this file again; the first call already set the auth up
  }
}
export const auth = makeAuth();
