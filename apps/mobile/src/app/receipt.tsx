import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { rs } from '@/lib/money';
import { useCart } from '@/state/cart';
import { whatsapp } from '@/lib/share';
import { useKhata } from '@/state/khata';
import { useSettings } from '@/state/settings';
import { toast } from '@/ui/parts';
import { useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Col, Row, Screen, Text } from '@/ui/kit';

const MODE_EN = { cash: 'cash', jazz: 'JazzCash', easy: 'Easypaisa', bank: 'bank', khata: 'khata', split: 'cash and khata' } as const;
const MODE_UR = { cash: 'نقد', jazz: 'JazzCash', easy: 'Easypaisa', bank: 'بینک', khata: 'کھاتہ', split: 'نقد اور کھاتہ' } as const;

// ponytail: printing is a message for now. ESC/POS over Bluetooth needs a native module (development build) and is its own slice.
export default function Receipt() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const sale = useCart((s) => s.last);
  const parties = useKhata((s) => s.parties);
  const printer = useSettings((s) => s.printer);
  const shop = useSettings((s) => s.shop);
  if (!sale) return <Redirect href="/(tabs)/sell" />;
  const customer = parties.find((c) => c.id === sale.customerId);
  const billText = [shop.name, `Bill ${sale.bill}`, ...sale.lines.map((l) => `${l.name}  ${l.qty} x ${rs(l.price)}`), `Total ${rs(sale.total)}`, 'Shukriya!'].join('\n');
  const dash = <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#999', marginVertical: 8 }} />;
  const mono = { fontFamily: 'GeistMono_400Regular', fontSize: 12, lineHeight: 18, color: '#1a1a1a', textAlign: 'left', writingDirection: 'ltr' } as const;
  const when = new Date(sale.at);
  return (
    <Screen>
      <Col gap={10} style={{ alignItems: 'center', paddingTop: 8 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: tk.accent, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={26} color="accentFg" /></View>
        <Text v="title" style={{ fontSize: 24 }}>{t('Sale complete', 'فروخت مکمل')}</Text>
        <Text c="fg3">{sale.mode === 'khata' ? t('Added to khata', 'کھاتے میں درج') : `${t('Paid by', 'ادائیگی')} ${t(MODE_EN[sale.mode], MODE_UR[sale.mode])}`}</Text>
      </Col>
      <View style={{ width: 236, alignSelf: 'center', backgroundColor: '#FCFCFA', paddingHorizontal: 14, paddingVertical: 18, boxShadow: '0 14px 30px -14px rgba(0,0,0,0.25)' }}>
        <Text style={{ ...mono, textAlign: 'center', fontSize: 14, fontFamily: 'GeistMono_400Regular' }}>{shop.name.toUpperCase()}</Text>
        <Text style={{ ...mono, textAlign: 'center' }}>{shop.city}{shop.phone ? `\n0${shop.phone.replace(/^0/, '')}` : ''}</Text>
        {dash}
        <Row justify="space-between"><Text style={mono}>{sale.bill}</Text><Text style={mono}>{when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {when.toTimeString().slice(0, 5)}</Text></Row>
        {customer ? <Text style={mono}>{customer.name}</Text> : null}
        {dash}
        {sale.lines.map((l) => (
          <View key={`${l.name}${l.qty}`}>
            <Text style={mono}>{l.name}</Text>
            <Row justify="space-between"><Text style={mono}>{l.qty} x {l.price / 100}</Text><Text style={mono}>{Math.round(l.qty * l.price) / 100}</Text></Row>
          </View>
        ))}
        {dash}
        {sale.discount ? <Row justify="space-between"><Text style={mono}>Discount</Text><Text style={mono}>-{sale.discount / 100}</Text></Row> : null}
        <Row justify="space-between"><Text style={{ ...mono, fontSize: 14 }}>TOTAL</Text><Text style={{ ...mono, fontSize: 14 }}>{rs(sale.total)}</Text></Row>
        {dash}
        <Text style={{ ...mono, textAlign: 'center' }}>Shukriya! Phir tashreef layein</Text>
      </View>
      <Row gap={10}>
        <View style={{ flex: 1 }}><Button kind="sec" icon="printer" label={t('Print', 'پرنٹ')} onPress={() => toast(printer ? t('Printing needs the phone app build', 'پرنٹنگ فون ایپ میں ہوگی') : t('No printer connected. Set up in More.', 'پرنٹر نہیں جڑا۔ مزید میں سیٹ کریں۔'))} /></View>
        <View style={{ flex: 1 }}><Button kind="sec" icon="chat" label="WhatsApp" onPress={() => whatsapp(billText, customer?.phone)} /></View>
      </Row>
      <Button label={t('New sale', 'نئی فروخت')} onPress={() => router.replace('/(tabs)/sell')} />
    </Screen>
  );
}
