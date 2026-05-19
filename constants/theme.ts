export const colors = {
  bg: {
    primary:   '#0A0A1E',
    secondary: '#13132E',
    elevated:  '#1A1A3E',
    tabBar:    '#0F0F2E',
  },
  brand: {
    primary:   '#6366F1',
    secondary: '#A78BFA',
    accent:    '#F59E0B',
  },
  text: {
    primary:   '#F1F5F9',
    secondary: '#94A3B8',
    muted:     '#475569',
  },
  success: '#22C55E',
  warning: '#F59E0B',
  error:   '#EF4444',
  border:  '#1E2040',
  white:   '#FFFFFF',
} as const;

export const typography = {
  xs:    12,
  sm:    14,
  base:  16,
  lg:    18,
  xl:    20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const spacing = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 48,
} as const;
