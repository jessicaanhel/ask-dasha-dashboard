import React from 'react';
import { useLocation } from 'react-router-dom';
import { useDasha } from '../../context/DashaContext';
import { COLORS, RADIUS } from '../../theme/tokens';
import { DashaAvatar } from './DashaAvatar';
import { DashaChat } from './DashaChat';

// Floating Dasha in the corner of every page; opens a small chat panel
export const DashaWidget: React.FC = () => {
  const { widgetOpen, setWidgetOpen, streaming } = useDasha();
  const { pathname } = useLocation();

  // The Dasha page already shows the full chat
  if (pathname === '/dasha') return null;

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1000 }}>
      {widgetOpen && (
        <div
          role="dialog"
          aria-label="Chat with Dasha"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 80,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            height: 520,
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.card,
            boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <DashaAvatar size={36} talking={streaming} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Dasha</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                {streaming ? 'typing…' : 'Your dashboard assistant'}
              </div>
            </div>
            <button
              onClick={() => setWidgetOpen(false)}
              aria-label="Close chat"
              style={{
                background: 'transparent',
                border: 'none',
                color: COLORS.textSecondary,
                fontSize: 20,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DashaChat compact />
          </div>
        </div>
      )}

      <button
        onClick={() => setWidgetOpen(!widgetOpen)}
        aria-label={widgetOpen ? 'Close Dasha' : 'Ask Dasha'}
        title="Ask Dasha"
        style={{
          padding: 0,
          border: `2px solid ${COLORS.surface}`,
          borderRadius: '50%',
          background: COLORS.surface,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          cursor: 'pointer',
        }}
      >
        <DashaAvatar size={60} talking={streaming} />
      </button>
    </div>
  );
};
