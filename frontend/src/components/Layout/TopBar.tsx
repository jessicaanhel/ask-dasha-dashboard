import React from 'react';
import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
  '/mortgage': 'Mortgage Calculator',
  '/dasha': 'Ask Dasha',
};

export const TopBar: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <div style={{ padding: '26px 36px 20px' }}>
      <h2
        style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        {TITLES[pathname] ?? ''}
      </h2>
    </div>
  );
};
