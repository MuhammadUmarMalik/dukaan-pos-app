import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { CATEGORIES } from '@/data/seed';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import { Avatar, Button, Card, Chip, Hairline, Row, Screen, Text } from '@/ui/kit';

export default function More() {
  const t = useT();
  const router = useRouter();
  const { shop, category, lang, theme, set } = useSettings();
  const cat = CATEGORIES.find((c) => c.k === category) ?? CATEGORIES[0];
  return (
    <Screen>
      <Text v="title" accessibilityRole="header" style={{ fontSize: 24 }}>{t('More', 'مزید')}</Text>
      <Card shell>
        <Row gap={12}>
          <Avatar text={shop.name.split(' ').map((w) => w[0]).slice(0, 2).join('')} tone="plain" />
          <View style={{ flex: 1 }}><Text w={600}>{shop.name}</Text><Text v="small" c="fg3">{t(...cat.n)} · {shop.city}</Text></View>
        </Row>
      </Card>
      <Card pad={0}>
        <Row justify="space-between" style={{ padding: 16 }}>
          <Text w={500}>{t('Language', 'زبان')}</Text>
          <Row gap={8}><Chip label="English" on={lang === 'en'} onPress={() => set({ lang: 'en' })} /><Chip label="اردو" on={lang === 'ur'} onPress={() => set({ lang: 'ur' })} /></Row>
        </Row>
        <Hairline />
        <Row justify="space-between" style={{ padding: 16 }}>
          <Text w={500}>{t('Theme', 'تھیم')}</Text>
          <Row gap={8}>
            <Chip label={t('Auto', 'خودکار')} on={theme === 'system'} onPress={() => set({ theme: 'system' })} />
            <Chip label={t('Light', 'روشن')} on={theme === 'light'} onPress={() => set({ theme: 'light' })} />
            <Chip label={t('Dark', 'گہرا')} on={theme === 'dark'} onPress={() => set({ theme: 'dark' })} />
          </Row>
        </Row>
      </Card>
      <Button kind="ghost" label={t('Restart setup', 'سیٹ اپ دوبارہ شروع کریں')} onPress={() => { set({ onboarded: false }); router.replace('/onboarding/language'); }} />
    </Screen>
  );
}
