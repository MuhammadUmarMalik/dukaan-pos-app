import { createUserWithEmailAndPassword, GoogleAuthProvider, OAuthProvider, sendEmailVerification, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile } from 'firebase/auth';
import { auth } from './firebase';

export { validEmail, validPassword } from './auth-rules';

export type AuthResult = { ok: true; needsVerify?: boolean } | { ok: false; error: 'credentials' | 'unverified' | 'limit' | 'network' | 'cancelled' | 'other' };

// Messages stay generic on purpose: they must not reveal whether an email has an account.
const fail = (e: unknown): AuthResult => {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/too-many-requests') return { ok: false, error: 'limit' };
  if (code === 'auth/network-request-failed') return { ok: false, error: 'network' };
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return { ok: false, error: 'cancelled' };
  if (code.startsWith('auth/') && /credential|password|user-not-found|invalid-email|email-already|weak-password|user-disabled/.test(code)) return { ok: false, error: 'credentials' };
  return { ok: false, error: 'other' };
};

export async function signInEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    if (!user.emailVerified) { await fbSignOut(auth); return { ok: false, error: 'unverified' }; } // email accounts must confirm the address first
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function signUpEmail(email: string, password: string, fullName: string): Promise<AuthResult> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await updateProfile(user, { displayName: fullName.trim().slice(0, 120) });
    await sendEmailVerification(user);
    await fbSignOut(auth); // stay signed out until the email link is opened
    return { ok: true, needsVerify: true };
  } catch (e) { return fail(e); }
}

export async function sendReset(email: string): Promise<AuthResult> {
  try { await sendPasswordResetEmail(auth, email.trim().toLowerCase()); return { ok: true }; } catch (e) { return fail(e); }
}

export async function withGoogleToken(idToken: string): Promise<AuthResult> {
  try { await signInWithCredential(auth, GoogleAuthProvider.credential(idToken)); return { ok: true }; } catch (e) { return fail(e); }
}

export async function withAppleToken(idToken: string, rawNonce: string): Promise<AuthResult> {
  try { await signInWithCredential(auth, new OAuthProvider('apple.com').credential({ idToken, rawNonce })); return { ok: true }; } catch (e) { return fail(e); }
}

export const signOut = () => fbSignOut(auth);
