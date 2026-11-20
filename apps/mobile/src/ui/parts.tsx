import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { create } from 'zustand';
import { rs } from '@/lib/money';
import { radius, useRtl, useT, useTokens, type Tokens } from '@/theme';
import { Icon, type IconName } from './icons';
import { Avatar, Card, Chip, Col, Hairline, IconButton, Row, Text } from './kit';

// Shared screen parts that match the prototype's .hd, .li, .seg, .stat, .kp, .pgm and .note.

/** Back button, centered title, optional action. Back falls back to `home` when the page was opened directly. */
export function Header({ title, home = '/(tabs)/more', right }: { title: string; home?: Href; right?: ReactNode }) {
  const t = useT();
  const router = useRouter();
  return (
    <Row justify="space-between" style={{ minHeight: 44 }}>
      <IconButton icon="back" label={t('Back', 'واپس')} onPress={() => (router.canGoBack() ? router.back() : router.replace(home))} />
      <Text v="h2" numberOfLines={1} style={{ flex: 1, textAlign: 'center', marginHorizontal: 8 }}>{title}</Text>
      {right ?? <View style={{ width: 44 }} />}
    </Row>
  );
}

/** Segmented control. `fill` stretches the options to equal widths. */
export function Seg<K extends string>({ value, options, onChange, fill }: { value: K; options: [K, string][]; onChange: (k: K) => void; fill?: boolean }) {
  const tk = useTokens();
  return (
    <Row gap={4} style={{ alignSelf: fill ? 'stretch' : 'flex-start', padding: 4, borderRadius: radius.md, backgroundColor: tk.surface2, borderWidth: 1, borderColor: tk.line }}>
      {options.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={() => onChange(k)}
            style={{ flex: fill ? 1 : undefined, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? tk.surface : 'transparent', boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08)' : undefined }}>
            <Text v="small" w={on ? 600 : 500} c={on ? 'fg' : 'fg2'}>{label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Chip row for picking one value. */
export function Pick<K extends string | number>({ value, options, onChange }: { value: K; options: [K, string][]; onChange: (k: K) => void }) {
  return <Row gap={8} wrap>{options.map(([k, l]) => <Chip key={String(k)} label={l} on={k === value} onPress={() => onChange(k)} />)}</Row>;
}

type Tone = 'acc' | 'red' | 'blue' | 'grn' | 'yel' | 'plain';
/** List row: optional icon or initials, title and subtitle, right side, chevron when pressable. */
export function Li({ icon, tone = 'plain', initials, title, sub, right, onPress, chev = !!onPress, label }: {
  icon?: IconName; tone?: Tone; initials?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; onPress?: () => void; chev?: boolean; label?: string;
}) {
  const body = (
    <Row gap={12} style={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 }}>
      {icon || initials ? <Avatar icon={icon} text={initials} tone={tone} /> : null}
      <View style={{ flex: 1 }}>
        {typeof title === 'string' ? <Text w={500} numberOfLines={2}>{title}</Text> : title}
        {typeof sub === 'string' ? <Text v="small" c="fg3" numberOfLines={2}>{sub}</Text> : sub}
      </View>
      {right}
      {chev ? <Icon name="chev" size={18} color="fg3" flip /> : null}
    </Row>
  );
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label ?? (typeof title === 'string' ? title : undefined)} onPress={onPress}>{body}</Pressable> : body;
}

/** A card of rows with hairlines between them. */
export function List({ children }: { children: ReactNode[] }) {
  const rows = children.filter(Boolean);
  return <Card pad={0}>{rows.map((c, i) => <View key={i}>{i ? <Hairline /> : null}{c}</View>)}</Card>;
}

export function Stats({ items }: { items: ([string, string] | [string, string, keyof Tokens])[] }) {
  const tk = useTokens();
  return (
    <Card pad={0}>
      <Row gap={0} align="stretch">
        {items.map(([k, v, c], i) => (
          <View key={k} style={{ flex: 1, padding: 14, gap: 2, borderStartWidth: i ? 1 : 0, borderStartColor: tk.line }}>
            <Text v="xs" c="fg3">{k}</Text>
            <Text w={600} num c={c ?? 'fg'}>{v}</Text>
          </View>
        ))}
      </Row>
    </Card>
  );
}

export function Stepper({ value, onStep, label = '' }: { value: number | string; onStep: (d: number) => void; label?: string }) {
  const tk = useTokens();
  const t = useT();
  const b = (d: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${d < 0 ? t('Less', 'کم') : t('More', 'زیادہ')} ${label}`} onPress={() => onStep(d)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={d < 0 ? 'minus' : 'plus'} size={18} />
    </Pressable>
  );
  return <Row gap={0} style={{ borderRadius: 12, backgroundColor: tk.surface2, borderWidth: 1, borderColor: tk.line }}>{b(-1)}<Text w={600} num style={{ minWidth: 26, textAlign: 'center' }}>{value}</Text>{b(1)}</Row>;
}

/** Big centered amount (paisa). */
export function BigAmount({ label, paisa, children }: { label: string; paisa?: number; children?: ReactNode }) {
  return (
    <Col gap={2} style={{ alignItems: 'center', paddingVertical: 4 }}>
      <Text v="label" c="fg3">{label}</Text>
      {children ?? <Text v="big" num style={{ fontSize: 44, lineHeight: 50 }}>{rs(paisa ?? 0)}</Text>}
    </Col>
  );
}

/** 3x4 number pad. Digits are always left to right. */
export function Keypad({ onKey }: { onKey: (k: string) => void }) {
  const tk = useTokens();
  const t = useT();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, direction: 'ltr' }}>
      {keys.map((k) => (
        <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === 'del' ? t('Delete', 'مٹائیں') : k} onPress={() => onKey(k)}
          style={({ pressed }) => ({ width: '31.6%', height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? tk.surface2 : tk.surface, borderWidth: 1, borderColor: tk.line })}>
          {k === 'del' ? <Icon name="back" /> : <Text v="h2" num style={{ fontSize: 20 }}>{k}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

export function Progress({ pct, tone = 'acc' }: { pct: number; tone?: 'acc' | 'warn' | 'bad' }) {
  const tk = useTokens();
  const c = tone === 'bad' ? tk.redFg : tone === 'warn' ? tk.yelFg : tk.accent;
  return <View style={{ height: 6, borderRadius: 3, backgroundColor: tk.surface2, overflow: 'hidden' }}><View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: c, borderRadius: 3 }} /></View>;
}

export function Note({ text, tone = 'yel' }: { text: string; tone?: 'yel' | 'blue' | 'red' }) {
  const tk = useTokens();
  const bg = { yel: tk.yelBg, blue: tk.blueBg, red: tk.redBg }[tone];
  const fg = ({ yel: 'yelFg', blue: 'blueFg', red: 'redFg' } as const)[tone];
  return <Row gap={10} align="flex-start" style={{ padding: 12, borderRadius: radius.md, backgroundColor: bg }}><Icon name="alert" size={18} color={fg} /><Text v="small" c={fg} style={{ flex: 1 }}>{text}</Text></Row>;
}

export function Empty({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <Card>
      <Col gap={8} style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Avatar icon={icon} tone="yel" />
        <Text v="h2" style={{ textAlign: 'center' }}>{title}</Text>
        {body ? <Text v="small" c="fg3" style={{ textAlign: 'center', maxWidth: 280 }}>{body}</Text> : null}
      </Col>
    </Card>
  );
}

// ---- Toast: one short message at the bottom, for actions that finish on another app or device. ----
export const useToast = create<{ msg: string; show: (m: string) => void }>((set) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return { msg: '', show: (msg) => { clearTimeout(timer); set({ msg }); timer = setTimeout(() => set({ msg: '' }), 2600); } };
});
export const toast = (m: string) => useToast.getState().show(m);

export function Toast() {
  const msg = useToast((s) => s.msg);
  const tk = useTokens();
  const rtl = useRtl();
  if (!msg) return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', bottom: 96, start: 20, end: 20, alignItems: rtl ? 'flex-end' : 'flex-start' }}>
      <View style={{ alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md, backgroundColor: tk.fg, maxWidth: 420 }}>
        <Text v="small" c="bg" w={500}>{msg}</Text>
      </View>
    </View>
  );
}

export const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
