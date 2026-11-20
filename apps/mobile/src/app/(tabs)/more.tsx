import { useRouter, type Href } from 'expo-router';
import { CATEGORIES, PLANS } from '@/data/seed';
import { storeName } from '@/lib/billing';
import { rs } from '@/lib/money';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import type { IconName } from '@/ui/icons';
import { Badge, Card, Screen, Text } from '@/ui/kit';
import { initials, Li, List } from '@/ui/parts';

export default function More() {
  const t = useT();
  const router = useRouter();
  const { shop, category, plan, sub } = useSettings();
  const cat = CATEGORIES.find((c) => c.k === category) ?? CATEGORIES[0];
  const days = Math.max(0, Math.ceil((sub.trialEnds - Date.now()) / 86_400_000));
  const items: [IconName, string, Href][] = [
    ['truck', t('Purchases and suppliers', 'خریداری اور سپلائرز'), '/purchases'],
    ['wallet', t('Expenses and cash closing', 'اخراجات اور کیش کلوزنگ'), '/cash-close'],
    ['receipt', t('Sale return', 'فروخت واپسی'), '/returns'],
    ['chart', t('Reports', 'رپورٹس'), '/reports'],
    ['box', t('Stock', 'اسٹاک'), '/stock'],
    ['users', t('Staff and permissions', 'اسٹاف اور اجازتیں'), '/staff'],
    ['link', t('Online catalog', 'آن لائن کیٹلاگ'), '/catalog'],
    ['star', t('Loyalty points', 'لائلٹی پوائنٹس'), '/loyalty'],
    ['printer', t('Printer and receipt', 'پرنٹر اور رسید'), '/printer-settings'],
    ['cloud', t('Backup and export', 'بیک اپ اور ایکسپورٹ'), '/backup'],
    ['shield', t('Settings', 'ترتیبات'), '/settings'],
    ['help', t('Help', 'مدد'), '/help'],
  ];
  const tone = ({ trial: 'acc', active: 'grn', grace: 'yel', hold: 'red', cancelled: 'yel', expired: 'red' } as const)[sub.status];
  return (
    <Screen>
      <Text v="title" accessibilityRole="header" style={{ fontSize: 24 }}>{t('More', 'مزید')}</Text>
      <Card shell>
        <Li initials={initials(shop.name)} title={shop.name} sub={`${t(...cat.n)} · ${shop.city}`}
          right={<Badge tone={tone} label={sub.status === 'trial' ? t(`Trial ${days} days`, `ٹرائل ${days} دن`) : t(...PLANS[plan].n)} />} />
      </Card>
      <List>{items.map(([icon, label, go]) => <Li key={label} icon={icon} title={label} onPress={() => router.push(go)} />)}</List>
      <Card pad={0}>
        <Li title={t('Subscription', 'سبسکرپشن')} sub={`${t(...PLANS[plan].n)} · ${rs(PLANS[plan].price[0] * 100)} / ${t('month', 'ماہ')} · ${storeName}`}
          right={<Badge tone={tone} label={sub.status} />} onPress={() => router.push('/subscription')} />
      </Card>
    </Screen>
  );
}
