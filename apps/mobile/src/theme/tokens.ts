// Quiet Tech: cool graphite neutrals, one emerald accent. Same values as design/prototype.html.
export const light = {
  bg: '#F7F7F5', surface: '#FFFFFF', surface2: '#F0F0EE', shell: '#EEEEEB',
  fg: '#141515', fg2: '#5B5E62', fg3: '#8B8E92',
  line: 'rgba(20,21,21,0.08)', line2: 'rgba(20,21,21,0.14)',
  accent: '#0E6B57', accentFg: '#FFFFFF', accentSoft: '#E2F0EB', accentInk: '#0A5444',
  redBg: '#FDEBEC', redFg: '#9F2F2D', blueBg: '#E1F3FE', blueFg: '#1F6C9F',
  grnBg: '#EDF3EC', grnFg: '#346538', yelBg: '#FBF3DB', yelFg: '#956400',
  glass: 'rgba(247,247,245,0.92)',
};
export type Tokens = typeof light;

export const dark: Tokens = {
  bg: '#0D0E0E', surface: '#151616', surface2: '#1C1D1D', shell: '#101111',
  fg: '#EDEEEC', fg2: '#A1A4A7', fg3: '#73767A',
  line: 'rgba(255,255,255,0.08)', line2: 'rgba(255,255,255,0.15)',
  accent: '#4CC3A3', accentFg: '#052018', accentSoft: '#12302A', accentInk: '#7FDCC2',
  redBg: '#341A1B', redFg: '#F0928F', blueBg: '#132A38', blueFg: '#7CC1EE',
  grnBg: '#18281A', grnFg: '#8FCB93', yelBg: '#33290F', yelFg: '#E5B65A',
  glass: 'rgba(13,14,14,0.92)',
};

// Shape lock: 10 inputs and small chips, 14 buttons, 16 cards, 26 outer shells (inner core is 20 = 26 - 6 padding).
export const radius = { sm: 10, md: 14, lg: 16, shell: 26, core: 20 } as const;
export const space = { gutter: 20 } as const;
