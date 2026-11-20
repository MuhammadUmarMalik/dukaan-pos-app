import { Linking, Platform } from 'react-native';

export const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

/** The store's own subscription page: cancel, change payment method, receipts. */
export const openManage = () => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions');

export type BuyResult = 'success' | 'pending' | 'cancel' | 'fail' | 'unavailable';

// ponytail: store purchases are not wired. Google Play Billing and StoreKit need the store products, a development
// build and the server check (docs/billing.md, RULES.md #8). Until then every purchase returns 'unavailable' and the
// screens say so; nothing is ever marked paid on the phone.
export async function buy(_plan: string, _yearly: boolean): Promise<BuyResult> {
  return 'unavailable';
}
export async function restore(): Promise<boolean> {
  return false;
}
