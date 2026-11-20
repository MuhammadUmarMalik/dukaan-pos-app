import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSettings, type Lang } from '@/state/settings';
import { radius, useT, useTokens } from '@/theme';
import { Icon } from '@/ui/icons';
import { Button, Col, Row, Text } from '@/ui/kit';
import { OnbShell } from '@/ui/Onboarding';

function LangCard({ lang, title, hint }: { lang: Lang; title: string; hint: string }) {
  const tk = useTokens();
  const on = useSettings((s) => s.lang === lang);
  const set = useSettings((s) => s.set);
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => set({ lang })}
      style={{ padding: 16, minHeight: 76, borderRadius: radius.lg, backgroundColor: on ? tk.accentSoft : tk.surface, borderWidth: on ? 2 : 1, borderColor: on ? tk.accent : tk.line, justifyContent: 'center' }}>
      <Row gap={14}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: on ? tk.surface : tk.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="globe" color={on ? 'accent' : 'fg'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text v="h2" style={lang === 'ur' ? { fontFamily: 'NotoNaskhArabic_600SemiBold', textAlign: 'left', writingDirection: 'ltr' } : undefined}>{title}</Text>
          <Text v="small" c="fg3" style={lang === 'ur' ? { fontFamily: 'NotoNaskhArabic_400Regular' } : undefined}>{hint}</Text>
        </View>
        {on ? <Icon name="check" size={20} color="accent" /> : null}
      </Row>
    </Pressable>
  );
}

export default function Language() {
  const t = useT();
  const router = useRouter();
  return (
    <OnbShell step={1} back={false} title={t('Welcome to Dukaan', 'دکان میں خوش آمدید')} sub={t('Run your shop from your phone. Sales, khata, stock and bills in one place.', 'اپنی دکان موبائل سے چلائیں۔ فروخت، کھاتہ، اسٹاک اور بل ایک جگہ۔')}>
      <Col gap={12} style={{ paddingTop: 12 }}>
        <Text v="label" c="fg3">{t('Choose your language', 'زبان منتخب کریں')}</Text>
        <LangCard lang="en" title="English" hint="Left to right" />
        <LangCard lang="ur" title="اردو" hint="دائیں سے بائیں" />
      </Col>
      <Button label={t('Continue', 'جاری رکھیں')} onPress={() => router.push('/onboarding/account')} />
    </OnbShell>
  );
}
