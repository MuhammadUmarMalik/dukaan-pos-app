import { onAuthStateChanged, type User } from 'firebase/auth';
import { create } from 'zustand';
import { auth } from '@/lib/firebase';
import { cloudReady } from '@/lib/firebase';

type S = { user: User | null; ready: boolean };

// Not persisted here: Firebase Auth keeps the session itself (Keychain/Keystore on phones, see lib/firebase.ts).
export const useAuth = create<S>(() => ({ user: null, ready: !cloudReady }));

if (cloudReady) onAuthStateChanged(auth, (user) => useAuth.setState({ user, ready: true }));
