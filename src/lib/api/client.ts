/**
 * API Client
 *
 * Core fetch wrapper with timeout, error handling, and type safety.
 * Provides a consistent interface for all backend API calls.
 */

import { API_CONFIG } from './config';
import { parseAPIError } from './errors';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  baseURL?: string;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { timeout = API_CONFIG.timeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Make an API request with error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { baseURL, ...fetchOptions } = options;
  const url = baseURL ? `${baseURL}${endpoint}` : endpoint;

  // Don't set Content-Type for FormData — browser sets it with boundary
  const isFormData = fetchOptions.body instanceof FormData;

  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...fetchOptions.headers,
      },
    });

    // Handle non-2xx responses
    if (!response.ok) {
      const error = await parseAPIError(response);
      throw error;
    }

    // Parse JSON response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Parse and re-throw as BackendAPIError
    const apiError = await parseAPIError(error);
    throw apiError;
  }
}

/**
 * Make a GET request
 */
export async function get<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Make a POST request
 */
export async function post<T = any>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a POST request with FormData (for file uploads)
 */
export async function postFormData<T = any>(
  endpoint: string,
  formData: FormData,
  options: RequestOptions = {}
): Promise<T> {
  const { headers, ...restOptions } = options;

  // Don't set Content-Type for FormData - browser will set it with boundary
  return apiRequest<T>(endpoint, {
    ...restOptions,
    method: 'POST',
    body: formData,
    headers: {
      ...headers,
      // Remove Content-Type to let browser set it
    },
  });
}

/**
 * Make a PUT request
 */
export async function put<T = any>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a DELETE request
 */
export async function del<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}
