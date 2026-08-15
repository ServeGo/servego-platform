import { api as apiClient, API_BASE_URL } from './apiClient';

// Wrapper for backward compatibility
// IMPORTANT: never send body with GET/HEAD (browser throws).
export const api = async (url, options = {}) => {
  const cleanedEndpoint = url.replace(API_BASE_URL, '');

  const method = (options.method || 'GET').toUpperCase();
  const { body, ...restOptions } = options;

  // Strip body for GET/HEAD
  const safeOptions = {
    ...restOptions,
    method,
    headers: options.headers
  };

  if (method === 'GET' || method === 'HEAD') {
    // Ensure no body is passed down
    delete safeOptions.body;
  } else if (body !== undefined) {
    // Pass body only for non-GET/HEAD
    safeOptions.body = body;
  }

  // Route correct HTTP method to the apiClient
  let response;
  if (method === 'GET') response = await apiClient.get(cleanedEndpoint, safeOptions);
  else if (method === 'POST') response = await apiClient.post(cleanedEndpoint, safeOptions.body, safeOptions);
  else if (method === 'PATCH') response = await apiClient.patch(cleanedEndpoint, safeOptions.body, safeOptions);
  else if (method === 'PUT') response = await apiClient.put(cleanedEndpoint, safeOptions.body, safeOptions);
  else if (method === 'DELETE') response = await apiClient.delete(cleanedEndpoint, safeOptions);
  else response = await apiClient.get(cleanedEndpoint, safeOptions);

  return {
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.data),
    error: response.error
  };
};
