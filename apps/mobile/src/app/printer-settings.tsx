import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSettings, type ReceiptCfg } from '@/state/settings';
import { useT } from '@/theme';
import { Button, Card, Col, Field, Row, Screen, Text, Toggle } from '@/ui/kit';
import { Header, Li, List, Pick, Stepper, toast } from '@/ui/parts';

export default function PrinterSettings() {
  const t = useT();
  const router = useRouter();
  const { receipt: r, printer, set } = useSettings();
  const up = (p: Partial<ReceiptCfg>) => set({ receipt: { ...r, ...p } });
  const foot = r.foot || (r.lang === 'en' ? 'Thank you, visit again' : r.lang === 'ur' ? 'شکریہ، دوبارہ تشریف لائیں' : 'Shukriya! Phir tashreef layein');
  const mono = { fontFamily: 'GeistMono_400Regular', fontSize: 12, lineHeight: 18, color: '#1a1a1a', textAlign: 'left', writingDirection: 'ltr' } as const;
  const row = (a: string, b: string) => <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={mono}>{a}</Text><Text style={mono}>{b}</Text></View>;
  const dash = <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#999', marginVertical: 8 }} />;
  return (
    <Screen>
      <Header title={t('Printer and receipt', 'پرنٹر اور رسید')} />
      <Card pad={0}><Li icon="printer" tone="blue" title={printer ?? t('No printer', 'کوئی پرنٹر نہیں')} sub={printer ? t('Saved', 'محفوظ') : t('Not connected', 'جڑا نہیں')}
        right={<Button small kind="sec" block={false} label={printer ? t('Change', 'بدلیں') : t('Connect', 'جوڑیں')} onPress={() => router.push('/onboarding/printer?from=settings')} />} /></Card>
      <View style={{ width: r.paper === 80 ? 300 : 236, maxWidth: '100%', alignSelf: 'center', backgroundColor: '#FCFCFA', paddingHorizontal: 14, paddingVertical: 18, boxShadow: '0 14px 30px -14px rgba(0,0,0,0.25)' }}>
        <Text style={{ ...mono, textAlign: 'center', fontSize: 14 }}>{r.name}</Text>
        <Text style={{ ...mono, textAlign: 'center' }}>{r.addr}</Text>
        {dash}{row('Bill D1-000049', '14 Nov')}{dash}
        <Text style={mono}>Atta 10kg</Text>{row('1 x 1450', '1450')}
        <Text style={mono}>Cooking Oil 1L</Text>{row('2 x 540', '1080')}
        {dash}{row('TOTAL', 'Rs 2,530')}{r.bal ? row('Khata balance', 'Rs 12,400') : null}{dash}
        <Text style={{ ...mono, textAlign: 'center', fontFamily: r.lang === 'en' ? mono.fontFamily : 'NotoNaskhArabic_400Regular' }}>{foot}</Text>
      </View>
      <Col gap={8}><Text v="small" c="fg2" w={500}>{t('Paper width', 'کاغذ کی چوڑائی')}</Text><Pick value={r.paper} onChange={(paper) => up({ paper })} options={[[58, '58 mm'], [80, '80 mm']]} /></Col>
      <Field label={t('Shop name on receipt', 'رسید پر دکان کا نام')} value={r.name} onChangeText={(name) => up({ name })} />
      <Field label={t('Address and phone', 'پتہ اور فون')} value={r.addr} onChangeText={(addr) => up({ addr })} />
      <Field label={t('Footer message', 'آخری پیغام')} value={r.foot} onChangeText={(f) => up({ foot: f })} placeholder={foot} />
      <Col gap={8}><Text v="small" c="fg2" w={500}>{t('Receipt language', 'رسید کی زبان')}</Text><Pick value={r.lang} onChange={(lang) => up({ lang })} options={[['both', t('Urdu and English', 'اردو اور انگریزی')], ['en', 'English'], ['ur', 'اردو']]} /></Col>
      <List>
        {([['logo', t('Print shop logo', 'لوگو پرنٹ کریں')], ['bal', t('Show khata balance', 'کھاتہ بیلنس دکھائیں')], ['auto', t('Print after every sale', 'ہر فروخت پر پرنٹ')]] as const).map(([k, l]) =>
          <Li key={k} title={l} right={<Toggle label={l} on={r[k]} onChange={(v) => up({ [k]: v })} />} />)}
        <Li title={t('Copies', 'کاپیاں')} right={<Stepper value={r.copies} onStep={(d) => up({ copies: Math.min(3, Math.max(1, r.copies + d)) })} />} />
      </List>
      <Row><View style={{ flex: 1 }}><Button kind="sec" icon="printer" label={t('Print test receipt', 'ٹیسٹ رسید پرنٹ')} onPress={() => toast(printer ? t('Printing needs the phone app build', 'پرنٹنگ فون ایپ میں ہوگی') : t('Connect a printer first', 'پہلے پرنٹر جوڑیں'))} /></View></Row>
    </Screen>
  );
}
