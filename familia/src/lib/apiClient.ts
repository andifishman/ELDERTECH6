// Cliente HTTP del backend propio (eldertech-api). Agrega el access_token de la sesión de Supabase.
import { supabase } from './supabase';

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** En un build real la URL del backend nunca puede ser localhost: en el celular de la familia "localhost" es el celular mismo. */
export const apiUrlInvalida = (): boolean => !API_URL || (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(API_URL));

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (apiUrlInvalida()) throw new ApiError(0, 'La app no está configurada correctamente (falta la dirección del servidor).');
  const esJson = typeof init.body === 'string';
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...(esJson ? { 'Content-Type': 'application/json' } : {}), ...(await authHeader()), ...init.headers } });
  } catch {
    throw new ApiError(0, 'No pudimos conectarnos. Revisá tu conexión a internet e intentá de nuevo.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Algo salió mal (error ${res.status}).`);
  }
  if (res.status === 204) return undefined as T;
  const texto = await res.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form as unknown as BodyInit }),
};
