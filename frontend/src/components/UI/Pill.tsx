import React from 'react';
import { RADIUS } from '../../theme/tokens';

interface PillProps {
  children: React.ReactNode;
  color: string;
  background: string;
  style?: React.CSSProperties;
}

export const Pill: React.FC<PillProps> = ({ children, color, background, style }) => (
  <span
    style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '4px 12px',
      borderRadius: RADIUS.pill,
      background,
      color,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);
