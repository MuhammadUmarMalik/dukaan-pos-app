import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { buy, storeName, type BuyResult } from '@/lib/billing';
import { PLANS } from '@/data/seed';
import { rs } from '@/lib/money';
import { useSettings, type Plan } from '@/state/settings';
import { useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Card, Col, Row, Screen, Text } from '@/ui/kit';
import { Header, Note, Pick } from '@/ui/parts';

/** Store purchase: confirm, hand over to the store sheet, then show what the store answered. */
export default function PayPlan() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { ctx, change } = useLocalSearchParams<{ ctx?: string; change?: string }>();
  const onboard = ctx === 'onboard';
  const { plan, yearly, set } = useSettings();
  const [res, setRes] = useState<BuyResult | 'busy' | null>(null);
  const p = PLANS[plan];
  const price = rs(p.price[yearly ? 1 : 0] * 100);
  const per = yearly ? t('year', 'سال') : t('month', 'ماہ');
  const next = () => (onboard ? router.replace('/onboarding/printer') : router.back());
  const go = async () => { setRes('busy'); setRes(await buy(plan, yearly)); };

  if (res === 'busy') return <Screen><Col gap={16} style={{ alignItems: 'center', paddingVertical: 80 }}><ActivityIndicator color={tk.accent} /><Text v="h2">{t(`Confirming with ${storeName}`, `${storeName} سے تصدیق`)}</Text><Text c="fg3">{t('Do not close the app', 'ایپ بند نہ کریں')}</Text></Col></Screen>;
  if (res) {
    const m: Record<BuyResult, [string, string, 'check' | 'cal' | 'x' | 'alert' | 'shield']> = {
      success: [onboard ? t('Your free trial has started', 'آپ کا مفت ٹرائل شروع') : t('You are subscribed', 'آپ سبسکرائب ہیں'), t(`Confirmed by ${storeName}.`, `${storeName} نے تصدیق کی۔`), 'check'],
      pending: [t('Payment is pending', 'ادائیگی زیر التوا'), t(`${storeName} is still processing your payment. We unlock the plan the moment it clears.`, `${storeName} ادائیگی پر کام کر رہا ہے۔ مکمل ہوتے ہی پلان کھل جائے گا۔`), 'cal'],
      cancel: [t('Purchase cancelled', 'خریداری منسوخ'), t('You were not charged.', 'آپ سے چارج نہیں ہوا۔'), 'x'],
      fail: [t('Payment declined', 'ادائیگی مسترد'), t('Your bank declined the payment. Try another payment method.', 'آپ کے بینک نے ادائیگی مسترد کی۔ دوسرا طریقہ آزمائیں۔'), 'alert'],
      unavailable: [t('Store purchase is not ready yet', 'اسٹور خریداری ابھی تیار نہیں'), onboard ? t('Plans are bought through the store in the published app. You can keep using the trial for now.', 'شائع شدہ ایپ میں پلان اسٹور سے خریدے جائیں گے۔ ابھی ٹرائل استعمال کریں۔') : t('Plans are bought through the store in the published app.', 'شائع شدہ ایپ میں پلان اسٹور سے خریدے جائیں گے۔'), 'shield'],
    };
    const [title, sub, icon] = m[res];
    const good = res === 'success' || res === 'pending' || res === 'unavailable';
    return (
      <Screen>
        <Col gap={12} style={{ alignItems: 'center', paddingTop: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: res === 'success' ? tk.accent : good ? tk.yelBg : tk.redBg }}>
            <Icon name={icon} size={26} color={res === 'success' ? 'accentFg' : good ? 'yelFg' : 'redFg'} />
          </View>
          <Text v="title" style={{ fontSize: 24, textAlign: 'center' }}>{title}</Text>
          <Text c="fg2" style={{ textAlign: 'center', maxWidth: 320 }}>{sub}</Text>
        </Col>
        {good ? <Button label={t('Continue', 'جاری رکھیں')} onPress={next} /> : <><Button label={t('Try again', 'دوبارہ کوشش')} onPress={go} /><Button kind="ghost" label={t('Back', 'واپس')} onPress={() => setRes(null)} /></>}
      </Screen>
    );
  }
  return (
    <Screen>
      <Header title={onboard ? t('Start your free trial', 'مفت ٹرائل شروع کریں') : change ? t('Change plan', 'پلان بدلیں') : t('Confirm your plan', 'پلان کی تصدیق')} home={onboard ? '/onboarding/plan' : '/subscription'} />
      <Text c="fg2">{t(`Payment is handled by ${storeName}. Dukaan never sees your card.`, `${storeName} ادائیگی سنبھالتا ہے۔ دکان آپ کا کارڈ نہیں دیکھتا۔`)}</Text>
      {!onboard ? <Pick value={plan} onChange={(k: Plan) => set({ plan: k })} options={(Object.keys(PLANS) as Plan[]).map((k) => [k, t(...PLANS[k].n)] as [Plan, string])} /> : null}
      <Card shell>
        <Col gap={8}>
          <Row justify="space-between"><Text c="fg2">{t('Plan', 'پلان')}</Text><Text w={600}>{t(...p.n)} · {yearly ? t('Yearly', 'سالانہ') : t('Monthly', 'ماہانہ')}</Text></Row>
          <Text v="h2" num>{onboard ? t(`14 days free, then ${price} / ${per}`, `14 دن مفت، پھر ${price} / ${per}`) : `${price} / ${per}`}</Text>
          <Text v="small" c="fg3">{onboard ? t('You will not be charged today.', 'آج کوئی چارج نہیں ہوگا۔') : change ? t('Changes apply right away, prorated by the store.', 'تبدیلی فوراً، اسٹور تناسب سے حساب کرتا ہے۔') : t('Renews automatically until you cancel.', 'منسوخ کرنے تک خودکار تجدید۔')}</Text>
        </Col>
      </Card>
      <Note tone="blue" text={t(`Cancel anytime in ${storeName}, then Subscriptions.`, `${storeName}، پھر سبسکرپشنز میں کبھی بھی منسوخ کریں۔`)} />
      <Button icon="shield" label={onboard ? t('Start free trial', 'مفت ٹرائل شروع') : t('Subscribe', 'سبسکرائب')} onPress={go} />
    </Screen>
  );
}
