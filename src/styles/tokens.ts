/**
 * Design tokens. These MIRROR the mobile app (faikNew/src/constants/{colors,spacing,typography}.ts).
 * Keep in sync with the @theme block in globals.css — that is what Tailwind classes use;
 * this file is for places that need raw values (SVG, canvas, inline styles).
 */
export const Colors = {
  brand: '#C0376B',
  brandDark: '#922B52',
  aiRed: '#D94060',
  authentic: '#52A87C',
  authenticDark: '#2B7A54',
  tamper: '#E09020',
  tamperDark: '#C07018',
  videoPurple: '#7C3AED',
  audioPink: '#C44070',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceDark: '#1C1C1E',
  text: '#000000',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  // WEB DEVIATION: mobile's green button is #84CC16, which fails AA with white text (~1.9:1).
  greenAction: '#3F7D0B',
  // WEB DEVIATION: mobile textSecondary (#6B7280) is ~4.4:1 on the #F2F2F7 page background; the web uses this (~5.2:1) for secondary text.
  textSecondaryWeb: '#5F6673',
} as const;

/** px — same scale as mobile Spacing. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

/** Same type scale as mobile (System font stack on web). size px / weight. */
export const Typography = {
  display: { size: 36, weight: 800 },
  h1: { size: 28, weight: 700 },
  h2: { size: 22, weight: 700 },
  h3: { size: 18, weight: 600 },
  body: { size: 15, weight: 400 },
  caption: { size: 12, weight: 400 },
  label: { size: 11, weight: 600, letterSpacing: 1.2, uppercase: true },
} as const;
