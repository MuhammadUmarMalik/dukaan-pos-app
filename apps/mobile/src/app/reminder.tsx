import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { rs } from '@/lib/money';
import { whatsapp } from '@/lib/share';
import { due, useKhata } from '@/state/khata';
import { useSettings } from '@/state/settings';
import { radius, useT, useTokens } from '@/theme';
import { Button, Card, Screen, Text } from '@/ui/kit';
import { Header, initials, Li, Pick } from '@/ui/parts';

export default function Reminder() {
  const t = useT();
  const tk = useTokens();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useKhata((s) => s.parties.find((x) => x.id === id));
  const shop = useSettings((s) => s.shop);
  const [tone, setTone] = useState(0);
  if (!p) return <Redirect href="/(tabs)/khata" />;
  const d = rs(due(p));
  const msgs = [
    t(`Assalam o Alaikum ${p.name}, a gentle reminder from ${shop.name}. Your khata balance is ${d}. Please pay when convenient. Thank you.`, `السلام علیکم ${p.ur}، ${shop.name} کی طرف سے یاد دہانی۔ آپ کا کھاتہ ${d} باقی ہے۔ براہ کرم سہولت سے ادا کریں۔ شکریہ۔`),
    t(`Assalam o Alaikum ${p.name}, your balance of ${d} at ${shop.name} is overdue. Please clear it this week.`, `السلام علیکم ${p.ur}، ${shop.name} پر آپ کے ${d} واجب الادا ہیں۔ اس ہفتے ادا کر دیں۔`),
    t(`Assalam o Alaikum ${p.name}, ${d} is due at ${shop.name}. You can pay by JazzCash${shop.phone ? ` to 0${shop.phone.replace(/^0/, '')}` : ''}. Shukriya.`, `السلام علیکم ${p.ur}، ${shop.name} پر ${d} واجب ہیں۔ جاز کیش سے بھیج سکتے ہیں۔ شکریہ۔`),
  ];
  return (
    <Screen>
      <Header title={t('Send reminder', 'یاد دہانی')} home="/(tabs)/khata" />
      <Card pad={0}><Li initials={initials(p.name)} tone="blue" title={t(p.name, p.ur)} sub={p.phone || t('No phone saved', 'فون محفوظ نہیں')} right={<Text w={600} num c="redFg">{d}</Text>} /></Card>
      <Pick value={tone} onChange={setTone} options={[[0, t('Gentle', 'نرم')], [1, t('Firm', 'سخت')], [2, t('With payment details', 'ادائیگی کی تفصیل')]]} />
      <View style={{ padding: 14, borderRadius: radius.lg, backgroundColor: tk.surface2 }}>
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: tk.grnBg, alignSelf: 'flex-end', maxWidth: '92%' }}>
          <Text>{msgs[tone]}</Text>
        </View>
      </View>
      <Button icon="chat" label={t('Send on WhatsApp', 'واٹس ایپ پر بھیجیں')} onPress={() => whatsapp(msgs[tone], p.phone)} />
    </Screen>
  );
}
