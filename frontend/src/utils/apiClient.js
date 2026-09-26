/**
 * Production-grade API client with retry logic, error handling, and token refresh
 */

// API base URLs are imported ONLY from the build environment (.env /
// Vercel dashboard variables). There is deliberately no hardcoded fallback:
// a missing VITE_API_URL / VITE_SOCKET_URL is a build misconfiguration and is
// surfaced loudly below instead of silently sending browsers to a fixed URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

if (!API_BASE_URL) {
  console.error(
    '[apiClient] VITE_API_URL is not set for this build — the app cannot reach the backend. ' +
    'Set VITE_API_URL in the build environment (.env or Vercel dashboard variables).'
  );
}
if (!SOCKET_URL) {
  console.error(
    '[apiClient] VITE_SOCKET_URL is not set for this build — realtime updates will not connect. ' +
    'Set VITE_SOCKET_URL in the build environment.'
  );
}

const API_BASES = [API_BASE_URL];

// Rule 19: stable, actionable copy for transport-level failures (used instead
// of raw `fetch`/network error strings so users never see a bare exception).
export const NETWORK_ERROR_MESSAGE =
  'Could not reach the server. Check your connection and try again.';



// Retry configuration.
//
// The catalog is idempotent GET traffic: retrying it is always safe. Keep the
// attempt count but bound the total wait so a struggling origin can never pin
// the visitor behind a skeleton for 7s per endpoint before failing (rule 15).
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 2,
  retryDelay: 400,
  retryableStatuses: [408, 500, 502, 503, 504]
};

// Hard ceiling for a single attempt. Without it a request that never settles
// (dropped connection, stalled proxy) leaves the UI on a skeleton forever
// because nothing ever rejects.
const DEFAULT_TIMEOUT_MS = 12_000;

// In-flight GET coalescing. Two components asking for the same endpoint in the
// same tick (Home's hero + DataContext's catalog) used to fire two identical
// requests; now they share one. Only safe for GET — never for mutations.
const inflightGets = new Map();

// Token storage
let accessToken = null;
let refreshToken = null;

/**
 * Set tokens from authentication response
 */
export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    if (access) localStorage.setItem('servego_token', access);
    if (refresh) localStorage.setItem('servego_refresh_token', refresh);
  }
}

/**
 * Get stored tokens
 */
export function getStoredTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  
  return {
    access: localStorage.getItem('servego_token'),
    refresh: localStorage.getItem('servego_refresh_token')
  };
}

/**
 * Clear tokens on logout
 */
export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('servego_token');
    localStorage.removeItem('servego_refresh_token');
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if should retry based on status code
 */
function shouldRetry(status, config) {
  return config.retryableStatuses.includes(status);
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  const { refresh } = getStoredTokens();
  if (!refresh) return null;

  try {
    for (const baseUrl of API_BASES) {
      try {
        const response = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh })
        });
        if (shouldRetry(response.status, DEFAULT_RETRY_CONFIG)) continue;
        if (!response.ok) break;
        const payload = await response.json();
        const data = payload?.success === true ? payload.data : payload;
        if (data?.accessToken) {
          setTokens(data.accessToken, data.refreshToken);
          return data.accessToken;
        }
        break;
      } catch {
        // Try the next configured base URL if the refresh endpoint cannot be reached.
      }
    }
    clearTokens();
    return null;
  } catch (err) {
    console.error('[API] Token refresh failed:', err);
    clearTokens();
    return null;
  }
}

/**
 * Create request headers
 */
