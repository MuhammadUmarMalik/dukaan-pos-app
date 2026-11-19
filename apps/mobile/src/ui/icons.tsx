import { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useRtl, useTokens, type Tokens } from '@/theme';

// 24x24, 1.75 stroke. Same paths as the prototype so the app and the design never drift.
const IC = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  cart: '<path d="M3 4h2l2.2 11h10.6L20 7H6.2"/><circle cx="9" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  printer: '<path d="M7 9V4h10v5"/><path d="M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 6 0 2.5 2.5 0 0 0 5 0"/><path d="M5 11v9h14v-9M10 20v-5h4v5"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><path d="M4 7v11a2 2 0 0 0 2 2h14v-4"/><path d="M4 7h14a2 2 0 0 1 2 2v3M20 12h-4a2 2 0 0 0 0 4h4z"/>',
  users: '<circle cx="9" cy="9" r="3.5"/><path d="M2.5 19a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="8" r="2.5"/><path d="M17 13a5 5 0 0 1 4.5 5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  bank: '<path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  arrow: '<path d="M7 17L17 7M8 7h9v9"/>',
  bread: '<path d="M5 11a4 4 0 0 1 3-6h8a4 4 0 0 1 3 6v8H5z"/><path d="M9 11v3M13 11v3"/>',
  cup: '<path d="M6 8h12l-1.5 12h-9z"/><path d="M5 8h14M9 4h6"/>',
  shoe: '<path d="M3 16c4 0 5-4 5-8l3 3h4l5 3v4H3z"/>',
  shirt: '<path d="M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
  pill: '<path d="M9 15l6-6"/><path d="M4.5 13.5a3.5 3.5 0 0 0 5 5l9-9a3.5 3.5 0 0 0-5-5z"/>',
  wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9z"/>',
  bolt: '<path d="M4 12h4l2-6 4 12 2-6h4"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
} as const;
export type IconName = keyof typeof IC;

type Shape = { tag: 'path' | 'circle' | 'rect'; a: Record<string, string> };
const parsed: Partial<Record<IconName, Shape[]>> = {};
function shapes(name: IconName): Shape[] {
  return (parsed[name] ??= [...IC[name].matchAll(/<(path|circle|rect)\s+([^>]*?)\/>/g)].map((m) => ({
    tag: m[1] as Shape['tag'],
    a: Object.fromEntries([...m[2].matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]])),
  })));
}

type P = { name: IconName; size?: number; color?: keyof Tokens; flip?: boolean };

/** `flip` mirrors direction icons (chevrons, back) in right-to-left layouts. */
export const Icon = memo(function Icon({ name, size = 22, color = 'fg', flip }: P) {
  const tk = useTokens();
  const rtl = useRtl();
  return (
    <Svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tk[color]}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      style={flip && rtl ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {shapes(name).map((s, i) =>
        s.tag === 'path' ? <Path key={i} d={s.a.d} />
        : s.tag === 'circle' ? <Circle key={i} cx={+s.a.cx} cy={+s.a.cy} r={+s.a.r} />
        : <Rect key={i} x={+s.a.x} y={+s.a.y} width={+s.a.width} height={+s.a.height} rx={+(s.a.rx ?? 0)} />,
      )}
    </Svg>
  );
});
