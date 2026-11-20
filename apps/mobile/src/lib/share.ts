import { Linking, Share } from 'react-native';

/** 0300 1234567 -> 923001234567 (wa.me wants the country code and digits only). */
export const intlPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  return d.startsWith('92') ? d : d.startsWith('0') ? `92${d.slice(1)}` : d ? `92${d}` : '';
};

/** Opens WhatsApp with the text (to a number when given). Free click-to-chat, no WhatsApp API. */
export const whatsapp = (text: string, phone = '') =>
  Linking.openURL(`https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}`);

export const call = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);

/** The phone's own share sheet (WhatsApp, email, Drive). */
export const shareText = (message: string, title?: string) => Share.share({ message, title });
