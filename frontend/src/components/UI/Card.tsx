import React from 'react';
import { COLORS, RADIUS } from '../../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, style }) => (
  <div
    style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.card,
      padding: 20,
      ...style,
    }}
  >
    {children}
  </div>
);
