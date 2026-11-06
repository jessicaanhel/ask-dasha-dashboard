import React, { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Card } from '../components/UI/Card';
import { Pill } from '../components/UI/Pill';
import { thStyle, tdStyle } from '../components/UI/table';
import { SliderField } from '../components/Mortgage/SliderField';
import { MilestonesTable, MortgageMilestone } from '../components/Mortgage/MilestonesTable';
import { BankRatesPanel } from '../components/Mortgage/BankRatesPanel';
import { AreaPanel } from '../components/Mortgage/AreaPanel';
import {
  MortgageYear,
  YearlyPaymentsChart,
  formatEur,
  PRINCIPAL_COLOR,
  INTEREST_COLOR,
  TAX_REFUND_COLOR,
} from '../components/Mortgage/YearlyPaymentsChart';
import { COLORS } from '../theme/tokens';
import { useDashaPageData } from '../context/DashaContext';

type LoanType = 'annuity' | 'linear';

interface MortgageResponse {
  summary: {
    first_payment: number;
    last_payment: number;
    first_net_payment: number;
    last_net_payment: number;
    payoff_months: number;
    total_interest: number;
    total_paid: number;
    total_tax_refund: number;
    total_net_paid: number;
    interest_saved: number;
    months_saved: number;
  };
  yearly: MortgageYear[];
  milestones: MortgageMilestone[];
}

// Values are strings so inputs can be cleared while typing; percentages are entered as e.g. 4.1
interface Inputs {
  loanAmount: string;
  interestPercent: string;
  years: string;
  extraPayment: string;
  wozValue: string;
  taxPercent: string;
  // Only for the "if I sell after N years" projection
  purchasePrice: string;
  priceGrowthPercent: string;
  buyingCostsPercent: string;
  sellingCostsPercent: string;
}

const DEFAULT_INPUTS: Inputs = {
  loanAmount: '420000',
  interestPercent: '4.1',
  years: '30',
  extraPayment: '0',
  wozValue: '450000',
  taxPercent: '37.56',
  purchasePrice: '450000',
  priceGrowthPercent: '3',
  buyingCostsPercent: '4',
  sellingCostsPercent: '1.5',
};

const LOAN_TYPES: { id: LoanType; label: string; hint: string }[] = [
  { id: 'annuity', label: 'Annuity', hint: 'Same payment every month' },
  { id: 'linear', label: 'Linear', hint: 'Same principal every month, payment goes down' },
];

interface FieldConfig {
  key: keyof Inputs;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

const FIELDS: FieldConfig[] = [
  { key: 'loanAmount', label: 'Loan amount', min: 50000, max: 1500000, step: 5000, suffix: '€' },
  {
    key: 'interestPercent',
    label: 'Annual interest rate',
    min: 0,
    max: 10,
    step: 0.05,
    suffix: '%',
  },
  // Dutch mortgage interest is only deductible for 30 years, so that's the max term
  { key: 'years', label: 'Loan term', min: 5, max: 30, step: 1, suffix: 'yrs' },
  {
    key: 'extraPayment',
    label: 'Extra repayment per month (aflossen)',
    min: 0,
    max: 3000,
    step: 25,
    suffix: '€/mo',
  },
  { key: 'wozValue', label: 'WOZ value', min: 0, max: 1500000, step: 5000, suffix: '€' },
  { key: 'taxPercent', label: 'Tax deduction rate', min: 0, max: 49.5, step: 0.01, suffix: '%' },
];

const SALE_FIELDS: FieldConfig[] = [
  {
    key: 'purchasePrice',
    label: 'Purchase price',
    min: 50000,
    max: 1500000,
    step: 5000,
    suffix: '€',
  },
  // Dutch house prices: roughly 3-5% a year long term, but they can also drop
  {
    key: 'priceGrowthPercent',
    label: 'House price growth / year',
    min: -5,
    max: 10,
    step: 0.1,
    suffix: '%',
  },
  // Transfer tax 2% (0% for starters under 35) + notary, valuation, advice
  {
    key: 'buyingCostsPercent',
    label: 'Buying costs (kosten koper)',
    min: 0,
    max: 10,
    step: 0.1,
    suffix: '%',
  },
  {
    key: 'sellingCostsPercent',
    label: 'Selling costs (agent, notary)',
    min: 0,
    max: 5,
    step: 0.1,
    suffix: '%',
  },
];

const DEBOUNCE_MS = 200;

const isValidNumber = (value: string) => value.trim() !== '' && Number.isFinite(Number(value));

const buildEndpoint = (inputs: Inputs, loanType: LoanType) => {
  const params = new URLSearchParams({
    loan_type: loanType,
    loan_amount: inputs.loanAmount,
    interest_rate: String(Number(inputs.interestPercent) / 100),
    years: inputs.years,
    extra_payment: inputs.extraPayment,
    woz_value: inputs.wozValue,
    tax_rate: String(Number(inputs.taxPercent) / 100),
    purchase_price: inputs.purchasePrice,
    price_growth: String(Number(inputs.priceGrowthPercent) / 100),
    buying_costs: String(Number(inputs.buyingCostsPercent) / 100),
    selling_costs: String(Number(inputs.sellingCostsPercent) / 100),
  });
  return `/api/mortgage?${params.toString()}`;
};

const formatDuration = (months: number) => {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return `${years} yr`;
  if (years === 0) return `${rest} mo`;
  return `${years} yr ${rest} mo`;
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "'Manrope', sans-serif",
  fontWeight: 600,
  fontSize: 15,
  marginBottom: 4,
};

const Stat: React.FC<{ label: string; value: string; hint?: string; color?: string }> = ({
  label,
  value,
  hint,
  color,
}) => (
  <div>
    <div style={{ fontSize: 12, color: COLORS.textLabel, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontFamily: "'Manrope', sans-serif", fontWeight: 600, color }}>
      {value}
    </div>
    {hint && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{hint}</div>}
  </div>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 18 }}>
    <span style={{ width: 12, height: 12, borderRadius: 4, background: color }} />
    {label}
  </span>
);

