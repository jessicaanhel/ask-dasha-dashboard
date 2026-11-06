import React from 'react';
import { NavLink } from 'react-router-dom';
import { COLORS } from '../../theme/tokens';
import { DashaAvatar } from '../Dasha/DashaAvatar';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
};

// New tools get a line here and a route in App.tsx
const NAV_ITEMS: NavItem[] = [
  {
    to: '/mortgage',
    label: 'Mortgage',
    icon: (
      <svg {...iconProps}>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-5h4v5" />
      </svg>
    ),
  },
  {
    to: '/dasha',
    label: 'Ask Dasha',
    icon: (
      <svg {...iconProps}>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" />
      </svg>
    ),
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapsed }) => (
  <div
    style={{
      width: collapsed ? 72 : 220,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
      background: COLORS.surface,
      borderRight: `1px solid ${COLORS.border}`,
      transition: 'width 0.15s ease',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px 24px' }}>
      <DashaAvatar size={36} />
      {!collapsed && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Ask Dasha</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>she helps with the numbers</div>
        </div>
      )}
    </div>

    {NAV_ITEMS.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '2px 12px',
          padding: collapsed ? '10px 0' : '10px 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          color: isActive ? COLORS.accentText : COLORS.textSecondary,
          background: isActive ? COLORS.accentSoft : 'transparent',
        })}
      >
        {item.icon}
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    ))}

    <button
      onClick={onToggleCollapsed}
      style={{
        marginTop: 'auto',
        marginLeft: 20,
        alignSelf: 'flex-start',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        color: COLORS.textMuted,
        fontFamily: 'inherit',
      }}
    >
      {collapsed ? '»' : '« Collapse'}
    </button>
  </div>
);
