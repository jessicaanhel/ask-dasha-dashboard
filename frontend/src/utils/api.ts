export const API_URL = process.env.REACT_APP_API_URL || '';

export const apiFetch = (path: string, init?: RequestInit) => fetch(`${API_URL}${path}`, init);
