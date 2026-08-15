import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  api as apiClient,
  API_BASE_URL,
  setTokens,
  clearTokens,
  initializeTokens,
  getStoredTokens,
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

  const logout = () => {
    try {
      localStorage.removeItem('servego_user');
      localStorage.removeItem('servego_token');
      clearTokens();
    } catch {
      // Ignore storage errors.
    }
    // Fail-fast: clear the session immediately. Server/data state is cleared by
    // DataContext once currentUser becomes null.
    setCurrentUser(null);
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

  const applyReferralCode = async (code) => {
    try {
      if (!currentUser?.id) return { success: false, message: 'Please login to apply a referral code.' };

      const res = await api(`${API_BASE_URL}/referrals/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, code })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data?.error || 'Failed to apply referral code.' };
      }

      // Refresh currentUser so referredBy/earnings reflect immediately.
      setCurrentUser(prev => (prev ? { ...prev, referredBy: data.referredBy } : prev));

      return {
        success: true,
        message: `Referral applied! You referred by ${data.referredBy}. Bonus: ₹${data.bonusEarned}`,
        referredBy: data.referredBy,
        referredCount: data.referredCount,
        bonusEarned: data.bonusEarned
      };
    } catch (err) {
      return { success: false, message: 'Network error while applying referral code.' };
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isInitializing,
      login,
      registerUser,
      forgotPassword,
      resetPassword,
      logout,
      updateUserProfile,
      applyReferralCode
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
