import { useRouter } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { PLANS } from '@/data/seed';
import { rs } from '@/lib/money';
import { useSettings, type Plan } from '@/state/settings';
import { radius, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Badge, Button, Card, Chip, Col, Row, Text } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';

export default function PlanScreen() {
  const t = useT();
  const tk = useTokens();
  const router = useRouter();
  const { plan, yearly, set } = useSettings();
  const store = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  return (
    <OnbShell step={6} title={t('Start 14 days free', '14 دن مفت شروع کریں')}
      sub={t(`Pay with ${store}. You are charged after the trial. Cancel before it ends and pay nothing.`, `${store} سے ادائیگی۔ ٹرائل کے بعد چارج ہوگا۔ پہلے منسوخ کریں تو کچھ نہیں۔`)}>
      <Row gap={8}>
        <Chip label={t('Monthly', 'ماہانہ')} on={!yearly} onPress={() => set({ yearly: false })} />
        <Chip label={t('Yearly, 2 months free', 'سالانہ، 2 ماہ مفت')} on={yearly} onPress={() => set({ yearly: true })} />
      </Row>
      {(Object.keys(PLANS) as Plan[]).map((k) => {
        const p = PLANS[k];
        const on = plan === k;
        const body = (
          <Col gap={10}>
            <Row justify="space-between"><Text v="h2">{t(...p.n)}</Text>{k === 'standard' ? <Badge label={t('Most chosen', 'مقبول ترین')} /> : null}</Row>
            <Row gap={6} align="flex-end">
              <Text v="title" num>{rs(p.price[yearly ? 1 : 0] * 100)}</Text>
              <Text c="fg3" style={{ paddingBottom: 4 }}>/ {yearly ? t('year', 'سال') : t('month', 'ماہ')}</Text>
            </Row>
            {p.feats.map((f) => (
              <Row key={f[0]} gap={8}><Icon name="check" size={16} color="accent" /><Text v="small" c="fg2">{t(...f)}</Text></Row>
            ))}
          </Col>
        );
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => set({ plan: k })}
            style={{ borderRadius: radius.lg, borderWidth: on ? 2 : 0, borderColor: tk.accent }}>
            {k === 'standard' ? <Card shell>{body}</Card> : <Card>{body}</Card>}
          </Pressable>
        );
      })}
      <Text v="xs" c="fg3">{t(`Prices shown by ${store} in your local currency. `, `${store} آپ کی کرنسی میں قیمت دکھاتا ہے۔ `)}</Text>
      <Button label={t('Start free trial', 'مفت ٹرائل شروع کریں')} onPress={() => router.push('/pay-plan?ctx=onboard')} />
      <View style={{ height: 4 }} />
    </OnbShell>
  );
}
