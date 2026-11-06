export const formatUsdMillions = (value: number, { signed = true }: { signed?: boolean } = {}) => {
  const millions = value / 1e6;
  const abs = Math.abs(millions);
  const roundedTenth = Math.round(abs * 10) / 10;
  const magnitude = Number.isInteger(roundedTenth)
    ? roundedTenth.toFixed(0)
    : roundedTenth.toFixed(1);
  const sign = signed ? (value >= 0 ? '+' : '-') : value < 0 ? '-' : '';
  return `${sign}$${magnitude}M`;
};

export const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value}%`;

export const formatSignedUsd = (value: number) =>
  `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString()}`;

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
