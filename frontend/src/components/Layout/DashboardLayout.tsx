import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { COLORS } from '../../theme/tokens';
import { DashaProvider } from '../../context/DashaContext';
import { DashaWidget } from '../Dasha/DashaWidget';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const DashboardLayout: React.FC = () => {
  // Start collapsed on phones, the sidebar would take half the screen otherwise
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 700);

  return (
    <DashaProvider>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          background: COLORS.background,
          color: COLORS.textPrimary,
        }}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TopBar />
          <div style={{ flex: 1, overflow: 'auto', padding: '6px 24px 36px' }}>
            <Outlet />
          </div>
        </div>
        <DashaWidget />
      </div>
    </DashaProvider>
  );
};
