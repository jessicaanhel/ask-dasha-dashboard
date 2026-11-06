import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { COLORS, RADIUS } from '../../theme/tokens';
import { formatEur } from './YearlyPaymentsChart';

interface PriceSummary {
  latest_year: number;
  latest_price: number;
  growth_5y_pct: number | null;
  growth_10y_pct: number | null;
}

interface AreaResponse {
  postcode: string;
  place: string | null;
  municipality: string | null;
  woz_history: { year: number; avg_woz: number }[];
  growth: {
    from_year: number;
    to_year: number;
    avg_yearly_pct: number | null;
    last_year_pct: number | null;
  } | null;
  facts: {
    year: number;
    homes: number | null;
    residents: number | null;
    owner_occupied_pct: number | null;
    rented_pct: number | null;
    apartments: number | null;
    avg_gas_m3: number | null;
    avg_electricity_kwh: number | null;
    build_years: { period: string; homes: number }[];
  };
  sale_prices: {
    netherlands: PriceSummary | null;
    municipality: PriceSummary | null;
  };
}

interface AreaPanelProps {
  onUseGrowth: (percent: number) => void;
  onUseWoz: (value: number) => void;
}

const formatPct = (value: number | null) =>
  value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const formatNumber = (value: number | null) =>
  value === null ? '—' : value.toLocaleString('nl-NL');

const smallButtonStyle: React.CSSProperties = {
  background: COLORS.accentSoft,
  color: COLORS.accentText,
  border: 'none',
  borderRadius: 8,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// One "growth per year" suggestion: postcode, city or the whole country
const GrowthCard: React.FC<{
  title: string;
  subtitle: string;
  options: { label: string; pct: number | null }[];
  onUse: (percent: number) => void;
}> = ({ title, subtitle, options, onUse }) => (
  <div
    style={{
      background: COLORS.background,
      borderRadius: RADIUS.input,
      padding: 14,
      flex: '1 1 180px',
    }}
  >
    <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 10 }}>{subtitle}</div>
    {options.map((option) => (
      <div
        key={option.label}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
          {option.label}{' '}
          <b style={{ color: COLORS.textPrimary, fontSize: 14 }}>{formatPct(option.pct)}</b>
        </span>
        {option.pct !== null && (
          <button onClick={() => onUse(option.pct as number)} style={smallButtonStyle}>
            Use
          </button>
        )}
      </div>
    ))}
  </div>
);

const CHART_WIDTH = 420;
const CHART_HEIGHT = 150;

