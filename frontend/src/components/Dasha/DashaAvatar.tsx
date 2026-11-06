import React from 'react';
import { COLORS } from '../../theme/tokens';

const SKIN = '#f2c7a5';
const HAIR = '#3b2418';
const GLASSES = '#23262f';

// Animations live in one <style> block; class names are prefixed so they can't clash
const ANIMATIONS = `
  .dasha-float { animation: dasha-float 4s ease-in-out infinite; }
  .dasha-eye { transform-box: fill-box; transform-origin: center; animation: dasha-blink 5s infinite; }
  .dasha-glint { animation: dasha-glint 6s ease-in-out infinite; }
  .dasha-mouth-talking { transform-box: fill-box; transform-origin: center; animation: dasha-talk 0.35s ease-in-out infinite; }
  @keyframes dasha-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
  @keyframes dasha-blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.12); } }
  @keyframes dasha-glint { 0%, 70%, 100% { opacity: 0; } 80% { opacity: 0.9; } }
  @keyframes dasha-talk { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
  @media (prefers-reduced-motion: reduce) {
    .dasha-float, .dasha-eye, .dasha-glint, .dasha-mouth-talking { animation: none; }
  }
`;

interface DashaAvatarProps {
  size?: number;
  // Mouth moves while she is writing an answer
  talking?: boolean;
}

// Dasha: an original illustration, a smart woman with a hair bun and round glasses
export const DashaAvatar: React.FC<DashaAvatarProps> = ({ size = 64, talking = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    role="img"
    aria-label="Dasha"
    style={{ display: 'block', flexShrink: 0 }}
  >
    <style>{ANIMATIONS}</style>
    <circle cx="60" cy="60" r="60" fill={COLORS.accentSoft} />

    <g className="dasha-float">
      {/* Blazer and collar */}
      <path d="M22 120c2-22 18-33 38-33s36 11 38 33z" fill={COLORS.accent} />
      <path d="M50 88l10 16 10-16" fill="#ffffff" />
      <rect x="53" y="76" width="14" height="14" rx="6" fill={SKIN} />

      {/* Hair behind the head, then the bun on top */}
      <ellipse cx="60" cy="54" rx="29" ry="31" fill={HAIR} />
      <circle cx="60" cy="20" r="12" fill={HAIR} />
      <path d="M50 24c6 3 14 3 20 0" stroke="#5a3826" strokeWidth="2" fill="none" />

      {/* Face */}
      <ellipse cx="60" cy="57" rx="23" ry="26" fill={SKIN} />
      <circle cx="44" cy="66" r="4.5" fill="#f0a39a" opacity="0.45" />
      <circle cx="76" cy="66" r="4.5" fill="#f0a39a" opacity="0.45" />

      {/* Side-swept fringe */}
      <path d="M36 50c2-17 14-25 28-24 10 1 18 7 20 18-9-7-22-9-34-4-6 3-11 7-14 10z" fill={HAIR} />

      {/* Eyes */}
      <ellipse className="dasha-eye" cx="50" cy="58" rx="2.6" ry="3.2" fill="#2a1d17" />
      <ellipse className="dasha-eye" cx="70" cy="58" rx="2.6" ry="3.2" fill="#2a1d17" />
      <path
        d="M45 50.5q5-3 10 0M65 50.5q5-3 10 0"
        stroke={HAIR}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Round glasses */}
      <circle
        cx="50"
        cy="58"
        r="8.5"
        fill="rgba(255,255,255,0.18)"
        stroke={GLASSES}
        strokeWidth="2.4"
      />
      <circle
        cx="70"
        cy="58"
        r="8.5"
        fill="rgba(255,255,255,0.18)"
        stroke={GLASSES}
        strokeWidth="2.4"
      />
      <path d="M58.5 57.5q1.5-2 3 0" stroke={GLASSES} strokeWidth="2.2" fill="none" />
      <path d="M41.5 56.5l-5-2M78.5 56.5l5-2" stroke={GLASSES} strokeWidth="2" />
      <path
        className="dasha-glint"
        d="M44 54l4-3M64 54l4-3"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Mouth: a smile, or an open mouth while talking */}
      {talking ? (
        <ellipse className="dasha-mouth-talking" cx="60" cy="72" rx="4" ry="3" fill="#a3423f" />
      ) : (
        <path
          d="M54 70q6 5 12 0"
          stroke="#a3423f"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </g>
  </svg>
);
