import { useAuthStore } from 'state/store/auth';
import { getRefreshToken } from 'features/auth/services/auth.service';

/**
 * HTTP Client Module
 *
 * A robust HTTP client utility that provides standardized methods for making API requests
 * with built-in error handling, authentication token management, and automatic token refresh.
 *
 * Features:
 * - Typed request/response handling with generics
 * - Standardized methods for GET, POST, PUT, DELETE operations
 * - Automatic handling of authentication token expiration
 * - Consistent error handling with custom HttpError class
 * - URL normalization for relative and absolute paths
 * - Configurable request headers
 * - Environment-based configuration
 *
 * @example
 * // GET request
 * const users = await clients.get<User[]>('users');
 *
 * // POST request with body
 * const newUser = await clients.post<User>(
 *   'users',
 *   JSON.stringify({ name: 'John', email: 'john@example.com' })
 * );
 *
 * // PUT request with custom headers
 * const updatedUser = await clients.put<User>(
 *   `users/${userId}`,
 *   JSON.stringify({ name: 'John Updated' }),
 *   { 'X-Custom-Header': 'value' }
 * );
 *
 * // DELETE request
 * const deleteResult = await clients.delete<{ success: boolean }>(`users/${userId}`);
 *
 * // Handling errors
 * try {
 *   const data = await clients.get<Data>('some-endpoint');
 *   // Process data
 * } catch (error) {
 *   if (error instanceof HttpError) {
 *     console.error(`API Error ${error.status}: ${error.message}`);
 *   }
 * }
 *
 * @note Requires environment variables:
 * - REACT_APP_PUBLIC_BACKEND_URL: Base URL for API requests
 * - REACT_APP_PUBLIC_X_BLOCKS_KEY: API key for authentication
 * - REACT_APP_COOKIE_ENABLED: Flag to control token storage method
 */

interface Https {
  get<T>(url: string, headers?: HeadersInit): Promise<T>;
  post<T>(url: string, body: BodyInit, headers?: HeadersInit): Promise<T>;
  put<T>(url: string, body: BodyInit, headers?: HeadersInit): Promise<T>;
  delete<T>(url: string, headers?: HeadersInit): Promise<T>;
  request<T>(url: string, options: RequestOptions): Promise<T>;
  createHeaders(headers: any): Headers;
  handleAuthError<T>(url: string, method: string, headers: any, body: any): Promise<T>;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: HeadersInit;
  body?: BodyInit;
}

export class HttpError extends Error {
  status: number;
  error: Record<string, unknown>;

  constructor(status: number, error: Record<string, unknown>) {
    const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);

    super(errorMessage);
    this.status = status;
    this.error = error;
  }
}

const BASE_URL = process.env.REACT_APP_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
const BLOCKS_KEY = process.env.REACT_APP_PUBLIC_X_BLOCKS_KEY ?? '';

export const clients: Https = {
  async get<T>(url: string, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(url, { method: 'GET', headers });
  },

  async post<T>(url: string, body: BodyInit, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(url, { method: 'POST', headers, body });
  },

  async put<T>(url: string, body: BodyInit, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(url, { method: 'PUT', headers, body });
  },

  async delete<T>(url: string, headers: HeadersInit = {}): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', headers });
  },

  async request<T>(url: string, { method, headers = {}, body }: RequestOptions): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}/${url.replace(/^\//, '')}`;

    const requestHeaders = this.createHeaders(headers);

    const config: RequestInit = {
      method,
      credentials: 'include',
      headers: requestHeaders,
    };

    if (body) {
      config.body = body;
    }

    try {
      const response = await fetch(fullUrl, config);

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      if (response.status === 401) {
        return this.handleAuthError<T>(url, method, headers, body);
      }

      const err = await response.json();
      throw new HttpError(response.status, err);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(500, { error: 'Network error' });
    }
  },

  createHeaders(headers: any): Headers {
    const authToken =
      process.env.REACT_APP_COOKIE_ENABLED === 'false' ? useAuthStore.getState().accessToken : null;

    const baseHeaders = {
      'Content-Type': 'application/json',
      'x-blocks-key': BLOCKS_KEY,
      ...(authToken && { Authorization: `bearer ${authToken}` }),
    };

    const headerEntries =
      headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers;

    return new Headers({
      ...baseHeaders,
      ...headerEntries,
    });
  },

  async handleAuthError<T>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    headers: any,
    body: any
  ): Promise<T> {
    const authStore = useAuthStore.getState();

    if (!authStore.refreshToken) {
      throw new HttpError(401, { error: 'invalid_refresh_token' });
    }

    const refreshTokenRes = await getRefreshToken();

    if (refreshTokenRes.error === 'invalid_refresh_token') {
      throw new HttpError(401, refreshTokenRes);
    }

    authStore.setAccessToken(refreshTokenRes.access_token);
    return this.request<T>(url, { method, headers, body });
  },
};
