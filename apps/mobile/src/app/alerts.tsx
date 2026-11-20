import { useRouter } from 'expo-router';
import { rs } from '@/lib/money';
import { due, lastAt, useKhata } from '@/state/khata';
import { useProducts } from '@/state/products';
import { useSettings } from '@/state/settings';
import { useT } from '@/theme';
import type { IconName } from '@/ui/icons';
import { Screen } from '@/ui/kit';
import { Empty, Header, Li, List } from '@/ui/parts';

// Alerts are worked out from the data on the phone each time, so there is nothing to mark read.
export default function Alerts() {
  const t = useT();
  const router = useRouter();
  const items = useProducts((s) => s.items).filter((p) => !p.archived);
  const parties = useKhata((s) => s.parties);
  const sub = useSettings((s) => s.sub);
  const now = Date.now();
  const rows: { icon: IconName; tone: 'yel' | 'red' | 'blue' | 'acc'; title: string; sub: string; go: string }[] = [];
  items.filter((p) => p.stock <= p.min).forEach((p) => rows.push({ icon: 'box', tone: 'yel', title: t(`${p.name} is low`, `${p.ur} کم ہے`), sub: t(`${p.stock} left, alert at ${p.min}`, `${p.stock} باقی، الرٹ ${p.min}`), go: `/product-detail?id=${p.id}` }));
  items.filter((p) => p.expiry && new Date(p.expiry).getTime() - now < 7 * 86_400_000).forEach((p) => {
    const d = Math.ceil((new Date(p.expiry!).getTime() - now) / 86_400_000);
    rows.push({ icon: 'cal', tone: 'red', title: d < 0 ? t(`${p.name} has expired`, `${p.ur} ایکسپائر`) : t(`${p.name} expires in ${d} days`, `${p.ur} ${d} دن میں ایکسپائر`), sub: t(`${p.stock} left`, `${p.stock} باقی`), go: `/product-detail?id=${p.id}` });
  });
  const old = parties.filter((p) => p.kind === 'customer' && due(p) > 0 && now - lastAt(p) > 30 * 86_400_000);
  if (old.length) rows.push({ icon: 'users', tone: 'blue', title: t(`${old.length} customers owe over 30 days`, `${old.length} گاہک 30 دن سے باقی`), sub: rs(old.reduce((a, p) => a + due(p), 0)), go: '/(tabs)/khata' });
  if (sub.status === 'trial') { const d = Math.max(0, Math.ceil((sub.trialEnds - now) / 86_400_000)); rows.push({ icon: 'shield', tone: 'acc', title: t(`Trial ends in ${d} days`, `ٹرائل ${d} دن میں ختم`), sub: t('Choose a plan to keep selling', 'فروخت جاری رکھنے کے لیے پلان چنیں'), go: '/subscription' }); }
  return (
    <Screen>
      <Header title={t('Alerts', 'الرٹس')} home="/(tabs)" />
      {rows.length ? <List>{rows.map((r) => <Li key={r.title} icon={r.icon} tone={r.tone} title={r.title} sub={r.sub} onPress={() => router.push(r.go as never)} />)}</List>
        : <Empty icon="bell" title={t('All clear', 'سب ٹھیک ہے')} body={t('Low stock, expiry and overdue khata show up here.', 'کم اسٹاک، ایکسپائری اور پرانا کھاتہ یہاں نظر آئے گا۔')} />}
    </Screen>
  );
}
