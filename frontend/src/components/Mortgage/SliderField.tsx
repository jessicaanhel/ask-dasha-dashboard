import React from 'react';
import { COLORS, RADIUS } from '../../theme/tokens';

interface SliderFieldProps {
  label: string;
  // Kept as a string so the user can clear the input and type a new number
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

export const SliderField: React.FC<SliderFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}) => {
  const numericValue = Number(value);
  // A typed value can go past the slider range; the slider then just sits at its end
  const sliderValue = Number.isFinite(numericValue)
    ? Math.min(Math.max(numericValue, min), max)
    : min;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <label style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 600 }}>
          {label}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            value={value}
            min={0}
            step={step}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: 110,
              background: COLORS.background,
              border: `1px solid ${COLORS.inputBorder}`,
              borderRadius: RADIUS.input,
              padding: '7px 10px',
              color: COLORS.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'right',
            }}
          />
          {suffix && <span style={{ fontSize: 13, color: COLORS.textMuted }}>{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', accentColor: COLORS.accent, cursor: 'pointer' }}
      />
    </div>
  );
};