const LoanTypeToggle: React.FC<{ value: LoanType; onChange: (value: LoanType) => void }> = ({
  value,
  onChange,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
    <div
      role="radiogroup"
      aria-label="Loan type"
      style={{
        display: 'flex',
        background: COLORS.background,
        borderRadius: 12,
        padding: 4,
        gap: 2,
      }}
    >
      {LOAN_TYPES.map((type) => {
        const active = type.id === value;
        return (
          <button
            key={type.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(type.id)}
            style={{
              padding: '7px 16px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'inherit',
              background: active ? COLORS.accent : 'transparent',
              color: active ? COLORS.background : COLORS.textSecondary,
            }}
          >
            {type.label}
          </button>
        );
      })}
    </div>
    <span style={{ fontSize: 12, color: COLORS.textMuted }}>
      {LOAN_TYPES.find((type) => type.id === value)?.hint}
    </span>
  </div>
);

export const Mortgage: React.FC = () => {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [loanType, setLoanType] = useState<LoanType>('annuity');
  const [showTable, setShowTable] = useState(false);
  const [planToSell, setPlanToSell] = useState(false);
  const [chartPerMonth, setChartPerMonth] = useState(false);

  const updateInput = (key: keyof Inputs, value: string) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  // Recalculate shortly after the user stops dragging/typing, not on every slider tick
  const debouncedInputs = useDebouncedValue(inputs, DEBOUNCE_MS);
  const allValid = Object.values(debouncedInputs).every(isValidNumber);
  const { data, loading, error } = useApi<MortgageResponse>(
    buildEndpoint(debouncedInputs, loanType),
    { enabled: allValid },
  );

  const summary = data?.summary;
  const yearly = data?.yearly ?? [];
  const milestones = data?.milestones ?? [];
  const extraPayment = Number(inputs.extraPayment) || 0;
  // Payment without the extra, so the extra can be shown separately as a pill
  const basePayment = summary ? summary.first_payment - extraPayment : 0;

  // What Dasha sees when asked about this page (inputs as shown, plus the calculated results)
  const dashaData = useMemo(
    () => ({
      page: 'Mortgage calculator (amounts in EUR)',
      loan_type: loanType,
      inputs: debouncedInputs,
      plan_to_sell: planToSell,
      summary,
      after_each_5_years: data?.milestones ?? [],
    }),
    [loanType, debouncedInputs, planToSell, summary, data?.milestones],
  );
  useDashaPageData(dashaData);

  return (
    <div style={{ maxWidth: 1000 }}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Summary */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 24,
            padding: '22px 24px',
            borderBottom: `1px solid ${COLORS.border}`,
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: COLORS.textLabel, marginBottom: 4 }}>
              {loanType === 'linear' ? 'First monthly payment' : 'Monthly payment'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 30, fontFamily: "'Manrope', sans-serif", fontWeight: 700 }}>
                {summary ? formatEur(basePayment) : '—'}
              </span>
              {extraPayment > 0 && (
                <Pill background="rgba(52,209,161,0.16)" color={COLORS.positive}>
                  +{formatEur(extraPayment)} extra
                </Pill>
              )}
            </div>
            {summary && (
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.6 }}>
                Net after tax refund{' '}
                <span style={{ color: COLORS.positive, fontWeight: 600 }}>
                  {formatEur(summary.first_net_payment)}
                </span>{' '}
                in month 1
                {loanType === 'linear' && (
                  <div>Goes down to {formatEur(summary.last_payment)} in the last month</div>
                )}
              </div>
            )}
          </div>

          {summary && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
              <Stat
                label="Total interest"
                value={formatEur(summary.total_interest)}
                color={INTEREST_COLOR}
                hint={
                  summary.interest_saved > 0
                    ? `saves ${formatEur(summary.interest_saved)}`
                    : undefined
                }
              />
              <Stat
                label="Tax refund"
                value={`−${formatEur(summary.total_tax_refund)}`}
                color={TAX_REFUND_COLOR}
              />
              <Stat label="Total payments" value={formatEur(summary.total_paid)} />
              <Stat
                label="Payoff time"
                value={formatDuration(summary.payoff_months)}
                hint={
                  summary.months_saved > 0
                    ? `${formatDuration(summary.months_saved)} sooner`
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {chartPerMonth ? 'Paid per month (average per year)' : 'Paid per year'}
            </span>
            <div
              role="radiogroup"
              aria-label="Chart amounts"
              style={{
                display: 'flex',
                background: COLORS.background,
                borderRadius: 10,
                padding: 3,
              }}
            >
              {[
                { perMonth: false, label: 'Per year' },
                { perMonth: true, label: 'Per month' },
              ].map((option) => {
                const active = option.perMonth === chartPerMonth;
                return (
                  <button
                    key={option.label}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setChartPerMonth(option.perMonth)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      fontFamily: 'inherit',
                      background: active ? COLORS.accent : 'transparent',
                      color: active ? COLORS.background : COLORS.textSecondary,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>
            <LegendItem color={PRINCIPAL_COLOR} label="Principal (loan)" />
            <LegendItem color={INTEREST_COLOR} label="Interest you pay (net)" />
            <LegendItem color={TAX_REFUND_COLOR} label="Interest returned as tax refund" />
          </div>
          <YearlyPaymentsChart yearly={yearly} perMonth={chartPerMonth} />
          {(error || !allValid) && (
            <div style={{ fontSize: 12, color: COLORS.negative, marginTop: 8 }}>
              Some values are out of range — showing the last valid result.
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ padding: '22px 24px' }}>
          <div style={{ marginBottom: 22 }}>
            <LoanTypeToggle value={loanType} onChange={setLoanType} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: '22px 40px',
            }}
          >
            {FIELDS.map((field) => (
              <SliderField
                key={field.key}
                label={field.label}
                value={inputs[field.key]}
                onChange={(value) => updateInput(field.key, value)}
                min={field.min}
                max={field.max}
                step={field.step}
                suffix={field.suffix}
              />
            ))}
          </div>
        </div>
      </Card>

      {milestones.length > 0 && (
        <Card style={{ marginTop: 20 }}>
          <div style={sectionTitleStyle}>Loan vs interest over time</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
            How much of what you paid went to the loan itself, and how much to the bank as interest.
          </div>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: planToSell ? 16 : 12,
            }}
          >
            <input
              type="checkbox"
              checked={planToSell}
              onChange={(e) => setPlanToSell(e.target.checked)}
              style={{ accentColor: COLORS.accent }}
            />
            I plan to sell — show profit if I sell after 5, 10, 15… years
          </label>
          {planToSell && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
                gap: '18px 32px',
                marginBottom: 18,
              }}
            >
              {SALE_FIELDS.map((field) => (
                <SliderField
                  key={field.key}
                  label={field.label}
                  value={inputs[field.key]}
                  onChange={(value) => updateInput(field.key, value)}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  suffix={field.suffix}
                />
              ))}
            </div>
          )}
          {planToSell && (
            <AreaPanel
              onUseGrowth={(percent) => updateInput('priceGrowthPercent', String(percent))}
              onUseWoz={(value) => updateInput('wozValue', String(Math.round(value)))}
            />
          )}
          <MilestonesTable milestones={milestones} showSale={planToSell} />
          {planToSell && (
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 10 }}>
              Profit = cash from the sale − own money at purchase (price + buying costs − loan) −
              all net monthly payments. Rent you would otherwise pay is not included, so a small
              loss can still beat renting.
            </div>
          )}
        </Card>
      )}

      <BankRatesPanel
        loanType={loanType}
        loanAmount={Number(debouncedInputs.loanAmount) || 0}
        wozValue={Number(debouncedInputs.wozValue) || 0}
        years={Number(debouncedInputs.years) || 30}
        onUseRate={(rate) => updateInput('interestPercent', String(rate))}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 4px' }}>
        <div style={{ fontSize: 12, color: COLORS.textMuted, maxWidth: 620 }}>
          All amounts in euro. Estimate only: the tax refund (hypotheekrenteaftrek minus
          eigenwoningforfait) is settled yearly, so monthly net amounts are approximate.
        </div>
        <button
          onClick={() => setShowTable((value) => !value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8fa8ff',
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {showTable ? 'Hide' : 'Show'} yearly schedule
        </button>
      </div>

      {showTable && (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Year</th>
                  <th style={thStyle}>Principal</th>
                  <th style={thStyle}>Interest</th>
                  <th style={thStyle}>Tax refund</th>
                  <th style={thStyle}>Net paid</th>
                  <th style={thStyle}>Net / month</th>
                  <th style={thStyle}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {yearly.map((row) => (
                  <tr key={row.year}>
                    <td style={tdStyle}>{row.year}</td>
                    <td style={tdStyle}>{formatEur(row.principal_paid)}</td>
                    <td style={tdStyle}>{formatEur(row.interest_paid)}</td>
                    <td style={{ ...tdStyle, color: TAX_REFUND_COLOR }}>
                      −{formatEur(row.tax_refund)}
                    </td>
                    <td style={tdStyle}>{formatEur(row.net_paid)}</td>
                    <td style={tdStyle}>{formatEur(row.avg_net_payment)}</td>
                    <td style={tdStyle}>{formatEur(row.remaining_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Mortgage;
