import { useRouter } from 'expo-router';
import { useState } from 'react';
import { keypad, rupeesToPaisa } from '@/lib/books';
import { rs } from '@/lib/money';
import { isToday, useBooks } from '@/state/books';
import { useT } from '@/theme';
import { Badge, Button, Card, Field, Row, Screen, Text } from '@/ui/kit';
import { BigAmount, Header, Keypad, Pick } from '@/ui/parts';

export default function Expense() {
  const t = useT();
  const router = useRouter();
  const { expenses, addExpense } = useBooks();
  const today = expenses.filter((e) => isToday(e.at));
  const [cat, setCat] = useState('Rent');
  const [from, setFrom] = useState<'Cash' | 'Bank'>('Cash');
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const paisa = rupeesToPaisa(amt);
  return (
    <Screen>
      <Header title={t('Add expense', 'خرچہ شامل')} home="/cash-close" />
      <Card>
        <Row justify="space-between">
          <Row gap={8}><Text c="fg2">{t('Spent today', 'آج خرچ')}</Text><Text w={600} num>{rs(today.reduce((a, e) => a + e.amount, 0))}</Text></Row>
          <Badge tone="blue" label={`${today.length} ${t('entries', 'اندراج')}`} />
        </Row>
      </Card>
      <Pick value={cat} onChange={setCat} options={[['Rent', t('Rent', 'کرایہ')], ['Electricity', t('Electricity', 'بجلی')], ['Salary', t('Salary', 'تنخواہ')], ['Transport', t('Transport', 'کرایہ بار')], ['Tea', t('Tea and misc', 'چائے اور متفرق')], ['Other', t('Other', 'دیگر')]]} />
      <BigAmount label={t('Amount', 'رقم')} paisa={paisa} />
      <Pick value={from} onChange={setFrom} options={[['Cash', t('From cash drawer', 'نقد دراز سے')], ['Bank', t('From bank', 'بینک سے')]]} />
      <Field label={t('Note, optional', 'نوٹ، اختیاری')} value={note} onChangeText={setNote} />
      <Keypad onKey={(k) => setAmt((a) => keypad(a, k))} />
      <Button label={t('Save expense', 'خرچہ محفوظ')} disabled={!paisa} onPress={() => { addExpense({ cat, amount: paisa, from, note: note.trim() }); router.back(); }} />
    </Screen>
  );
}
