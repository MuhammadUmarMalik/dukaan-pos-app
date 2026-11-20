import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { keypad, rupeesToPaisa } from '@/lib/books';
import { rs } from '@/lib/money';
import { cartTotals, useCart, type Split } from '@/state/cart';
import { useSettings } from '@/state/settings';
import { useT, useTokens } from '@/theme';
import { Badge, Button, Card, Row, Screen, Text } from '@/ui/kit';
import { Header, Keypad, Li, List, Note } from '@/ui/parts';

export default function SplitPay() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { lines, discount, customerId, set, complete } = useCart();
  const nextBill = useSettings((s) => s.nextBill);
  const { total } = cartTotals({ lines, discount });
  const [part, setPart] = useState<keyof Split>('cash');
  const [txt, setTxt] = useState<Record<keyof Split, string>>({ cash: '', jazz: '', khata: '' });
  const sp: Split = { cash: rupeesToPaisa(txt.cash), jazz: rupeesToPaisa(txt.jazz), khata: rupeesToPaisa(txt.khata) };
  const left = total - sp.cash - sp.jazz - sp.khata;
  const ok = left === 0 && (!sp.khata || !!customerId) && total > 0;
  const rows: [keyof Split, string, 'cash' | 'phone' | 'book'][] = [['cash', t('Cash', 'نقد'), 'cash'], ['jazz', 'JazzCash', 'phone'], ['khata', t('Khata', 'کھاتہ'), 'book']];
  return (
    <Screen>
      <Header title={t('Split payment', 'تقسیم ادائیگی')} home="/pay" />
      <Row justify="space-between"><Text c="fg2">{t('Total', 'کل')}</Text><Text v="h2" num>{rs(total)}</Text></Row>
      <List>
        {rows.map(([k, label, icon]) => (
          <Pressable key={k} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: part === k }} onPress={() => setPart(k)} style={{ borderStartWidth: 3, borderStartColor: part === k ? tk.accent : 'transparent' }}>
            <Li icon={icon} tone={part === k ? 'acc' : 'plain'} title={label} right={<Text v="h2" num>{rs(sp[k])}</Text>} />
          </Pressable>
        ))}
      </List>
      <Row justify="space-between">
        <Badge tone={left === 0 ? 'grn' : left < 0 ? 'red' : 'yel'} label={left === 0 ? t('Fully covered', 'مکمل') : left < 0 ? `${t('Over by', 'زیادہ')} ${rs(-left)}` : `${t('Remaining', 'باقی')} ${rs(left)}`} />
        <Button small kind="ghost" block={false} label={t('Fill remaining', 'باقی بھریں')} disabled={left <= 0}
          onPress={() => setTxt((x) => ({ ...x, [part]: String(Math.round((sp[part] + left) / 100)) }))} />
      </Row>
      {sp.khata && !customerId ? <Note text={t('Khata needs a customer. Choose one in the cart.', 'کھاتے کے لیے گاہک چنیں۔')} /> : null}
      <Card pad={0}><Keypad onKey={(k) => setTxt((x) => ({ ...x, [part]: keypad(x[part], k) }))} /></Card>
      <Button label={t('Confirm and print', 'تصدیق اور پرنٹ')} disabled={!ok} onPress={() => { set({ mode: 'split', split: sp }); complete(nextBill()); router.replace('/receipt'); }} />
    </Screen>
  );
}
