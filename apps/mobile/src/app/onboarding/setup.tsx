import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { CATEGORIES } from '@/data/seed';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Icon, type IconName } from '@/ui/icons';
import { Avatar, Button, Card, Col, Hairline, Row, Text, Toggle } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';

export default function Setup() {
  const t = useT();
  const router = useRouter();
  const { category, flags, set } = useSettings();
  const c = CATEGORIES.find((x) => x.k === category) ?? CATEGORIES[0];
  const rows: { icon: IconName; title: string; body?: string; toggle?: 'barcode' | 'expiry' }[] = [
    { icon: 'store', title: t('Selling', 'فروخت'), body: t(...c.mode) },
    { icon: 'tag', title: t('Starter categories', 'ابتدائی کیٹیگریز'), body: t(...c.starter) },
    { icon: 'list', title: t('Units', 'یونٹس'), body: c.units },
    { icon: 'scan', title: t('Barcode scanning', 'بارکوڈ اسکین'), toggle: 'barcode' },
    { icon: 'cal', title: t('Expiry alerts', 'ایکسپائری الرٹ'), toggle: 'expiry' },
    { icon: 'bolt', title: t('Made for you', 'آپ کے لیے'), body: t(...c.special) },
    { icon: 'printer', title: t('Receipt', 'رسید'), body: t('58mm, Urdu and English', '58 ملی میٹر، اردو اور انگریزی') },
  ];
  return (
    <OnbShell step={5} title={t(`Your ${c.n[0]} shop is ready`, `آپ کی ${c.n[1]} دکان تیار ہے`)}
      sub={c.count ? t(`${c.count} starter items added. Turn anything on or off.`, `${c.count} ابتدائی آئٹمز شامل۔ جو چاہیں آن یا آف کریں۔`) : t('Nothing added yet. Turn on what you need.', 'ابھی کچھ شامل نہیں۔ جو ضرورت ہو آن کریں۔')}>
      <Card pad={0}>
        <Col gap={0}>
          {rows.map((r, i) => (
            <View key={r.title}>
              {i ? <Hairline /> : null}
              <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 13, minHeight: 62 }}>
                <Avatar icon={r.icon} tone="plain" />
                <View style={{ flex: 1 }}>
                  <Text w={500}>{r.title}</Text>
                  {r.body ? <Text v="small" c="fg3">{r.body}</Text> : null}
                </View>
                {r.toggle ? <Toggle label={r.title} on={flags[r.toggle]} onChange={(v) => set({ flags: { ...flags, [r.toggle!]: v } })} /> : <Icon name="check" size={18} color="accent" />}
              </Row>
            </View>
          ))}
        </Col>
      </Card>
      <Button label={t('Looks good', 'ٹھیک ہے')} onPress={() => router.push('/onboarding/plan')} />
    </OnbShell>
  );
}
