import { useRouter } from 'expo-router';
import { openManage, restore, storeName } from '@/lib/billing';
import { PLANS } from '@/data/seed';
import { rs } from '@/lib/money';
import { useSettings, type SubStatus } from '@/state/settings';
import { useT } from '@/theme';
import { Badge, Button, Card, Col, Row, Screen, Text } from '@/ui/kit';
import { Header, Li, List, Progress, toast } from '@/ui/parts';

export default function Subscription() {
  const t = useT();
  const router = useRouter();
  const { plan, sub, staff } = useSettings();
  const p = PLANS[plan];
  const price = rs(p.price[0] * 100);
  const left = Math.max(0, Math.ceil((sub.trialEnds - Date.now()) / 86_400_000));
  const label: Record<SubStatus, [string, 'acc' | 'grn' | 'yel' | 'red']> = {
    trial: [t('Free trial', 'مفت ٹرائل'), 'acc'], active: [t('Active', 'فعال'), 'grn'], grace: [t('Payment issue', 'ادائیگی مسئلہ'), 'yel'],
    hold: [t('On hold', 'رکا ہوا'), 'red'], cancelled: [t('Cancelled', 'منسوخ'), 'yel'], expired: [t('Expired', 'ختم'), 'red'],
  };
  const body: Record<SubStatus, string> = {
    trial: t(`${left} trial days left. ${storeName} charges ${price} after the trial unless you cancel.`, `ٹرائل کے ${left} دن باقی۔ منسوخ نہ کریں تو ${storeName} ٹرائل کے بعد ${price} چارج کرے گا۔`),
    active: t(`Renews monthly for ${price}.`, `${price} پر ماہانہ تجدید۔`),
    grace: t(`${storeName} could not charge you. You keep full access while it retries.`, `${storeName} چارج نہیں کر سکا۔ دوبارہ کوشش کے دوران مکمل رسائی۔`),
    hold: t('Payment did not go through. The app is read-only until it does.', 'ادائیگی نہیں ہوئی۔ تب تک ایپ صرف دیکھنے کے لیے ہے۔'),
    cancelled: t('Access continues until the end of the paid period. You will not be charged again.', 'ادا شدہ مدت کے آخر تک رسائی رہے گی۔ دوبارہ چارج نہیں ہوگا۔'),
    expired: t('Your subscription ended. Your data is safe.', 'آپ کی سبسکرپشن ختم ہو گئی۔ ڈیٹا محفوظ ہے۔'),
  };
  const s = sub.status;
  const owner = staff[0]?.role === 'owner'; // ponytail: this phone is the owner's until staff sign-in exists
  return (
    <Screen>
      <Header title={t('Subscription', 'سبسکرپشن')} />
      <Card shell>
        <Col gap={12}>
          <Row justify="space-between"><Text v="h2">{t(...p.n)}</Text><Badge tone={label[s][1]} label={label[s][0]} /></Row>
          <Row gap={6} align="flex-end"><Text v="title" num>{price}</Text><Text c="fg3" style={{ paddingBottom: 4 }}>/ {t('month', 'ماہ')}</Text></Row>
          {s === 'trial' ? <Progress pct={((14 - left) / 14) * 100} /> : null}
          <Text v="small" c="fg2">{body[s]}</Text>
          {s === 'grace' || s === 'hold' ? <Button label={t('Update payment method', 'ادائیگی کا طریقہ اپڈیٹ')} onPress={openManage} /> : null}
          {s === 'cancelled' || s === 'expired' ? <Button label={t('Subscribe again', 'دوبارہ سبسکرائب')} disabled={!owner} onPress={() => router.push('/pay-plan')} /> : null}
        </Col>
      </Card>
      <List>
        <Li icon="shield" tone="blue" title={t(`Manage in ${storeName}`, `${storeName} میں سنبھالیں`)} sub={t('Cancel, change payment method, see receipts', 'منسوخ، ادائیگی کا طریقہ، رسیدیں')} onPress={openManage} />
        <Li icon="tag" tone="acc" title={t('Change plan', 'پلان بدلیں')} sub="Basic · Standard · Pro" onPress={() => router.push('/pay-plan?change=1')} />
        <Li icon="down" title={t('Restore purchases', 'خریداری بحال کریں')} sub={t('Bought on another phone or reinstalled?', 'دوسرے فون پر خریدا یا دوبارہ انسٹال کیا؟')}
          onPress={async () => toast((await restore()) ? t('Purchases restored', 'خریداری بحال') : t('Store purchases work in the phone app from the store', 'خریداری اسٹور والی فون ایپ میں ہوگی'))} />
      </List>
      <Card>
        <Col gap={8}>
          <Row justify="space-between"><Text v="small" c="fg2">{t('Billed by', 'بل کنندہ')}</Text><Text v="small" w={600}>{storeName}</Text></Row>
          <Row justify="space-between"><Text v="small" c="fg2">{t('Receipts', 'رسیدیں')}</Text><Text v="small" w={600}>{t(`Emailed by ${storeName}`, `${storeName} ای میل کرتا ہے`)}</Text></Row>
          <Row justify="space-between"><Text v="small" c="fg2">{t('Works offline', 'آف لائن')}</Text><Text v="small" w={600}>{t('Up to 7 days', '7 دن تک')}</Text></Row>
        </Col>
      </Card>
      <Text v="xs" c="fg3" style={{ textAlign: 'center' }}>{t('Only the shop owner can buy or change the plan.', 'صرف دکان کا مالک پلان خرید یا بدل سکتا ہے۔')}</Text>
    </Screen>
  );
}
