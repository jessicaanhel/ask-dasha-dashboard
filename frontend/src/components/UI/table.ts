import type { CSSProperties } from 'react';
import { COLORS } from '../../theme/tokens';

export const thStyle: CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: COLORS.textMuted,
  padding: '10px 12px',
  borderBottom: `1px solid ${COLORS.border}`,
};

export const tdStyle: CSSProperties = {
  padding: 12,
  borderBottom: `1px solid ${COLORS.borderSubtle}`,
};