function createHeaders(additionalHeaders = {}, body) {
  const headers = new Headers(additionalHeaders);
  
  // Add auth token if available
  const token = accessToken || getStoredTokens().access;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Don't set Content-Type for FormData — browser sets multipart boundary automatically
  if (!headers.has('Content-Type') && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  return headers;
}

/**
 * Main API request function with retry logic
 */
async function apiRequest(endpoint, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
  let lastError = null;
  let lastResponse = null;
  let tokenRefreshed = false;

  // A caller-supplied AbortController signal (e.g. live-search cancellation)
  // lets an in-flight request be aborted immediately on the next keystroke —
  // but it must not disable the deadline, or a hung connection with no further
  // keystrokes would spin forever. Combine both when the platform supports it.
  // Otherwise every attempt gets its own deadline, so one hung attempt cannot
  // outlive the budget.
  const { signal: externalSignal } = options;
  const attemptTimeout = options.timeout || DEFAULT_TIMEOUT_MS;
  const makeSignal = () => {
    const own = typeof AbortSignal?.timeout === 'function'
      ? AbortSignal.timeout(attemptTimeout)
      : (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), attemptTimeout);
        return controller.signal;
      })();

    if (!externalSignal) return own;
    if (typeof AbortSignal?.any === 'function') return AbortSignal.any([externalSignal, own]);
    // No AbortSignal.any: forward the caller's abort onto our own signal.
    if (externalSignal.aborted) own.abort();
    else externalSignal.addEventListener('abort', () => own.abort(), { once: true });
    return own;
  };

  for (const baseUrl of API_BASES) {
    const url = `${baseUrl}${endpoint}`;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const headers = createHeaders(options.headers, options.body);
        const fetchOptions = { ...options, headers, signal: makeSignal() };
        delete fetchOptions.retryConfig;
        delete fetchOptions.timeout;
        const response = await fetch(url, fetchOptions);
      
      // Handle 401 Unauthorized with token refresh
        if (response.status === 401 && !tokenRefreshed) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            tokenRefreshed = true;
            continue;
          }
        }
      
      // A retry here would multiply traffic while the limiter window is still
      // active. Return the structured response so the caller can surface it.
        if (response.status === 429) lastError = new Error('Request rate limited');
      
      // Retry on server errors if attempts remaining
        if (shouldRetry(response.status, config)) {
          if (attempt < config.maxRetries) {
            await sleep(config.retryDelay * Math.pow(2, attempt));
            continue;
          }
          lastResponse = response;
          break;
        }
      
      // Parse response
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) data = await response.json();
        else data = await response.text();

      // Successful backend responses use { success: true, data }. Consumers
      // receive the resource itself; failed responses remain intact so their
      // error code and message can be displayed.
        if (response.ok && data?.success === true && Object.hasOwn(data, 'data')) data = data.data;
      
      // Return structured response
        return { ok: response.ok, status: response.status, data, headers: response.headers };
      } catch (err) {
        lastError = err;
        // A caller-initiated cancel (live search superseded) must never be
        // retried or delayed. Our own deadline AbortError is a timeout, so it
        // still gets the normal retry budget.
        const callerCancelled = err?.name === 'AbortError' && Boolean(externalSignal?.aborted);
        if (callerCancelled) break;
        if (attempt < config.maxRetries) {
          await sleep(config.retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }
    if (lastError?.name === 'AbortError' && externalSignal?.aborted) break;
  }

  if (lastResponse) {
    return { ok: false, status: lastResponse.status, data: { error: NETWORK_ERROR_MESSAGE }, headers: lastResponse.headers };
  }
  // A caller-cancelled request reports the abort so the search debounce can
  // recognise it and ignore the result.
  if (lastError?.name === 'AbortError' && externalSignal?.aborted) {
    return { ok: false, status: 0, data: null, error: lastError };
  }
  return {
    ok: false,
    status: 0,
    data: { error: NETWORK_ERROR_MESSAGE },
    error: lastError
  };
}

/**
 * API client methods
 */
export const api = {
  get: (endpoint, options = {}) => {
    // Coalesce identical concurrent GETs. The public home page used to ask for
    // `GET /services` twice (hero marquee + catalog context) on every load;
    // both now share one request. Requests carrying a caller AbortSignal are
    // excluded — two components with separate signals must not cancel each
    // other out when one unmounts.
    if (options?.signal) return apiRequest(endpoint, { ...options, method: 'GET' });

    const existing = inflightGets.get(endpoint);
    if (existing) return existing;

    const request = apiRequest(endpoint, { ...options, method: 'GET' });
    inflightGets.set(endpoint, request);
    const release = () => {
      if (inflightGets.get(endpoint) === request) inflightGets.delete(endpoint);
    };
    request.then(release, release);
    return request;
  },
  
  post: (endpoint, body, options = {}) => 
    apiRequest(endpoint, { 
      ...options, 
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    }),
  
  postFormData: (endpoint, formData, options = {}) =>
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: formData
    }),
  
  put: (endpoint, body, options = {}) => 
    apiRequest(endpoint, { 
      ...options, 
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    }),
  
  patch: (endpoint, body, options = {}) => 
    apiRequest(endpoint, { 
      ...options, 
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    }),
  
  delete: (endpoint, options = {}) => 
    apiRequest(endpoint, { ...options, method: 'DELETE' })
};

export { API_BASE_URL, SOCKET_URL };

/**
 * Initialize tokens from storage on app load
 */
export function initializeTokens() {
  const { access, refresh } = getStoredTokens();
  accessToken = access;
  refreshToken = refresh;
  return { access, refresh };
}
