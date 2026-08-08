const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3009';

export interface ApiResponse<T> {
  status: number;
  body: T;
}

interface RequestOptions {
  token?: string;
  headers?: Record<string, string>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as T) : (undefined as T);

  return { status: response.status, body: parsed };
}

export const apiGet = <T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> =>
  request<T>('GET', path, undefined, options);

export const apiPost = <T>(path: string, body: unknown, options?: RequestOptions): Promise<ApiResponse<T>> =>
  request<T>('POST', path, body, options);

export const apiPut = <T>(path: string, body: unknown, options?: RequestOptions): Promise<ApiResponse<T>> =>
  request<T>('PUT', path, body, options);
