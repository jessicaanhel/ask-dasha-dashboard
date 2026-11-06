import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDasha } from '../../context/DashaContext';
import { COLORS, RADIUS } from '../../theme/tokens';
import { DashaAvatar } from './DashaAvatar';

// Starter questions that fit the page the user is on
const SUGGESTIONS: Record<string, string[]> = {
  '/mortgage': [
    'Annuity or linear: which is cheaper for me?',
    'Explain my net monthly payment',
    'Is paying €300 extra per month worth it?',
    'When would selling make a profit?',
  ],
  '/fiat': ['Which bank has the best EUR rate today?', 'What does the 24h change mean?'],
  '/crypto': ['Summarise the market today', 'What is the smart flow score?'],
};
const DEFAULT_SUGGESTIONS = ['What can you help me with?', 'Explain this page'];

interface DashaChatProps {
  // Compact: inside the floating widget. Otherwise: full Dasha page.
  compact?: boolean;
}

export const DashaChat: React.FC<DashaChatProps> = ({ compact = false }) => {
  const { messages, streaming, error, send, clear } = useDasha();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const suggestions = SUGGESTIONS[pathname] ?? DEFAULT_SUGGESTIONS;

  // Keep the newest text in view while the answer streams in
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const submit = () => {
    if (!draft.trim() || streaming) return;
    send(draft);
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: compact ? 14 : 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <DashaAvatar size={34} />
            <div style={bubbleStyle('assistant')}>
              Hi, I'm Dasha! I can see the numbers on the page you're on, so ask me about them.
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isTyping = isLast && streaming && message.role === 'assistant';
          return message.role === 'assistant' ? (
            <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <DashaAvatar size={34} talking={isTyping} />
              <div style={bubbleStyle('assistant')}>{message.content || '…'}</div>
            </div>
          ) : (
            <div key={index} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={bubbleStyle('user')}>{message.content}</div>
            </div>
          );
        })}

        {error && (
          <div style={{ fontSize: 12, color: COLORS.negative, padding: '0 4px' }}>{error}</div>
        )}

        {messages.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => send(suggestion)} style={chipStyle}>
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: compact ? 12 : '14px 0 0',
          borderTop: compact ? `1px solid ${COLORS.border}` : 'none',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={draft}
          rows={1}
          placeholder="Ask Dasha…"
          aria-label="Message to Dasha"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          style={{
            flex: 1,
            resize: 'none',
            maxHeight: 120,
            background: COLORS.background,
            color: COLORS.textPrimary,
            border: `1px solid ${COLORS.inputBorder}`,
            borderRadius: RADIUS.input,
            padding: '10px 12px',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={submit}
          disabled={streaming || !draft.trim()}
          style={{
            background: COLORS.accent,
            color: COLORS.background,
            border: 'none',
            borderRadius: RADIUS.input,
            padding: '10px 16px',
            fontWeight: 700,
            fontSize: 14,
            cursor: streaming ? 'wait' : 'pointer',
            opacity: streaming || !draft.trim() ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          Send
        </button>
        {messages.length > 0 && (
          <button
            onClick={clear}
            disabled={streaming}
            title="Start a new conversation"
            style={{ ...chipStyle, padding: '10px 12px', borderRadius: RADIUS.input }}
          >
            New
          </button>
        )}
      </div>
    </div>
  );
};

const bubbleStyle = (role: 'user' | 'assistant'): React.CSSProperties => ({
  maxWidth: '82%',
  padding: '9px 13px',
  borderRadius: 14,
  fontSize: 14,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  background: role === 'user' ? COLORS.accent : COLORS.pillMutedBg,
  color: role === 'user' ? COLORS.background : COLORS.textPrimary,
  borderTopLeftRadius: role === 'assistant' ? 4 : 14,
  borderTopRightRadius: role === 'user' ? 4 : 14,
});

const chipStyle: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${COLORS.inputBorder}`,
  color: COLORS.textSecondary,
  borderRadius: RADIUS.pill,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'left',
};
