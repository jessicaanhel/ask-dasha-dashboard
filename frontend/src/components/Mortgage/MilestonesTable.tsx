import React from 'react';
import { thStyle, tdStyle } from '../UI/table';
import { COLORS, changeColor } from '../../theme/tokens';
import {
  formatEur,
  PRINCIPAL_COLOR,
  INTEREST_COLOR,
  TAX_REFUND_COLOR,
} from './YearlyPaymentsChart';

export interface MortgageMilestone {
  months: number;
  principal_paid: number;
  interest_paid: number;
  tax_refund: number;
  net_interest: number;
  total_paid: number;
  net_paid: number;
  repaid_pct: number;
  remaining_balance: number;
  // "If I sell now" projection
  sale_price: number;
  selling_costs: number;
  cash_from_sale: number;
  cash_put_in: number;
  profit: number;
}

const formatAfter = (months: number) => {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`;
};

const formatSignedEur = (value: number) => `${value >= 0 ? '+' : '−'}${formatEur(Math.abs(value))}`;

// Sale columns get a subtle background so they read as a separate "what if" block
const saleCellStyle: React.CSSProperties = { background: 'rgba(52,209,161,0.05)' };

interface MilestonesTableProps {
  milestones: MortgageMilestone[];
  showSale: boolean;
}

// Cumulative totals after 5, 10, 15... years: loan repaid vs interest (the bank's commission)
export const MilestonesTable: React.FC<MilestonesTableProps> = ({ milestones, showSale }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          <th style={thStyle}>After</th>
          <th style={thStyle}>Loan repaid</th>
          <th style={thStyle}>Interest paid</th>
          <th style={thStyle}>Tax refund</th>
          <th style={thStyle}>Net interest</th>
          <th style={thStyle}>Total paid</th>
          <th style={thStyle}>Still owed</th>
          {showSale && (
            <>
              <th style={{ ...thStyle, ...saleCellStyle }}>Sale price</th>
              <th
                style={{ ...thStyle, ...saleCellStyle }}
                title="Sale price − selling costs − still owed"
              >
                Cash from sale
              </th>
              <th
                style={{ ...thStyle, ...saleCellStyle }}
                title="Cash from sale − own money − net payments"
              >
                Profit
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {milestones.map((row) => {
          // Share of everything paid so far that went to the loan itself, not to interest
          const loanShare = row.total_paid > 0 ? (row.principal_paid / row.total_paid) * 100 : 0;

          return (
            <tr key={row.months}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{formatAfter(row.months)}</td>
              <td style={tdStyle}>
                <span style={{ color: PRINCIPAL_COLOR }}>{formatEur(row.principal_paid)}</span>
                <span style={{ color: COLORS.textMuted, marginLeft: 6 }}>{row.repaid_pct}%</span>
              </td>
              <td style={{ ...tdStyle, color: INTEREST_COLOR }}>{formatEur(row.interest_paid)}</td>
              <td style={{ ...tdStyle, color: TAX_REFUND_COLOR }}>−{formatEur(row.tax_refund)}</td>
              <td style={tdStyle}>{formatEur(row.net_interest)}</td>
              <td style={tdStyle}>
                {formatEur(row.total_paid)}
                <div
                  title={`${loanShare.toFixed(0)}% went to the loan, ${(100 - loanShare).toFixed(
                    0,
                  )}% to interest`}
                  style={{
                    display: 'flex',
                    height: 4,
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginTop: 4,
                    width: 110,
                  }}
                >
                  <div style={{ width: `${loanShare}%`, background: PRINCIPAL_COLOR }} />
                  <div style={{ flex: 1, background: INTEREST_COLOR }} />
                </div>
              </td>
              <td style={{ ...tdStyle, color: COLORS.textSecondary }}>
                {formatEur(row.remaining_balance)}
              </td>
              {showSale && (
                <>
                  <td style={{ ...tdStyle, ...saleCellStyle }}>{formatEur(row.sale_price)}</td>
                  <td style={{ ...tdStyle, ...saleCellStyle }}>
                    {formatEur(row.cash_from_sale)}
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                      put in {formatEur(row.cash_put_in)}
                    </div>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      ...saleCellStyle,
                      fontWeight: 700,
                      color: changeColor(row.profit),
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatSignedEur(row.profit)}
                  </td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
