import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text as RNText, TextInput, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, space, useRtl, useTokens, type Tokens } from '@/theme';
import { Icon, type IconName } from './icons';

// ---- Text: one type scale, Geist for English, Noto Naskh for Urdu ----
const SCALE = {
  title: [27, 32, 600], h2: [17, 24, 600], body: [14.5, 21, 400], small: [12.5, 18, 400],
  xs: [11.5, 16, 400], label: [11, 14, 500], big: [38, 42, 600],
} as const;
const WEIGHT_NAME = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' } as const;

type TP = TextProps & { v?: keyof typeof SCALE; c?: keyof Tokens; w?: 400 | 500 | 600 | 700; num?: boolean; mono?: boolean };

export function Text({ v = 'body', c = 'fg', w, num, mono, style, ...p }: TP) {
  const tk = useTokens();
  const ur = useRtl();
  const [size, lh, base] = SCALE[v];
  const wt = w ?? base;
  // Amounts are Latin digits: always Geist, even inside Urdu text, so they look the same in both languages.
  const family = mono ? 'GeistMono_400Regular' : ur && !num ? `NotoNaskhArabic_${wt}${WEIGHT_NAME[wt]}` : `Geist_${wt}${WEIGHT_NAME[wt]}`;
  const s: TextStyle = {
    fontFamily: family, fontSize: size, lineHeight: ur ? Math.round(size * 1.75) : lh, color: tk[c],
    textAlign: mono ? 'left' : ur ? 'right' : 'left', writingDirection: mono ? 'ltr' : ur ? 'rtl' : 'ltr',
    // Arabic script joins letters: any tracking breaks it.
    letterSpacing: ur ? 0 : v === 'title' || v === 'big' ? -size * 0.03 : v === 'label' ? 1.3 : 0,
    fontVariant: num ? ['tabular-nums'] : undefined,
    textTransform: v === 'label' && !ur ? 'uppercase' : undefined,
  };
  return <RNText {...p} style={[s, style]} />;
}

// ---- Layout ----
type RP = { children?: ReactNode; gap?: number; align?: ViewStyle['alignItems']; justify?: ViewStyle['justifyContent']; wrap?: boolean; style?: StyleProp<ViewStyle> };
/** Horizontal row that flips in right-to-left layouts. */
export function Row({ children, gap = 12, align = 'center', justify, wrap, style }: RP) {
  const rtl = useRtl();
  return <View style={[{ flexDirection: rtl ? 'row-reverse' : 'row', gap, alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}
export const Col = ({ children, gap = 16, style }: { children?: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ gap }, style]}>{children}</View>
);

export function Screen({ children, scroll = true, pad = true, bottom = 36 }: { children: ReactNode; scroll?: boolean; pad?: boolean; bottom?: number }) {
  const tk = useTokens();
  const inner = { paddingHorizontal: pad ? space.gutter : 0, paddingTop: 8, paddingBottom: bottom, gap: 16 };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tk.bg }}>
      {scroll ? <ScrollView contentContainerStyle={inner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[{ flex: 1 }, inner]}>{children}</View>}
    </SafeAreaView>
  );
}

