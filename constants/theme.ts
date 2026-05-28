export const colors = {
  bg: {
    primary:   '#0A0A1E',
    secondary: '#12122A',
    elevated:  '#181836',
    tabBar:    '#0C0C22',
  },
  brand: {
    indigo:    '#6366F1',
    primary:   '#6366F1',
    secondary: '#A78BFA',
    accent:    '#F59E0B',
    gold:      '#C4A55A',
    goldLight: '#EDD280',
  },
  icon: {
    inactive: '#8A8AB0',
    active:   '#EDD280',
  },
  text: {
    primary:   '#F8F4E8',
    secondary: '#94A3B8',
    muted:     '#8B8BA8',
  },
  success: '#22C55E',
  warning: '#F59E0B',
  error:   '#EF4444',
  border:  '#1E2040',
  white:   '#FFFFFF',
} as const;

export const fonts = {
  regular:   'PlusJakartaSans_400Regular',
  medium:    'PlusJakartaSans_500Medium',
  semibold:  'PlusJakartaSans_600SemiBold',
  bold:      'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  xs:    11,
  sm:    13,
  base:  15,
  lg:    17,
  xl:    19,
  '2xl': 22,
  '3xl': 28,
} as const;

export const spacing = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 48,
} as const;

export const radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
} as const;

export const labelStyle = {
  color: colors.brand.gold,
  fontSize: typography.xs,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  fontFamily: fonts.bold,
} as const;