// Average WOZ value per year for the postcode
const WozHistoryChart: React.FC<{ history: { year: number; avg_woz: number }[] }> = ({
  history,
}) => {
  if (history.length === 0) return null;
  const maxValue = Math.max(...history.map((item) => item.avg_woz));
  const slot = CHART_WIDTH / history.length;
  const barWidth = slot * 0.62;
  const plotTop = 18;
  const plotBottom = CHART_HEIGHT - 20;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {history.map((item, index) => {
        const height = (item.avg_woz / maxValue) * (plotBottom - plotTop);
        const x = index * slot + (slot - barWidth) / 2;
        return (
          <g key={item.year}>
            <rect
              x={x}
              y={plotBottom - height}
              width={barWidth}
              height={height}
              rx={3}
              fill={COLORS.accent}
              opacity={index === history.length - 1 ? 1 : 0.55}
            />
            <text
              x={x + barWidth / 2}
              y={plotBottom - height - 5}
              fontSize={10}
              fill={COLORS.textPrimary}
              textAnchor="middle"
            >
              {Math.round(item.avg_woz / 1000)}k
            </text>
            <text
              x={x + barWidth / 2}
              y={CHART_HEIGHT - 5}
              fontSize={10}
              fill={COLORS.textMuted}
              textAnchor="middle"
            >
              {item.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const AreaPanel: React.FC<AreaPanelProps> = ({ onUseGrowth, onUseWoz }) => {
  const [draft, setDraft] = useState('');
  const [postcode, setPostcode] = useState('');

  const { data, loading, error } = useApi<AreaResponse>(
    `/api/mortgage/postcode?postcode=${encodeURIComponent(postcode)}`,
    { enabled: postcode !== '' },
  );

  const lookUp = (e: React.FormEvent) => {
    e.preventDefault();
    setPostcode(draft.replace(/\s/g, '').toUpperCase());
  };

  const latestWoz = data?.woz_history[data.woz_history.length - 1];
  const city = data?.sale_prices.municipality;
  const country = data?.sale_prices.netherlands;

  return (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.card,
        padding: 16,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Price growth in your area</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            Enter a postcode to get suggestions for "House price growth / year"
          </div>
        </div>
        <form onSubmit={lookUp} style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. 1062 KT"
            aria-label="Postcode"
            style={{
              width: 120,
              background: COLORS.background,
              border: `1px solid ${COLORS.inputBorder}`,
              borderRadius: RADIUS.input,
              padding: '8px 10px',
              color: COLORS.textPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          />
          <button type="submit" style={{ ...smallButtonStyle, padding: '8px 14px', fontSize: 13 }}>
            Look up
          </button>
        </form>
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 12 }}>
          Loading CBS data…
        </div>
      )}
      {error && !loading && (
        <div style={{ fontSize: 12, color: COLORS.negative, marginTop: 12 }}>
          No data found for this postcode. Use a Dutch postcode like 1062 or 1062KT.
        </div>
      )}

      {data && !loading && !error && (
        <>
          <div style={{ fontSize: 13, marginTop: 14, marginBottom: 10 }}>
            <b>{data.postcode}</b> · {data.place ?? ''}
            {data.municipality && data.municipality !== data.place && ` (${data.municipality})`}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {data.growth && (
              <GrowthCard
                title={`Postcode ${data.postcode}`}
                subtitle={`Average WOZ value, ${data.growth.from_year}–${data.growth.to_year}`}
                options={[
                  { label: 'per year', pct: data.growth.avg_yearly_pct },
                  { label: `last year (${data.growth.to_year})`, pct: data.growth.last_year_pct },
                ]}
                onUse={onUseGrowth}
              />
            )}
            {city && (
              <GrowthCard
                title={data.municipality ?? 'City'}
                subtitle={`Real sale prices, avg ${formatEur(city.latest_price)} in ${
                  city.latest_year
                }`}
                options={[
                  { label: 'last 5 years', pct: city.growth_5y_pct },
                  { label: 'last 10 years', pct: city.growth_10y_pct },
                ]}
                onUse={onUseGrowth}
              />
            )}
            {country && (
              <GrowthCard
                title="Netherlands"
                subtitle={`Real sale prices, avg ${formatEur(country.latest_price)} in ${
                  country.latest_year
                }`}
                options={[
                  { label: 'last 5 years', pct: country.growth_5y_pct },
                  { label: 'last 10 years', pct: country.growth_10y_pct },
                ]}
                onUse={onUseGrowth}
              />
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: 18,
              marginTop: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Average WOZ value per year
              </div>
              <WozHistoryChart history={data.woz_history} />
              {latestWoz && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <button onClick={() => onUseWoz(latestWoz.avg_woz)} style={smallButtonStyle}>
                    Use {formatEur(latestWoz.avg_woz)} as WOZ value
                  </button>
                  <a
                    href="https://www.wozwaardeloket.nl/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: COLORS.accent, textDecoration: 'underline' }}
                  >
                    Exact value for your address ↗
                  </a>
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.9 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>The area ({data.facts.year})</div>
              <div>
                Homes <b>{formatNumber(data.facts.homes)}</b> · residents{' '}
                <b>{formatNumber(data.facts.residents)}</b>
              </div>
              <div>
                Owner-occupied <b>{data.facts.owner_occupied_pct ?? '—'}%</b> · rented{' '}
                <b>{data.facts.rented_pct ?? '—'}%</b>
              </div>
              <div>
                Apartments <b>{formatNumber(data.facts.apartments)}</b>
              </div>
              <div>
                Avg energy per home <b>{formatNumber(data.facts.avg_gas_m3)} m³ gas</b> ·{' '}
                <b>{formatNumber(data.facts.avg_electricity_kwh)} kWh</b>
              </div>
              {data.facts.build_years.length > 0 && (
                <div>
                  Built:{' '}
                  {data.facts.build_years
                    .filter((item) => item.homes > 0)
                    .map((item) => `${item.period} ${formatNumber(item.homes)}`)
                    .join(' · ')}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 12 }}>
            Source: CBS (CC-BY 4.0). WOZ averages also move when new homes are built, and past
            growth doesn't promise future growth. Sale prices are a better guide than WOZ.
          </div>
        </>
      )}
    </div>
  );
};
