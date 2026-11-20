import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { rs } from '@/lib/money';
import { buckets, range, type PeriodKind } from '@/lib/reports';
import { useT, useTokens, type Tokens } from '@/theme';
import { Card, Col, IconButton, Row, Text } from './kit';
import { Seg } from './parts';

// Shared pieces for every report: period picker, bar chart and a breakdown bar.

const fmt = (ms: number, o: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleDateString('en-GB', o);

export function usePeriod(initial: PeriodKind = 'day') {
  const [kind, setKind] = useState<PeriodKind>(initial);
  const [offset, setOffset] = useState(0);
  const r = range(kind, offset);
  const label = kind === 'day' ? fmt(r.from, { weekday: 'short', day: '2-digit', month: 'short' })
    : kind === 'week' ? `${fmt(r.from, { day: '2-digit', month: 'short' })} - ${fmt(r.to - 1, { day: '2-digit', month: 'short' })}`
    : fmt(r.from, { month: 'long', year: 'numeric' });
  return { kind, offset, ...r, label, setKind: (k: PeriodKind) => { setKind(k); setOffset(0); }, setOffset };
}
export type Period = ReturnType<typeof usePeriod>;

/** Day / week / month, then previous and next with the dates in between. Never goes past today. */
export function PeriodBar({ p, kinds = ['day', 'week', 'month'] }: { p: Period; kinds?: PeriodKind[] }) {
  const t = useT();
  const names: Record<PeriodKind, string> = { day: t('Day', 'دن'), week: t('Week', 'ہفتہ'), month: t('Month', 'مہینہ') };
  return (
    <Col gap={10}>
      {kinds.length > 1 ? <Seg fill value={p.kind} onChange={p.setKind} options={kinds.map((k) => [k, names[k]] as [PeriodKind, string])} /> : null}
      <Row justify="space-between">
        <IconButton icon="back" label={t('Earlier', 'پہلے')} onPress={() => p.setOffset(p.offset - 1)} />
        <Col gap={0} style={{ alignItems: 'center', flex: 1 }}>
          <Text w={600} num>{p.label}</Text>
          {p.offset === 0 ? <Text v="xs" c="accent">{p.kind === 'day' ? t('Today', 'آج') : p.kind === 'week' ? t('This week', 'یہ ہفتہ') : t('This month', 'یہ مہینہ')}</Text> : null}
        </Col>
        {p.offset < 0 ? <IconButton icon="chev" label={t('Later', 'بعد')} onPress={() => p.setOffset(p.offset + 1)} /> : <View style={{ width: 44 }} />}
      </Row>
    </Col>
  );
}

/** Big total with a bar per bucket of the period. `value(from, to)` sums one bucket. */
export function TotalChart({ p, label, total, value, foot }: { p: Period; label: string; total: number; value: (from: number, to: number) => number; foot?: string }) {
  const tk = useTokens();
  const bars = buckets(p.kind, p.from, p.to).map(([a, b]) => value(a, b));
  const max = Math.max(1, ...bars);
  return (
    <Card shell>
      <Text v="label" c="fg3">{label}</Text>
      <Text v="big" num style={{ marginTop: 6, marginBottom: 14 }}>{rs(total)}</Text>
      <View accessible accessibilityLabel={label} style={{ flexDirection: 'row', direction: 'ltr', alignItems: 'flex-end', gap: bars.length > 10 ? 2 : 6, height: 90, borderBottomWidth: 1, borderBottomColor: tk.line2 }}>
        {bars.map((v, i) => <View key={i} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, borderRadius: 3, backgroundColor: v ? tk.accent : tk.surface2, opacity: v ? 1 : 0.6 }} />)}
      </View>
      {foot ? <Text v="xs" c="fg3" style={{ marginTop: 6 }}>{foot}</Text> : null}
    </Card>
  );
}

const PALETTE: (keyof Tokens)[] = ['accent', 'blueFg', 'yelFg', 'redFg', 'grnFg', 'fg3', 'fg2'];

/** One stacked bar and a legend: where the money went. */
export function Breakdown({ title, rows, money = true }: { title: string; rows: [string, number][]; money?: boolean }) {
  const tk = useTokens();
  const t = useT();
  const total = rows.reduce((a, r) => a + r[1], 0);
  return (
    <Card>
      <Text v="h2" style={{ marginBottom: 12 }}>{title}</Text>
      {total ? (
        <>
          <View style={{ flexDirection: 'row', height: 10, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
            {rows.map(([k, v], i) => <View key={k} style={{ flex: v, backgroundColor: tk[PALETTE[i % PALETTE.length]] }} />)}
          </View>
          <View style={{ gap: 8, marginTop: 12 }}>
            {rows.map(([k, v], i) => (
              <Row key={k} justify="space-between">
                <Row gap={8} style={{ flex: 1 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tk[PALETTE[i % PALETTE.length]] }} /><Text v="small" numberOfLines={1} style={{ flex: 1 }}>{k}</Text></Row>
                <Text v="small" c="fg2" num>{money ? rs(v) : v} · {Math.round((v / total) * 100)}%</Text>
              </Row>
            ))}
          </View>
        </>
      ) : <Text c="fg3">{t('Nothing in this period.', 'اس مدت میں کچھ نہیں۔')}</Text>}
    </Card>
  );
}

export const Section = ({ title, children }: { title: string; children: ReactNode }) => <Col gap={8}><Text v="h2">{title}</Text>{children}</Col>;
