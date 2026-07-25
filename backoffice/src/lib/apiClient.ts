// ========================================
// LIB: Cliente HTTP para el backend propio (eldertech-api)
// DESCRIPCIÓN:
// Reemplaza las llamadas directas a Supabase en los servicios del backoffice,
// módulo por módulo a medida que se migran. Agrega el access_token de la
// sesión de Supabase — la única razón por la que el backoffice sigue usando
// supabase-js es para el login/sesión (ver src/lib/supabase.ts) y el canal
// de Realtime (ver src/hooks/useRealtime.ts).
// ========================================
import { supabase } from './supabase';

const API_URL = (import.meta.env.VITE_API_URL as string) ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new Error('Falta VITE_API_URL. Copiá .env.example a .env y completá la URL del backend (después reiniciá el dev server).');
  }

  const isJsonBody = typeof init.body === 'string';

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(await authHeader()),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `Error ${res.status} en ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Para multipart/form-data (ej. subida de imágenes) — no fija Content-Type, el runtime le pone el boundary. */
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form as unknown as BodyInit }),
};
