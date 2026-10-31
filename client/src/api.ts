const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/api';
export const apiBase = base;
export class ApiError extends Error { constructor(public status: number, public code: string, message: string, public fields: Record<string, string[]> = {}) { super(message); } }
export async function api<T>(route: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(base + route, { ...options, credentials: 'include', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } }); }
  catch (error) { if (error instanceof Error && error.name === 'AbortError') throw error; throw new ApiError(0, 'NETWORK', 'Нет связи с сервером. Проверьте интернет и повторите отправку.'); }
  if (response.status === 204) return undefined as T;
  let body: unknown;
  try { body = await response.json(); } catch { throw new ApiError(response.status, 'INVALID_RESPONSE', 'Сервер вернул непонятный ответ. Попробуйте позже.'); }
  if (!response.ok) {
    const value = typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined;
    if (typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string') {
      const fields: Record<string, string[]> = {};
      if ('fields' in value && typeof value.fields === 'object' && value.fields !== null) Object.entries(value.fields).forEach(([key, messages]) => { if (Array.isArray(messages) && messages.every(message => typeof message === 'string')) fields[key] = messages; });
      throw new ApiError(response.status, 'code' in value && typeof value.code === 'string' ? value.code : 'API_ERROR', value.message, fields);
    }
    throw new ApiError(response.status, 'API_ERROR', 'Не удалось выполнить запрос');
  }
  return body as T;
}
