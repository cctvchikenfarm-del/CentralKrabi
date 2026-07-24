/**
 * api/client.js — Base fetch wrapper
 * All API calls go through here. Handles auth errors and JSON parsing.
 */

const BASE = import.meta.env.VITE_API_BASE || '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include', // always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Session expired — redirect to login if not already on /login or checking /auth/me
  if (res.status === 401) {
    if (path !== '/auth/me' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError('Session หมดอายุ', 401);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  }

  return data;
}

export const api = {
  get:    (path, params) => {
    const url = params ? `${path}?${new URLSearchParams(params)}` : path;
    return request(url, { method: 'GET' });
  },
  post:   (path, body)   => request(path, { method: 'POST',   body }),
  put:    (path, body)   => request(path, { method: 'PUT',    body }),
  delete: (path)         => request(path, { method: 'DELETE' }),
};

export { ApiError };
