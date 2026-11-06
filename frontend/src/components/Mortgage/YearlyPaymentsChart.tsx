import React, { useState } from 'react';
import { COLORS } from '../../theme/tokens';
import { formatCompactNumber } from '../../utils/format';

export interface MortgageYear {
  year: number;
  months: number;
  paid: number;
  interest_paid: number;
  principal_paid: number;
  tax_refund: number;
  net_paid: number;
  avg_net_payment: number;
  remaining_balance: number;
}

export const PRINCIPAL_COLOR = COLORS.accent;
export const INTEREST_COLOR = '#f0b429';
export const TAX_REFUND_COLOR = COLORS.negative;

const WIDTH = 720;
const HEIGHT = 280;
const PADDING = { top: 12, right: 8, bottom: 28, left: 52 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const BAR_GAP = 3;

export const formatEur = (value: number) =>
  `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`;

// Round the axis max up to a clean number, e.g. 29 300 -> 30 000
const niceMax = (value: number) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
};

/*
 * Stacked bars per year, bottom to top:
 *   principal (blue) | interest you really pay (yellow) | tax refund (red)
 * Yellow + red together is the full interest paid to the bank; the red part comes back
 * from the Belastingdienst. Bar height is everything paid to the bank that year.
 */
// Same yearly bars, but each amount divided by the months in that year (the last year can be short)
const toMonthlyAverage = (row: MortgageYear): MortgageYear => ({
  ...row,
  paid: row.paid / row.months,
  interest_paid: row.interest_paid / row.months,
  principal_paid: row.principal_paid / row.months,
  tax_refund: row.tax_refund / row.months,
  net_paid: row.net_paid / row.months,
});

interface YearlyPaymentsChartProps {
  yearly: MortgageYear[];
  perMonth?: boolean;
}

export const YearlyPaymentsChart: React.FC<YearlyPaymentsChartProps> = ({
  yearly: yearlyTotals,
  perMonth = false,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const yearly = perMonth ? yearlyTotals.map(toMonthlyAverage) : yearlyTotals;

  if (yearly.length === 0) return null;

  const maxValue = niceMax(Math.max(...yearly.map((row) => row.paid)));
  const slotWidth = PLOT_WIDTH / yearly.length;
  const barWidth = Math.max(slotWidth - BAR_GAP, 1);
  const heightFor = (value: number) => (value / maxValue) * PLOT_HEIGHT;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * maxValue);
  const labelEvery = yearly.length > 24 ? 5 : yearly.length > 12 ? 3 : 1;

  const hovered = hoverIndex !== null ? yearly[hoverIndex] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((value) => {
          const y = PADDING.top + PLOT_HEIGHT - heightFor(value);
          return (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke={COLORS.border}
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                fontSize={11}
                fill={COLORS.textMuted}
                textAnchor="end"
              >
                €{formatCompactNumber(value)}
              </text>
            </g>
          );
        })}

        {yearly.map((row, index) => {
          const x = PADDING.left + index * slotWidth + BAR_GAP / 2;
          const bottom = PADDING.top + PLOT_HEIGHT;
          const principalHeight = heightFor(row.principal_paid);
          const ownInterestHeight = heightFor(row.interest_paid - row.tax_refund);
          const refundHeight = heightFor(row.tax_refund);
          const dimmed = hoverIndex !== null && hoverIndex !== index;

          return (
            <g key={row.year} opacity={dimmed ? 0.45 : 1} onMouseEnter={() => setHoverIndex(index)}>
              {/* Invisible full-height rect so hovering empty space above a bar still works */}
              <rect
                x={x}
                y={PADDING.top}
                width={barWidth}
                height={PLOT_HEIGHT}
                fill="transparent"
              />
              <rect
                x={x}
                y={bottom - principalHeight}
                width={barWidth}
                height={principalHeight}
                fill={PRINCIPAL_COLOR}
              />
              <rect
                x={x}
                y={bottom - principalHeight - ownInterestHeight}
                width={barWidth}
                height={ownInterestHeight}
                fill={INTEREST_COLOR}
              />
              <rect
                x={x}
                y={bottom - principalHeight - ownInterestHeight - refundHeight}
                width={barWidth}
                height={refundHeight}
                fill={TAX_REFUND_COLOR}
              />
              {(index % labelEvery === 0 || index === yearly.length - 1) && (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 8}
                  fontSize={11}
                  fill={COLORS.textMuted}
                  textAnchor="middle"
                >
                  Yr {row.year}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hovered && hoverIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            // Flip the tooltip to the left side of the bar in the right half of the chart
            ...(hoverIndex < yearly.length / 2
              ? { left: `${((hoverIndex + 1) / yearly.length) * 88 + 8}%` }
              : { right: `${((yearly.length - hoverIndex) / yearly.length) * 88 + 2}%` }),
            background: COLORS.background,
            border: `1px solid ${COLORS.inputBorder}`,
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 12,
            lineHeight: 1.7,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            Year {hovered.year}
            {perMonth && ' · per month'}
            {hovered.months < 12 && ` (${hovered.months} mo)`}
          </div>
          <div style={{ color: PRINCIPAL_COLOR }}>
            Principal {formatEur(hovered.principal_paid)}
          </div>
          <div style={{ color: INTEREST_COLOR }}>Interest {formatEur(hovered.interest_paid)}</div>
          <div style={{ color: TAX_REFUND_COLOR }}>Tax refund −{formatEur(hovered.tax_refund)}</div>
          <div>Net / month {formatEur(hovered.avg_net_payment)}</div>
          <div style={{ color: COLORS.textMuted }}>Left {formatEur(hovered.remaining_balance)}</div>
        </div>
      )}
    </div>
  );
};
