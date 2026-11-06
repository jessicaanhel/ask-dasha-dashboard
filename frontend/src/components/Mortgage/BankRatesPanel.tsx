import React, { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { Card } from '../UI/Card';
import { thStyle, tdStyle } from '../UI/table';
import { COLORS, RADIUS } from '../../theme/tokens';
import { formatEur } from './YearlyPaymentsChart';

type LoanType = 'annuity' | 'linear';

interface PeriodRate {
  period: number;
  rate: number | null;
}

interface BankProduct {
  id: string;
  provider: string;
  product: string;
  rate: number;
  rates_by_period: PeriodRate[];
}

interface RatesResponse {
  updated_at: string | null;
  products: BankProduct[];
}

// Fixed-rate periods offered by De Hypotheker; 0 = variable
const FIXED_PERIODS = [0, 1, 5, 10, 15, 20, 30];

// Loan-to-value tiers (loan as % of the home's value); 0 = with NHG guarantee
const LTV_TIERS = [50, 60, 70, 80, 90, 100, 106];

const periodLabel = (period: number) => (period === 0 ? 'Variable' : `${period} yr`);

// Smallest tier that still covers the loan, e.g. 93% -> 100%
const autoRateBasis = (loanAmount: number, wozValue: number) => {
  if (wozValue <= 0) return 100;
  const loanToValue = (loanAmount / wozValue) * 100;
  return LTV_TIERS.find((tier) => loanToValue <= tier) ?? 106;
};

// First monthly payment, to compare banks in euro instead of only in %.
// Same formulas as backend/services/mortgage.py, kept here so the table reacts instantly.
const firstMonthlyPayment = (
  loanAmount: number,
  ratePercent: number,
  years: number,
  loanType: LoanType,
) => {
  const months = years * 12;
  const monthlyRate = ratePercent / 100 / 12;
  if (loanType === 'linear') return loanAmount / months + loanAmount * monthlyRate;
  if (monthlyRate === 0) return loanAmount / months;
  const growth = (1 + monthlyRate) ** months;
  return (loanAmount * monthlyRate * growth) / (growth - 1);
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 9,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
  background: active ? COLORS.accent : 'transparent',
  color: active ? COLORS.background : COLORS.textSecondary,
});

const CHART_WIDTH = 360;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 18, right: 8, bottom: 26, left: 40 };

