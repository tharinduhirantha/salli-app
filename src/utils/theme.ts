export const Colors = {
  // Brand
  navy:         '#0D1B3E',
  navyLight:    '#1A2B52',
  navyMid:      '#243660',
  yellow:       '#F5C100',
  yellowLight:  '#FFF8D6',
  yellowDark:   '#C9A000',

  // Mapped primaries (used throughout app)
  primary:      '#0D1B3E',   // navy
  primaryLight: '#EEF1F8',
  secondary:    '#F5C100',   // yellow
  secondaryLight: '#FFF8D6',

  // Status
  success:      '#22C55E',
  successLight: '#F0FDF4',
  danger:       '#DC2626',
  dangerLight:  '#FEF2F2',
  warning:      '#F5C100',
  warningLight: '#FFF8D6',

  // Surfaces
  bg:           '#F4F6FA',
  card:         '#FFFFFF',
  border:       '#E4E9F2',

  // Text
  textPrimary:  '#0D1B3E',
  textSecondary:'#5A6A8A',
  textMuted:    '#9AA5BC',

  // User / widget colours (blue, orange, purple, green)
  th:           '#3B82F6',
  thLight:      '#EFF6FF',
  ma:           '#F97316',
  maLight:      '#FFF7ED',
  user3:        '#8B5CF6',
  user3Light:   '#F5F3FF',
  user4:        '#22C55E',
  user4Light:   '#F0FDF4',
};

export const categoryColor: Record<string, string> = {
  Food:         '#F97316',
  Household:    '#06B6D4',
  Car:          '#6366F1',
  Bill:         '#EF4444',
  Baby:         '#EC4899',
  Maintenance:  '#84CC16',
  Other:        '#64748B',
  Fun:          '#FBBF24',
  Subscription: '#8B5CF6',
  Shopping:     '#F43F5E',
  Online:       '#0EA5E9',
  Taxi:         '#14B8A6',
  Medicine:     '#10B981',
  Installment:  '#F59E0B',
  Deposit:      '#22C55E',
};

export const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const MEMBER_PALETTE = [
  { bg: Colors.thLight,    text: Colors.th    },
  { bg: Colors.maLight,    text: Colors.ma    },
  { bg: Colors.user3Light, text: Colors.user3 },
  { bg: Colors.user4Light, text: Colors.user4 },
];

export function memberBadgeColor(nickname: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) hash += nickname.charCodeAt(i);
  return MEMBER_PALETTE[hash % MEMBER_PALETTE.length];
}
