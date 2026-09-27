import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  api as apiClient,
  API_BASE_URL,
  setTokens,
  clearTokens,
  initializeTokens,
  getStoredTokens,
  SESSION_DEAD_EVENT,
} from '../utils/apiClient';
import { api } from '../utils/apiWrapper';
import { getErrorMessage } from '../utils/errorMessages';

// Initialize tokens on load
initializeTokens();

const AuthContext = createContext(undefined);

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('servego_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  // Restore a previously authenticated session on refresh, but clear it on explicit logout.
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [isInitializing, setIsInitializing] = useState(true);
  // Why the session ended by itself, so the login screen can explain itself
  // instead of the user being dumped there with no context.
  const [sessionEndedReason, setSessionEndedReason] = useState(null);

  // Validate stored session on mount - prevents stale/expired auto-login
  useEffect(() => {
    let cancelled = false;
    const storedUser = getStoredUser();
    const { access } = getStoredTokens();

    if (!storedUser || !access) {
      setCurrentUser(null);
      setIsInitializing(false);
      return;
    }

    apiClient.get('/auth/me')
      .then(res => {
        if (cancelled) return;
        if (res.ok && res.data?.user) {
          setCurrentUser(res.data.user);
        } else {
          setCurrentUser(null);
          localStorage.removeItem('servego_user');
          clearTokens();
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentUser(null);
        localStorage.removeItem('servego_user');
        clearTokens();
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('servego_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('servego_user');
    }
  }, [currentUser]);

  // The server has declared this session unrecoverable (revoked, expired,
  // password changed elsewhere, account blocked). `apiClient` has already wiped
  // the tokens; drop the in-memory user too so the UI stops pretending to be
  // signed in, and say why rather than failing silently on the next request.
  useEffect(() => {
    const handleSessionDead = (event) => {
      const code = event?.detail?.code;
      const message = {
        ACCOUNT_INACTIVE: 'Your account is no longer active. Please contact support.',
        PROVIDER_BLOCKED: 'This provider account has been blocked. Please contact support.',
        SESSION_REVOKED: 'You were signed out. Please sign in again.',
        REFRESH_TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
        REFRESH_TOKEN_REVOKED: 'You were signed out. Please sign in again.',
      }[code] || 'Your session has ended. Please sign in again.';

      setSessionEndedReason(message);
      setCurrentUser(null);
    };

    window.addEventListener(SESSION_DEAD_EVENT, handleSessionDead);
    return () => window.removeEventListener(SESSION_DEAD_EVENT, handleSessionDead);
  }, []);

  const login = async (email, password) => {
    try {
      localStorage.removeItem('servego_user');
      clearTokens();

      // Use the new API client for better error handling and retry
      const response = await apiClient.post('/auth/login', { email, password }, { retryConfig: { maxRetries: 2 } });

      if (response.ok && response.data?.user) {
        // Store tokens using the new token management system
        if (response.data.accessToken) {
          setTokens(response.data.accessToken, response.data.refreshToken);
        }
        setCurrentUser(response.data.user);
        return { success: true, role: response.data.user.role };
      } else {
        return {
          success: false,
          error: getErrorMessage(response.data, 'Login failed'),
          blockedReason: response.data?.details?.blockedReason,
          needsReview: response.data?.details?.needsReview
        };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const registerUser = async (payload) => {
    try {
      localStorage.removeItem('servego_user');
      clearTokens();

      const response = await apiClient.post('/auth/register', payload, { retryConfig: { maxRetries: 2 } });
      const data = response.data;

      if (response.ok && data?.user) {
        // Store tokens using the new token management system
        if (data.accessToken) {
          setTokens(data.accessToken, data.refreshToken);
        }
        setCurrentUser(data.user);
        return { success: true, role: data.user.role };
      } else {
        return {
          success: false,
          error: getErrorMessage(data, 'Registration failed'),
          details: data?.details
        };
      }
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return { success: response.ok, message: response.data?.message || 'If an account with that email exists, a reset link has been sent.' };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, password });
      return {
        success: response.ok,
        message: getErrorMessage(response.data, 'Unable to reset your password. Please request a new link.')
      };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  };

  /**
   * Sign out.
   *
   * Two things have to happen, in this order:
   *  1. Locally, immediately — the user must be signed out on this device right
   *     now, even if the network is down.
   *  2. Server-side, best effort — tell the backend to revoke this session, so
   *     the refresh token stops working. Without this the token stayed valid in
   *     storage-free limbo for 7 days: signing out only hid the UI.
   *
   * The refresh token is captured BEFORE it is cleared, and the request uses
   * `keepalive` so it still completes when a sign-out is part of a page unload.
   * Local state is never gated on the network call succeeding.
   */
  const logout = () => {
    let refreshToken = null;
    try {
      refreshToken = getStoredTokens().refresh;
    } catch {
      // Ignore storage errors.
    }

    try {
      localStorage.removeItem('servego_user');
      localStorage.removeItem('servego_token');
      clearTokens();
    } catch {
      // Ignore storage errors.
    }
    // A deliberate sign-out is not a dead session, so clear any leftover notice.
    setSessionEndedReason(null);
    // Fail-fast: clear the session immediately. Server/data state is cleared by
    // DataContext once currentUser becomes null.
    setCurrentUser(null);

    if (refreshToken) {
      void fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        keepalive: true,
      }).catch(() => {
        // The local sign-out already succeeded. A missed revocation is retried by
        // the session sweeping job's TTL, and the next sign-in mints a new token.
      });
    }
  };

  const updateUserProfile = async (userId, profileData) => {
    try {
      const res = await api(`${API_BASE_URL}/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (res.ok && data?.user) {
        setCurrentUser(data.user);
      }
      return data;
    } catch (err) {
      console.error('Failed to update user profile:', err);
      return { error: 'Network error' };
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      setCurrentUser,
      isInitializing,
      sessionEndedReason,
      login,
      registerUser,
      forgotPassword,
      resetPassword,
      logout,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
