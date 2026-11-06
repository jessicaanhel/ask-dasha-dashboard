export type DataSource = 'live' | 'mock' | 'partial';
export type DataSourceFilterValue = 'all' | 'live' | 'mock';

export const matchesDataSourceFilter = (
  source: DataSource | null | undefined,
  filter: DataSourceFilterValue,
): boolean => {
  if (filter === 'all' || !source || source === 'partial') return true;
  return source === filter;
};
