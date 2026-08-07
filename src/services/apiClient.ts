// Cliente HTTP para hablar con nuestro backend propio (eldertech-api) — nunca
// con Supabase ni APIs externas directo. Agrega el access_token de la sesión
// de Supabase (la única razón por la que el cliente sigue usando supabase-js
// es para el login/sesión — ver src/services/supabase.ts).
import { supabase } from './supabase';
import { API_URL } from '@/utils/apiUrlGuard';

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
    throw new Error(
      'Falta EXPO_PUBLIC_API_URL. Copiá .env.example a .env y completá la URL del backend (después reiniciá expo start).',
    );
  }

  // Content-Type solo para bodies JSON (string) — un FormData (multipart) necesita
  // que el runtime le ponga su propio boundary, nunca hay que fijarlo a mano.
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
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Para multipart/form-data (ej. transcripción de audio) — no fija Content-Type, el runtime le pone el boundary. */
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form as unknown as BodyInit }),
};