export function Card({ children, pad = 16, style, shell }: { children?: ReactNode; pad?: number; style?: StyleProp<ViewStyle>; shell?: boolean }) {
  const tk = useTokens();
  if (shell) {
    // Double bezel: outer tray (26) + inner plate (26 - 6 = 20).
    return (
      <View style={{ padding: 6, borderRadius: radius.shell, backgroundColor: tk.shell, borderWidth: 1, borderColor: tk.line }}>
        <View style={[{ padding: 18, borderRadius: radius.core, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line }, style]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[{ padding: pad, borderRadius: radius.lg, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line, boxShadow: '0 10px 24px -14px rgba(16,18,20,0.10)' }, style]}>{children}</View>
  );
}

export const Hairline = () => <View style={{ height: 1, backgroundColor: useTokens().line }} />;

// ---- Controls ----
type BP = { label: string; onPress?: () => void; kind?: 'pri' | 'sec' | 'ghost'; icon?: IconName; disabled?: boolean; block?: boolean; small?: boolean };
export function Button({ label, onPress, kind = 'pri', icon, disabled, block = true, small }: BP) {
  const tk = useTokens();
  const rtl = useRtl();
  const bg = kind === 'pri' ? tk.accent : kind === 'sec' ? tk.surface : 'transparent';
  const fg: keyof Tokens = kind === 'pri' ? 'accentFg' : kind === 'ghost' ? 'fg2' : 'fg';
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
      disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({
        height: small ? 40 : 52, borderRadius: small ? radius.sm + 2 : radius.md, paddingHorizontal: small ? 14 : 20,
        alignSelf: block ? 'stretch' : 'flex-start', flexDirection: rtl ? 'row-reverse' : 'row', gap: 8,
        alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: disabled ? 0.45 : 1,
        borderWidth: kind === 'sec' ? 1 : 0, borderColor: tk.line2, transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text w={600} c={fg} style={{ fontSize: small ? 13 : 15 }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, dot, size = 44 }: { icon: IconName; onPress?: () => void; label: string; dot?: boolean; size?: number }) {
  const tk = useTokens();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: radius.md, backgroundColor: tk.surface, borderWidth: 1, borderColor: tk.line, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <Icon name={icon} flip={icon === 'back' || icon === 'chev'} />
      {dot ? <View style={{ position: 'absolute', top: 9, end: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: tk.accent, borderWidth: 2, borderColor: tk.surface }} /> : null}
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  const tk = useTokens();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} onPress={onPress}
      style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? tk.fg : tk.surface, borderWidth: on ? 0 : 1, borderColor: tk.line }}>
      <Text v="small" c={on ? 'bg' : 'fg2'}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'acc' }: { label: string; tone?: 'acc' | 'red' | 'blue' | 'grn' | 'yel' }) {
  const tk = useTokens();
  const bg = { acc: tk.accentSoft, red: tk.redBg, blue: tk.blueBg, grn: tk.grnBg, yel: tk.yelBg }[tone];
  const fg: keyof Tokens = { acc: 'accentInk', red: 'redFg', blue: 'blueFg', grn: 'grnFg', yel: 'yelFg' }[tone] as keyof Tokens;
  return <View style={{ height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: bg, justifyContent: 'center', alignSelf: 'flex-start' }}><Text v="xs" c={fg} w={500}>{label}</Text></View>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, error, autoCapitalize, secure }: { label: string; value: string; onChangeText: (s: string) => void; placeholder?: string; keyboardType?: 'default' | 'phone-pad' | 'numeric' | 'decimal-pad' | 'email-address'; error?: string; secure?: boolean; autoCapitalize?: 'none' | 'sentences' | 'words' }) {
  const tk = useTokens();
  const ur = useRtl();
  return (
    <View style={{ gap: 7 }}>
      <Text v="small" c="fg2" w={500}>{label}</Text>
      <TextInput
        accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={tk.fg3} keyboardType={keyboardType} autoCapitalize={autoCapitalize} secureTextEntry={secure} autoCorrect={secure ? false : undefined}
        style={{ height: 52, borderRadius: radius.md - 1, paddingHorizontal: 14, backgroundColor: tk.surface, borderWidth: error ? 2 : 1, borderColor: error ? tk.redFg : tk.line2, color: tk.fg, fontSize: 15, textAlign: ur ? 'right' : 'left', fontFamily: ur ? 'NotoNaskhArabic_400Regular' : 'Geist_400Regular' }}
      />
      {error ? <Text v="small" c="redFg" accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const tk = useTokens();
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={() => onChange(!on)}
      style={{ width: 46, height: 28, borderRadius: 14, padding: 3, backgroundColor: on ? tk.accent : tk.surface2, borderWidth: 1, borderColor: tk.line2, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

/** Round avatar tile with initials. */
export function Avatar({ text, tone = 'blue', icon }: { text?: string; tone?: 'acc' | 'red' | 'blue' | 'grn' | 'yel' | 'plain'; icon?: IconName }) {
  const tk = useTokens();
  const bg = { acc: tk.accentSoft, red: tk.redBg, blue: tk.blueBg, grn: tk.grnBg, yel: tk.yelBg, plain: tk.surface2 }[tone];
  const fg = ({ acc: 'accentInk', red: 'redFg', blue: 'blueFg', grn: 'grnFg', yel: 'yelFg', plain: 'fg' } as const)[tone];
  return <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{icon ? <Icon name={icon} size={20} color={fg} /> : <Text v="small" w={600} c={fg}>{text}</Text>}</View>;
}
