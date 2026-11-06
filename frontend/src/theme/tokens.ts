// Ask Dasha uses one light theme
export const COLORS = {
  background: '#f4f5f8',
  surface: '#ffffff',
  border: 'rgba(15,20,30,0.08)',
  borderSubtle: 'rgba(15,20,30,0.05)',
  textPrimary: '#151922',
  textSecondary: '#4a5060',
  textMuted: '#767c8a',
  textLabel: '#5e6573',
  accent: '#4a6cf7',
  accentSoft: 'rgba(74,108,247,0.12)',
  accentText: '#2340b8',
  positive: '#0e9a71',
  negative: '#e04848',
  pillMutedBg: 'rgba(15,20,30,0.06)',
  pillMutedText: '#3d4350',
  inputBorder: 'rgba(15,20,30,0.14)',
};

export const RADIUS = {
  card: 18,
  input: 12,
  pill: 999,
};

export const FONT = "'Manrope', system-ui, sans-serif";

export const changeColor = (value: number) => (value >= 0 ? COLORS.positive : COLORS.negative);
