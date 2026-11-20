import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { keypad, rupeesToPaisa, signed } from '@/lib/books';
import { rs } from '@/lib/money';
import { due, useKhata } from '@/state/khata';
import { useT } from '@/theme';
import { Button, Card, Field, Screen } from '@/ui/kit';
import { BigAmount, Header, initials, Keypad, Li, Pick, Seg } from '@/ui/parts';

export default function Receive() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useKhata((s) => s.parties.find((x) => x.id === id));
  const entry = useKhata((s) => s.entry);
  const [dir, setDir] = useState<'got' | 'gave'>(p?.kind === 'supplier' ? 'gave' : 'got');
  const [amt, setAmt] = useState('');
  const [mode, setMode] = useState('Cash');
  const [note, setNote] = useState('');
  if (!p) return <Redirect href="/(tabs)/khata" />;
  const paisa = rupeesToPaisa(amt);
  const cust = p.kind === 'customer';
  const isPayment = cust ? dir === 'got' : dir === 'gave';
  const save = () => {
    entry(p.id, { amount: signed(p.kind, dir, paisa), mode: isPayment ? mode : undefined, note: note.trim() || (isPayment ? t('Payment', 'ادائیگی') : cust ? t('Credit given', 'ادھار دیا') : t('Goods on credit', 'ادھار مال')) });
    router.back();
  };
  return (
    <Screen>
      <Header title={t('Record entry', 'اندراج')} home="/(tabs)/khata" />
      <Card pad={0}><Li initials={initials(p.name)} tone="blue" title={t(p.name, p.ur)} sub={`${t('Balance', 'بیلنس')} ${rs(due(p))}`} /></Card>
      <Seg fill value={dir} onChange={setDir} options={[['got', t('You got', 'آپ کو ملا')], ['gave', t('You gave', 'آپ نے دیا')]]} />
      <BigAmount label={isPayment ? (cust ? t('Payment received', 'وصول رقم') : t('Payment made', 'ادا کی گئی رقم')) : cust ? t('New credit given', 'نیا ادھار') : t('Goods taken on credit', 'ادھار مال')} paisa={paisa} />
      {isPayment ? <Pick value={mode} onChange={setMode} options={[['Cash', t('Cash', 'نقد')], ['JazzCash', 'JazzCash'], ['Easypaisa', 'Easypaisa'], ['Bank', t('Bank', 'بینک')]]} /> : null}
      <Field label={t('Note, optional', 'نوٹ، اختیاری')} value={note} onChangeText={setNote} />
      <Keypad onKey={(k) => setAmt((a) => keypad(a, k))} />
      <Button label={t('Save entry', 'اندراج محفوظ کریں')} disabled={!paisa} onPress={save} />
    </Screen>
  );
}
