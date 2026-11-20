# Authentication

Firebase Authentication. Sign-in methods: email + password (the email must be verified), Google, Apple. No phone/SMS (cost).

## How it works
- `apps/mobile/src/lib/firebase.ts`: app and auth setup. On phones the session is stored in the Keychain/Keystore (`secure-storage.ts`, chunked SecureStore). Config comes from `EXPO_PUBLIC_FIREBASE_*` (public by design).
- `src/lib/auth.ts`: sign in, sign up, reset, Google and Apple credential sign-in. Errors are generic so they never reveal whether an email has an account. Email accounts are signed out after sign-up until the verification link is opened.
- `src/lib/social.tsx`: Google button (expo-auth-session, ID token) and Apple button (native, iPhone only, with a nonce).
- `src/state/auth.ts`: current user in a Zustand store from `onAuthStateChanged`.
- `src/app/index.tsx` decides where to go; `_layout.tsx` sends a signed-out user back to sign in.
- Password reset and email verification links open Firebase's hosted page; no in-app deep link is needed.

## Firebase console settings (cannot be set from code)
1. Create a project, then add a **Web app** and copy its config into `apps/mobile/.env` (see `.env.example`).
2. Authentication > Sign-in method:
   - Email/Password: on. Email link (passwordless): off.
   - Google: on. Copy the Web client ID it shows into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. For phones create Android and iOS OAuth client IDs in Google Cloud (Android needs the app's SHA-1 from EAS) and put them in the other two variables.
   - Apple: on (needs an Apple Developer account, a Services ID and a key; Apple is required on iOS when Google sign-in is offered). Native iPhone sign-in uses the bundle ID.
3. Authentication > Settings: turn **Email enumeration protection** on. User actions: block account deletion if you want it done only by a function. Authorized domains: keep only what you use.
4. Authentication > Templates: set the sender name, and later a custom domain for emails.
5. **App Check** (Play Integrity on Android, App Attest on iOS) before launch, and enforce it for Auth and Firestore.
6. Billing: Cloud Functions need the Blaze plan. Set a budget alert.
7. Turn two-factor on for your own Google account that owns the project.

## Not done yet
- Google and Apple need a development build on a device (not Expo Go, not the web preview).
- Account deletion in the app (the App Store requires it before release).
- Sign-out button in More.
- Profile document in Firestore (rules deny everything for now).
