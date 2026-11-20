import Constants from 'expo-constants';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { call, whatsapp } from '@/lib/share';
import { useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Col, Row, Screen, Text } from '@/ui/kit';
import { Header } from '@/ui/parts';

// ponytail: placeholder support number until the business has one; change it here.
const SUPPORT = '0300 0000000';

export default function Help() {
  const t = useT();
  const tk = useTokens();
  const [open, setOpen] = useState<number | null>(null);
  const faq: [string, string][] = [
    [t('How do I add a product by scanning?', 'اسکین سے آئٹم کیسے شامل کروں؟'), t('Open Items, tap the scan icon and point the camera at the barcode. New codes open the Add product form.', 'آئٹمز کھولیں، اسکین دبائیں اور کیمرہ بارکوڈ پر رکھیں۔ نیا کوڈ آئٹم فارم کھولتا ہے۔')],
    [t('My printer does not connect', 'پرنٹر نہیں جڑ رہا'), t('Turn the printer off and on, keep it within 1 metre, then pair again from Printer and receipt.', 'پرنٹر بند کر کے دوبارہ آن کریں، ایک میٹر کے اندر رکھیں، پھر دوبارہ جوڑیں۔')],
    [t('Can I use the app without internet?', 'کیا انٹرنیٹ کے بغیر چل سکتی ہے؟'), t('Yes. Sales and khata save on your phone.', 'جی ہاں۔ فروخت اور کھاتہ فون میں محفوظ ہوتے ہیں۔')],
    [t('How do I pay or cancel my subscription?', 'سبسکرپشن کیسے ادا یا منسوخ کروں؟'), t('Open More, then Subscription. Payment and cancellation are handled by the Play Store or App Store on your phone.', 'مزید، پھر سبسکرپشن کھولیں۔ ادائیگی اور منسوخی آپ کے فون کا پلے اسٹور یا ایپ اسٹور سنبھالتا ہے۔')],
  ];
  return (
    <Screen>
      <Header title={t('Help', 'مدد')} />
      <Row gap={10}>
        <View style={{ flex: 1 }}><Button icon="chat" label={t('WhatsApp us', 'واٹس ایپ')} onPress={() => whatsapp(t('Assalam o Alaikum, I need help with Dukaan.', 'السلام علیکم، مجھے دکان ایپ میں مدد چاہیے۔'), SUPPORT)} /></View>
        <View style={{ flex: 1 }}><Button kind="sec" icon="phone" label={t('Call', 'کال')} onPress={() => call(SUPPORT)} /></View>
      </Row>
      <Text v="small" c="fg3">{t('Support is open 9am to 9pm, every day.', 'سپورٹ روزانہ صبح 9 سے رات 9 بجے تک۔')}</Text>
      <Text v="h2">{t('Common questions', 'عام سوالات')}</Text>
      <Col gap={0}>
        {faq.map(([q, a], i) => (
          <View key={q} style={{ borderBottomWidth: 1, borderBottomColor: tk.line }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? null : i)}>
              <Row justify="space-between" style={{ minHeight: 56 }}><Text w={500} style={{ flex: 1 }}>{q}</Text><Icon name={open === i ? 'minus' : 'plus'} size={18} /></Row>
            </Pressable>
            {open === i ? <Text c="fg2" style={{ paddingBottom: 16 }}>{a}</Text> : null}
          </View>
        ))}
      </Col>
      <Text v="xs" c="fg3" style={{ textAlign: 'center' }}>Dukaan {Constants.expoConfig?.version ?? ''} · {Platform.OS}</Text>
    </Screen>
  );
}