// Selected bank's rate per fixed period (bars) vs the best rate in the market (dots)
const PeriodRatesChart: React.FC<{
  bank: BankProduct;
  bestByPeriod: Map<number, number>;
  activePeriod: number;
}> = ({ bank, bestByPeriod, activePeriod }) => {
  const points = bank.rates_by_period.filter(
    (item): item is { period: number; rate: number } =>
      item.rate !== null && FIXED_PERIODS.includes(item.period),
  );
  if (points.length === 0) return null;

  const allRates = [...points.map((p) => p.rate), ...Array.from(bestByPeriod.values())];
  // Axis starts just below the lowest rate, otherwise all bars look the same height
  const minRate = Math.floor((Math.min(...allRates) - 0.3) * 2) / 2;
  const maxRate = Math.ceil((Math.max(...allRates) + 0.1) * 2) / 2;
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const slot = plotWidth / points.length;
  const barWidth = slot * 0.6;
  const yFor = (rate: number) =>
    CHART_PADDING.top + (1 - (rate - minRate) / (maxRate - minRate)) * plotHeight;
  const ticks = [minRate, (minRate + maxRate) / 2, maxRate];

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {ticks.map((rate) => (
        <g key={rate}>
          <line
            x1={CHART_PADDING.left}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y1={yFor(rate)}
            y2={yFor(rate)}
            stroke={COLORS.border}
          />
          <text
            x={CHART_PADDING.left - 6}
            y={yFor(rate) + 4}
            fontSize={10}
            fill={COLORS.textMuted}
            textAnchor="end"
          >
            {rate.toFixed(1)}%
          </text>
        </g>
      ))}
      {points.map((point, index) => {
        const x = CHART_PADDING.left + index * slot + (slot - barWidth) / 2;
        const best = bestByPeriod.get(point.period);
        const bottom = CHART_PADDING.top + plotHeight;
        const active = point.period === activePeriod;
        return (
          <g key={point.period}>
            <rect
              x={x}
              y={yFor(point.rate)}
              width={barWidth}
              height={bottom - yFor(point.rate)}
              rx={3}
              fill={COLORS.accent}
              opacity={active ? 1 : 0.45}
            />
            <text
              x={x + barWidth / 2}
              y={yFor(point.rate) - 5}
              fontSize={10}
              fill={COLORS.textPrimary}
              textAnchor="middle"
            >
              {point.rate.toFixed(2)}
            </text>
            {best !== undefined && (
              <circle
                cx={x + barWidth / 2}
                cy={yFor(best)}
                r={3.5}
                fill={COLORS.positive}
                stroke={COLORS.surface}
                strokeWidth={1.5}
              />
            )}
            <text
              x={x + barWidth / 2}
              y={CHART_HEIGHT - 8}
              fontSize={10}
              fill={active ? COLORS.textPrimary : COLORS.textMuted}
              textAnchor="middle"
            >
              {point.period === 0 ? 'Var' : `${point.period}y`}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

interface BankRatesPanelProps {
  loanType: LoanType;
  loanAmount: number;
  wozValue: number;
  years: number;
  onUseRate: (ratePercent: number) => void;
}

export const BankRatesPanel: React.FC<BankRatesPanelProps> = ({
  loanType,
  loanAmount,
  wozValue,
  years,
  onUseRate,
}) => {
  const [fixedPeriod, setFixedPeriod] = useState(10);
  // 'auto' picks the loan-to-value tier from loan amount and WOZ value
  const [rateBasisChoice, setRateBasisChoice] = useState<'auto' | number>('auto');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const autoBasis = autoRateBasis(loanAmount, wozValue);
  const rateBasis = rateBasisChoice === 'auto' ? autoBasis : rateBasisChoice;

  const { data, loading, error } = useApi<RatesResponse>(
    `/api/mortgage/rates?loan_type=${loanType}&rate_basis=${rateBasis}&fixed_period=${fixedPeriod}`,
  );
  const products = useMemo(() => data?.products ?? [], [data]);

  // Keep the selection when filters change if that bank is still in the list
  useEffect(() => {
    if (products.length > 0 && !products.some((product) => product.id === selectedId)) {
      setSelectedId(products[0].id);
    }
  }, [products, selectedId]);

  const bestByPeriod = useMemo(() => {
    const best = new Map<number, number>();
    products.forEach((product) =>
      product.rates_by_period.forEach(({ period, rate }) => {
        if (rate !== null && (!best.has(period) || rate < (best.get(period) as number))) {
          best.set(period, rate);
        }
      }),
    );
    return best;
  }, [products]);

  const selected = products.find((product) => product.id === selectedId) ?? products[0];
  const cheapestPayment = products.length
    ? firstMonthlyPayment(loanAmount, products[0].rate, years, loanType)
    : 0;
  const updatedAt = data?.updated_at ? new Date(data.updated_at).toLocaleDateString('nl-NL') : '';

  return (
    <Card style={{ marginTop: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 15 }}>
            Bank rates today
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            {loanType === 'linear' ? 'Linear' : 'Annuity'} mortgage, existing home · source De
            Hypotheker{updatedAt && ` · updated ${updatedAt}`}
          </div>
        </div>
        <select
          aria-label="Rate basis"
          value={rateBasisChoice}
          onChange={(e) =>
            setRateBasisChoice(e.target.value === 'auto' ? 'auto' : Number(e.target.value))
          }
          style={{
            background: COLORS.background,
            color: COLORS.textPrimary,
            border: `1px solid ${COLORS.inputBorder}`,
            borderRadius: RADIUS.input,
            padding: '7px 10px',
            fontSize: 13,
          }}
        >
          <option value="auto">Auto: loan ≤{autoBasis}% of value</option>
          <option value={0}>With NHG guarantee</option>
          {LTV_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              Loan ≤{tier}% of value
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          background: COLORS.background,
          borderRadius: 12,
          padding: 4,
          gap: 2,
          marginBottom: 16,
        }}
      >
        {FIXED_PERIODS.map((period) => (
          <button
            key={period}
            onClick={() => setFixedPeriod(period)}
            style={chipStyle(period === fixedPeriod)}
          >
            {periodLabel(period)}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 13, color: COLORS.negative }}>
          Could not load bank rates right now. Try again later.
        </div>
      )}

      {!error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
            gap: 20,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {/* Comparison table, sorted by rate */}
          <div style={{ maxHeight: 420, overflow: 'auto', minWidth: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, background: COLORS.surface }}>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Bank</th>
                  <th style={thStyle}>Rate</th>
                  <th style={thStyle}>Per month</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => {
                  const payment = firstMonthlyPayment(loanAmount, product.rate, years, loanType);
                  const isSelected = product.id === selected?.id;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedId(product.id)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? COLORS.accentSoft : 'transparent',
                      }}
                    >
                      <td style={{ ...tdStyle, color: COLORS.textMuted }}>{index + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{product.provider}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                          {product.product}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{product.rate.toFixed(2)}%</td>
                      <td style={tdStyle}>
                        {formatEur(payment)}
                        {payment - cheapestPayment >= 1 && (
                          <div style={{ fontSize: 11, color: COLORS.negative }}>
                            +{formatEur(payment - cheapestPayment)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected bank */}
          {selected && (
            <div
              style={{
                background: COLORS.background,
                borderRadius: RADIUS.card,
                padding: 18,
                alignSelf: 'start',
              }}
            >
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 16 }}>
                {selected.provider}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 14 }}>
                {selected.product} · rate per fixed-rate period
              </div>
              <PeriodRatesChart
                bank={selected}
                bestByPeriod={bestByPeriod}
                activePeriod={fixedPeriod}
              />
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 12,
                  color: COLORS.textMuted,
                  margin: '8px 0 16px',
                }}
              >
                <span>
                  <span style={{ color: COLORS.accent }}>■</span> {selected.provider}
                </span>
                <span>
                  <span style={{ color: COLORS.positive }}>●</span> best in market
                </span>
              </div>
              <button
                onClick={() => onUseRate(selected.rate)}
                style={{
                  width: '100%',
                  background: COLORS.accent,
                  color: COLORS.background,
                  border: 'none',
                  borderRadius: RADIUS.input,
                  padding: '11px 16px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                Use {selected.rate.toFixed(2)}% in calculator
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
