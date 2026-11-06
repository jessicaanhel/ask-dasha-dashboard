import React from 'react';
import { Card } from '../components/UI/Card';
import { DashaAvatar } from '../components/Dasha/DashaAvatar';
import { DashaChat } from '../components/Dasha/DashaChat';
import { useDasha } from '../context/DashaContext';
import { COLORS } from '../theme/tokens';

export const Dasha: React.FC = () => {
  const { streaming } = useDasha();

  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 20, maxWidth: 1000, alignItems: 'start' }}
    >
      <Card style={{ textAlign: 'center', padding: 28, flex: '1 1 240px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <DashaAvatar size={150} talking={streaming} />
        </div>
        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 20 }}>
          Dasha
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.6 }}>
          Your dashboard assistant. She knows every tab and sees the numbers on the page you came
          from, so you can ask things like "why is linear cheaper?" or "what if I sell in 10
          years?". The same chat is in the corner of every page.
        </div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 14 }}>
          Runs on Claude. Not financial or tax advice.
        </div>
      </Card>

      <Card style={{ height: 'min(640px, calc(100vh - 160px))', flex: '2 1 380px', minWidth: 0 }}>
        <DashaChat />
      </Card>
    </div>
  );
};

export default Dasha;
