import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { DataSource } from '../utils/dataSource';

export const useApi = <T = any,>(endpoint: string, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(endpoint);
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        setData(json);
        setSource((res.headers.get('X-Data-Source') as DataSource | null) ?? null);
        setError(null);
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, enabled]);

  return { data, source, loading, error };
};
