import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  normalizeBooking,
  normalizeBookings,
  normalizeProviders,
  normalizeTicket,
  normalizeTickets,
  normalizeNotification,
  normalizeNotifications,
} from '../utils/normalizeCustomerData';
import { api as apiClient, API_BASE_URL, SOCKET_URL, setTokens, clearTokens, initializeTokens, getStoredTokens } from '../utils/apiClient';

const AppContext = createContext(undefined);

// Initialize tokens on load
initializeTokens();

const getStoredAuthToken = () => {
  try {
    return localStorage.getItem('servego_token');
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('servego_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Wrapper for backward compatibility
// IMPORTANT: never send body with GET/HEAD (browser throws).
const api = async (url, options = {}) => {
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
    json: () => Promise.resolve(response.data)
  };
};


export const AppProvider = ({ children }) => {
  const fetchProviderAvailability = useCallback(async (providerId, dateYYYYMMDD) => {
    try {
      const res = await api(`${API_BASE_URL}/providers/${providerId}/availability?date=${encodeURIComponent(dateYYYYMMDD)}`);
      const data = await res.json();
      if (!res.ok) return { error: data?.error || data?.message || 'Failed to fetch availability' };
      return data;
    } catch (err) {
      return { error: 'Network error' };
    }
  }, []);

  // Database of users - purely for local dev fallback or admin view if needed
  const [users, setUsers] = useState([]);

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


  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [providersByApprovedService, setProvidersByApprovedService] = useState([]);

  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [favoriteProviders, setFavoriteProviders] = useState(() => {
    const saved = localStorage.getItem('servego_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedProsData, setSavedProsData] = useState([]); // full provider objects from API

  // UI state filters
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [selectedArea, setSelectedArea] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const socketRef = useRef(null);
  const providersRef = useRef([]);

  // Latest live location per booking, keyed by booking id.
  // { [bookingId]: { latitude, longitude, timestamp, etaMinutes, distanceKm } }
  const [locationUpdates, setLocationUpdates] = useState({});

  const getBookingLocation = useCallback((bookingId) => {
    return locationUpdates[bookingId] || null;
  }, [locationUpdates]);

  const fetchProvidersByApprovedServiceName = useCallback(async (serviceName, { location = '', sort = 'rating' } = {}) => {
    if (!serviceName) return [];
    try {
      const params = new URLSearchParams({ serviceName, sort });
      if (location) params.set('location', location);
      const res = await api(`${API_BASE_URL}/providers/by-approved-service?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to fetch providers by approved service:', data);
        return [];
      }
      const arr = Array.isArray(data) ? data : [];
      setProvidersByApprovedService(arr);
      return arr;
    } catch (err) {
      console.error('Failed to fetch providers by approved service:', err);
      setProvidersByApprovedService([]);
      return [];
    }
  }, []);


  // Sync favorites to local storage
  useEffect(() => {
    localStorage.setItem('servego_favorites', JSON.stringify(favoriteProviders));
  }, [favoriteProviders]);

  const fetchSavedPros = useCallback(async () => {
    if (!currentUser?.id || currentUser?.role !== 'customer') return;
    try {
      const res = await api(`${API_BASE_URL}/saved-pros`);
      const data = await res.json();
      const list = Array.isArray(data?.savedPros) ? data.savedPros : Array.isArray(data) ? data : [];
      if (res.ok) {
        setSavedProsData(list);
        setFavoriteProviders(list.map(sp => sp.providerId || sp.provider?.id).filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to fetch saved pros:', err);
    }
  }, [currentUser?.id, currentUser?.role]);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await api(`${API_BASE_URL}/providers`);
      const data = await res.json();
      setProviders(normalizeProviders(data));
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  }, []);

  // Keep providersRef in sync so fetchBookings always reads latest providers
  useEffect(() => {
    providersRef.current = providers;
  }, [providers]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api(`${API_BASE_URL}/services`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  }, []);

  const searchServices = useCallback(async (query = '', location = '') => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (location.trim()) params.set('location', location.trim());
      const suffix = params.toString();
      const res = await api(`${API_BASE_URL}/services/search${suffix ? `?${suffix}` : ''}`);
      const data = await res.json();
      return res.ok && Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to search services:', err);
      return [];
    }
  }, []);


  const fetchBookings = useCallback(async () => {
    if (!currentUser?.id) {
      setBookings([]);
      return;
    }

    try {
      // Backend GET /bookings already scopes by role (admin=all, customer=own, provider=own)
      const limit = currentUser?.role === 'admin' ? 500 : 100;
      const res = await api(`${API_BASE_URL}/bookings?limit=${limit}`);
      const data = await res.json();

      const bookingsArray = normalizeBookings(data);

      if (currentUser?.role === 'admin') {
        setBookings(bookingsArray);
        return;
      }

      if (currentUser?.role === 'provider') {
        const providerIds = [currentUser?.providerId, currentUser?.id].filter(Boolean);
        // Use ref to always read latest providers — avoids stale closure in socket/poll handlers
        const currentProviders = providersRef.current;
        const providerMatch = currentProviders.find((p) => providerIds.includes(p.id) || providerIds.includes(p.userId));
        const providerId = providerMatch?.id || currentUser?.providerId || currentUser?.id;
        const matchedIds = [providerId, currentUser?.providerId, currentUser?.id].filter(Boolean);

        setBookings(
          bookingsArray.filter((b) => {
            const bookingProviderId = b.providerId || b.provider?.id || b.provider?.userId;
            return matchedIds.includes(bookingProviderId);
          })
        );
        return;
      }

      const filtered = bookingsArray.filter((b) => b.customerId === currentUser.id);
      setBookings(filtered);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setBookings([]);
    }
  }, [currentUser?.id, currentUser?.providerId, currentUser?.role]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api(`${API_BASE_URL}/notifications`);
      const data = await res.json();
      setNotifications(normalizeNotifications(data));
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      // Backend GET /tickets already scopes by role (admin=all, user=own)
      const res = await api(`${API_BASE_URL}/tickets`);
      const data = await res.json();
      setTickets(normalizeTickets(data));
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setTickets([]);
    }
  }, [currentUser?.role]);


  const fetchUsers = async () => {
    try {
      const res = await api(`${API_BASE_URL}/users`);
      const data = await res.json();

      // Backend returns: { users, pagination }.
      // Keep state compatible with callers that expect `users` to be an array.
      const usersArray = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
      setUsers(usersArray);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsers([]);
    }
  };

  const createService = async (payload) => {
    try {
      const res = await api(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        await fetchServices();
        return data;
      }
      return data;
    } catch (err) {
      console.error('Failed to create service:', err);
      return { error: 'Network error' };
    }
  };

  const updateService = async (id, payload) => {
    try {
      const res = await api(`${API_BASE_URL}/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchServices();
        return data;
      }
      return data;
    } catch (err) {
      console.error('Failed to update service:', err);
      return { error: 'Network error' };
    }
  };

  const deleteService = async (id) => {
    try {
      const res = await api(`${API_BASE_URL}/services/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        await fetchServices();
        return data;
      }
      return data;
    } catch (err) {
      console.error('Failed to delete service:', err);
      return { error: 'Network error' };
    }
  };

  const hideService = async (id, isHidden) => {
    try {
      const res = await api(`${API_BASE_URL}/services/${id}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHidden })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchServices();
        return data;
      }
      return data;
    } catch (err) {
      console.error('Failed to hide service:', err);
      return { error: 'Network error' };
    }
  };


  // Actions



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
          error: response.data?.message || 'Login failed',
          blockedReason: response.data?.details?.blockedReason,
          needsReview: response.data?.details?.needsReview
        };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Network error. Please try again.' };
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
          error: data?.message || 'Registration failed',
          details: data?.details
        };
      }
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return { success: response.ok, message: response.data?.message || 'If an account with that email exists, a reset link has been sent.' };
    } catch (err) {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, password });
      return { success: response.ok, message: response.data?.message || response.data?.error || 'Something went wrong.' };
    } catch (err) {
      return { success: false, message: 'Network error. Please try again.' };
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
    // Fail-fast: clear protected state immediately.
    setBookings([]);
    setNotifications([]);
    setTickets([]);
    setCurrentUser(null);
  };

  const setCity = (city) => {
    setSelectedCity(city);
    setSelectedArea(''); 
  };

  const setArea = (area) => {
    setSelectedArea(area);
  };


  const setCategory = (cat) => {
    setSelectedCategory(cat);
  };

  useEffect(() => {
    // Always fetch public catalog (services) so the home page works unauthenticated.
    fetchServices();

    if (currentUser?.id) {
      fetchProviders();
      fetchNotifications();
      fetchBookings();
      fetchTickets();
      if (currentUser?.role === 'customer') fetchSavedPros();
    } else {
      setNotifications([]);
      setBookings([]);
      setTickets([]);
      setProviders([]);
      setProvidersByApprovedService([]);
    }

    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
    // Intentionally omit `fetchBookings`/`fetchTickets` from deps to avoid
    // re-creating these effects when their identity changes due to provider/service
    // updates (which caused reconnect loops). The functions themselves read
    // latest state when invoked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);


  useEffect(() => {
    if (!currentUser?.id) {
      setConnectionStatus('offline');
      return undefined;
    }

    let socket;
    let triedLocalSocket = false;
    let disposed = false;

    const connectSocket = (url) => {
      socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: { token: getStoredAuthToken() },
        autoConnect: true,
      });
      socketRef.current = socket;

      // Real-time booking + notification updates
      socket.on('newJobLead', () => fetchBookings());
      socket.on('bookingUpdated', () => fetchBookings());
      socket.on('bookingStatusChanged', () => fetchBookings());
      // Live provider location for an active booking (customer side)
      socket.on('location:update', (payload) => {
        if (!payload?.bookingId) return;
        setLocationUpdates((prev) => ({
          ...prev,
          [payload.bookingId]: {
            latitude: payload.latitude,
            longitude: payload.longitude,
            timestamp: payload.timestamp || new Date().toISOString(),
            etaMinutes: payload.etaMinutes ?? null,
            distanceKm: payload.distanceKm ?? null,
            destination: payload.destination || null,
            routePolyline: payload.routePolyline || null,
            providerPhase: payload.providerPhase || prev[payload.bookingId]?.providerPhase || null,
            status: payload.status || null
          }
        }));
      });
      // Dispatch lifecycle: provider taps "On My Way" / "Arrived".
      const applyDispatchPhase = (payload) => {
        if (!payload?.bookingId) return;
        setLocationUpdates((prev) => ({
          ...prev,
          [payload.bookingId]: {
            ...(prev[payload.bookingId] || {}),
            providerPhase: payload.providerPhase,
            status: payload.status || prev[payload.bookingId]?.status || null,
            timestamp: payload.timestamp || prev[payload.bookingId]?.timestamp
          }
        }));
      };
      socket.on('provider:onTheWay', applyDispatchPhase);
      socket.on('provider:arrived', applyDispatchPhase);
      // Refresh service catalog when a provider service is approved (active-specialist count changes)
      socket.on('serviceApproved', () => fetchServices());
      // Admin: refresh pending service requests when a new one arrives
      if (currentUser?.role === 'admin') {
        socket.on('newApprovalRequest', () => fetchProviderServiceRequests());
      }

    socket.on('notification', (notif) => {
      if (notif.userId === currentUser.id) {
        setNotifications(prev => [normalizeNotification(notif), ...prev]);
      }
    });

    socket.on('connect', () => {
      setConnectionStatus('online');
    });

    socket.on('connect_error', (err) => {
      if (!triedLocalSocket && !disposed && url === SOCKET_URL) {
        // Keep Render as the first and only primary socket target. Localhost
        // is attempted only after Render cannot establish a connection.
        triedLocalSocket = true;
        socket.disconnect();
        connectSocket(LOCAL_SOCKET_URL);
        return;
      }
      setConnectionStatus('reconnecting');
      console.warn('Socket connect error:', err?.message || err);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.info('Socket reconnect attempt', attempt);
    });

    socket.on('reconnect_failed', () => {
      setConnectionStatus('offline');
      console.warn('Socket failed to reconnect after attempts');
    });
    };

    connectSocket(SOCKET_URL);

    // Poll bookings every 30s — initial fetch already handled by the data-fetch useEffect above
    const intervalId = window.setInterval(() => {
      if (currentUser?.id) fetchBookings();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
      disposed = true;
      socket?.disconnect();
      socketRef.current = null;
    };
    // Socket should only reconnect when user identity/role changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  /**
   * Provider pushes a live location fix for an active booking.
   * Prefers the real-time socket (with ack); falls back to REST when the socket
   * is not connected so tracking keeps working in degraded mode.
   */
  const shareProviderLocation = useCallback(async (bookingId, latitude, longitude) => {
    if (!bookingId) return { ok: false, error: 'Booking ID is required.' };
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, error: 'Valid coordinates are required.' };
    }

    const socket = socketRef?.current;
    if (socket?.connected) {
      try {
        const ack = await new Promise((resolve) => {
          socket.emit('location:update', { bookingId, latitude, longitude }, resolve);
          setTimeout(() => resolve({ ok: false, error: 'tracking:timeout' }), 5000);
        });
        if (ack?.ok && ack?.data) {
          setLocationUpdates((prev) => ({
            ...prev,
            [bookingId]: {
              latitude: ack.data.latitude,
              longitude: ack.data.longitude,
              timestamp: ack.data.timestamp,
              etaMinutes: ack.data.etaMinutes,
              distanceKm: ack.data.distanceKm,
              destination: ack.data.destination,
              routePolyline: ack.data.routePolyline || null,
              providerPhase: ack.data.providerPhase || prev[bookingId]?.providerPhase || null,
              status: ack.data.status
            }
          }));
          return ack;
        }
        if (ack?.error && ack.error !== 'tracking:timeout') return ack;
      } catch {
        // fall through to REST fallback
      }
    }

    try {
      const res = await apiClient.patch(`/bookings/${bookingId}/location`, { latitude, longitude });
      if (res.ok && res.data) {
        setLocationUpdates((prev) => ({
          ...prev,
          [bookingId]: {
            latitude: res.data.latitude,
            longitude: res.data.longitude,
            timestamp: res.data.timestamp,
            etaMinutes: res.data.etaMinutes,
            distanceKm: res.data.distanceKm,
            destination: res.data.destination,
            routePolyline: res.data.routePolyline || null,
            providerPhase: res.data.providerPhase || prev[bookingId]?.providerPhase || null,
            status: res.data.status
          }
        }));
      }
      return { ok: res.ok, error: res.data?.message, data: res.data };
    } catch (err) {
      return { ok: false, error: err?.message || 'Network error while sharing location.' };
    }
  }, []);

  /**
   * Provider signals a dispatch lifecycle step ("on the way" / "arrived").
   * Mirrors shareProviderLocation: socket first, REST fallback.
   */
  const setProviderDispatchPhase = useCallback(async (bookingId, phase) => {
    if (!bookingId) return { ok: false, error: 'Booking ID is required.' };
    const event = phase === 'ARRIVED' ? 'provider:arrived' : 'provider:onTheWay';
    const socket = socketRef?.current;
    if (socket?.connected) {
      try {
        const ack = await new Promise((resolve) => {
          socket.emit(event, { bookingId }, resolve);
          setTimeout(() => resolve({ ok: false, error: 'tracking:timeout' }), 5000);
        });
        if (ack?.ok && ack?.data) {
          setLocationUpdates((prev) => ({
            ...prev,
            [bookingId]: {
              ...(prev[bookingId] || {}),
              providerPhase: ack.data.providerPhase,
              status: ack.data.status || prev[bookingId]?.status || null
            }
          }));
          return ack;
        }
        if (ack?.error && ack.error !== 'tracking:timeout') return ack;
      } catch {
        // fall through to REST fallback
      }
    }
    try {
      const path = phase === 'ARRIVED' ? `/bookings/${bookingId}/arrived` : `/bookings/${bookingId}/on-the-way`;
      const res = await apiClient.post(path, {});
      if (res.ok && res.data) {
        setLocationUpdates((prev) => ({
          ...prev,
          [bookingId]: {
            ...(prev[bookingId] || {}),
            providerPhase: res.data.providerPhase,
            status: res.data.status || prev[bookingId]?.status || null
          }
        }));
      }
      return { ok: res.ok, error: res.data?.message, data: res.data };
    } catch (err) {
      return { ok: false, error: err?.message || `Network error while updating ${phase}.` };
    }
  }, []);

  const createBooking = async (bookingData) => {
    try {
      const res = await api(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          ...bookingData,
          // Prisma Booking does not store customerName/customerEmail/customerPhone.
          // Keep request payload aligned with backend/DB contract.
          customerId: currentUser?.id,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.message || data.error || 'Booking failed.' };
      }
      if (data.id) {
        const normalized = normalizeBooking(data);
        setBookings(prev => [normalized, ...prev]);
        return normalized;
      }
      return { error: 'Booking failed.' };
    } catch (err) {
      console.error('Failed to create booking:', err);
      return { error: 'Network error' };
    }
  };

  const updateBookingStatus = async (bookingId, status, note, verificationCode) => {
    try {
      const res = await api(`${API_BASE_URL}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note, verificationCode })
      });
      const data = await res.json();
      if (data.id) {
        const normalized = normalizeBooking(data);
        setBookings(prev => prev.map(bk => bk.id === bookingId ? normalized : bk));
        return normalized;
      }
      if (data.error) {
        return { error: data.error };
      }
      return data;
    } catch (err) {
      console.error('Failed to update booking status:', err);
      return { error: 'Network error' };
    }
  };

  const submitReview = async (bookingId, providerId, rating, comment) => {
    try {
      const res = await api(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          providerId,
          reviewerId: currentUser?.id,
          reviewerName: currentUser?.name || 'Anonymous',
          rating,
          comment
        })
      });
      const data = await res.json();
      if (res.ok) {
        fetchProviders(); // Refresh providers to show new rating
        fetchBookings(); // Refresh bookings to show reviewed status
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  };

  const verifyProvider = async (providerId) => {
    try {
      const provider = providers.find(p => p.id === providerId);
      const res = await api(`${API_BASE_URL}/providers/${providerId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !provider.isVerified })
      });
      const data = await res.json();
      if (data.id) {
        setProviders(prev => prev.map(p => p.id === providerId ? data : p));
      }
    } catch (err) {
      console.error('Failed to verify provider:', err);
    }
  };

  const updateProviderAvailability = async (providerId, availableDays, timeSlots, availabilitySlots) => {
    try {
      const payload = { availableDays, timeSlots };
      if (availabilitySlots !== undefined) payload.availabilitySlots = availabilitySlots;
      const res = await api(`${API_BASE_URL}/providers/${providerId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) {
        setProviders(prev => prev.map(p => p.id === providerId ? data : p));
        return data;
      }
      throw new Error(data?.message || data?.error || 'Failed to save availability.');
    } catch (err) {
      console.error('Failed to update availability:', err);
      throw err;
    }
  };

  const updateProviderProfile = async (providerId, profileData) => {
    try {
      const res = await api(`${API_BASE_URL}/providers/${providerId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.id) {
        setProviders(prev => prev.map(p => p.id === providerId ? data : p));
        return data;
      }
      throw new Error(data?.message || data?.error || 'Failed to update provider profile.');
    } catch (err) {
      console.error('Failed to update provider profile:', err);
      throw err;
    }
  };

  // Provider base location + service radius (origin for the route planner and
  // nearby-provider matching).
  const updateProviderDispatchLocation = async ({ latitude, longitude, maxRadiusKm }) => {
    try {
      const res = await apiClient.patch('/providers/me/location', { latitude, longitude, maxRadiusKm });
      if (res.ok && res.data?.id) {
        setProviders(prev => prev.map(p => p.id === res.data.id ? res.data : p));
        return res.data;
      }
      throw new Error(res.data?.message || res.data?.error || 'Failed to save provider location.');
    } catch (err) {
      console.error('Failed to update provider location:', err);
      throw err;
    }
  };

  // Online / accepting-bookings toggle (powers Nearby Providers matching).
  const updateProviderAvailabilityStatus = async ({ isOnline, acceptingBookings }) => {
    try {
      const res = await apiClient.patch('/providers/me/availability-status', { isOnline, acceptingBookings });
      if (res.ok && res.data?.id) {
        setProviders(prev => prev.map(p => p.id === res.data.id ? res.data : p));
        return res.data;
      }
      throw new Error(res.data?.message || res.data?.error || 'Failed to update availability status.');
    } catch (err) {
      console.error('Failed to update availability status:', err);
      throw err;
    }
  };

  // Route optimization: upcoming active bookings ordered into a visit sequence.
  const fetchProviderRoutePlan = async () => {
    const res = await apiClient.get('/providers/me/route-plan');
    return res.ok && res.data ? res.data : { stops: [] };
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

  const toggleFavoriteProvider = async (providerId) => {
    const isSaved = favoriteProviders.includes(providerId);
    // Optimistic update
    setFavoriteProviders(prev =>
      isSaved ? prev.filter(id => id !== providerId) : [...prev, providerId]
    );
    try {
      if (isSaved) {
        await api(`${API_BASE_URL}/saved-pros/${providerId}`, { method: 'DELETE' });
      } else {
        await api(`${API_BASE_URL}/saved-pros`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId })
        });
      }
      await fetchSavedPros();
    } catch (err) {
      console.error('Failed to toggle saved pro:', err);
      // Revert optimistic update on error
      setFavoriteProviders(prev =>
        isSaved ? [...prev, providerId] : prev.filter(id => id !== providerId)
      );
    }
  };

  const submitSupportTicket = async (ticketData) => {
    try {
      const res = await api(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });
      const data = await res.json();
      if (data.id) {
        setTickets(prev => [normalizeTicket(data), ...prev]);
      }
      return data;
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      return { error: 'Network error' };
    }
  };

  const respondToTicket = async (ticketId, responseText) => {
    try {
      const res = await api(`${API_BASE_URL}/admin/tickets/${ticketId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText })
      });
      const data = await res.json();
      if (data.id) {
        setTickets(prev => prev.map(tk => tk.id === ticketId ? data : tk));
      }
    } catch (err) {
      console.error('Failed to respond to ticket:', err);
    }
  };


  const markNotificationAsRead = async (id) => {
    try {
      const res = await api(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.id) {
        setNotifications(prev => prev.map(n => n.id === id ? normalizeNotification(data) : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api(`${API_BASE_URL}/notifications/read-all`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const clearNotifications = async () => {
    try {
      await api(`${API_BASE_URL}/notifications`, { method: 'DELETE' });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const addSystemNotification = async (title, message, type, userId, role) => {
    try {
      const res = await api(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, userId, role })
      });
      const data = await res.json();
      if (data.id) {
        setNotifications(prev => [normalizeNotification(data), ...prev]);
      }
    } catch (err) {
      console.error('Failed to add notification:', err);
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
      // (Backend returns success payload; local user object is updated from existing app only via setCurrentUser.)
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


  const getCustomerLoyaltyTier = (completedCount) => {
    if (completedCount >= 10) {
      return { tier: 'Platinum Star', discountPercent: 12, color: 'text-purple-600 bg-purple-100 border-purple-200', desc: '12% premium automated discount on checkout' };
    } else if (completedCount >= 5) {
      return { tier: 'Gold Shield', discountPercent: 8, color: 'text-amber-600 bg-amber-50 border-amber-200', desc: '8% gold standard discount on checkout' };
    } else if (completedCount >= 2) {
      return { tier: 'Silver Care', discountPercent: 5, color: 'text-slate-600 bg-slate-100 border-slate-200', desc: '5% silver starter discount on checkout' };
    }
    return { tier: 'Bronze Member', discountPercent: 0, color: 'text-teal-700 bg-teal-50 border-teal-100', desc: 'Book more to unlock automatic savings' };
  };

  const sendChatMessage = async (bookingId, text, senderRole) => {
    try {
      const res = await api(`${API_BASE_URL}/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser?.id,
          senderName: currentUser?.name,
          senderRole,
          text,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json();
      if (data.id) {
        const normalized = normalizeBooking(data);
        setBookings(prev => prev.map(bk => bk.id === bookingId ? normalized : bk));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // --- Admin: provider service request approvals ---
  const [providerServiceRequests, setProviderServiceRequests] = useState([]);
  const [providerServiceItems, setProviderServiceItems] = useState([]);

  // Global async action spinner (for booking/admin/provider actions)
  const [actionSpinner, setActionSpinner] = useState({ isOpen: false, message: '' });
  const [connectionStatus, setConnectionStatus] = useState('online');
  const runWithActionSpinner = async (asyncFn, { message = 'Processing...' } = {}) => {
    setActionSpinner({ isOpen: true, message });
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setActionSpinner({ isOpen: false, message: '' });
    }
  };


  const fetchProviderAnalytics = useCallback(async (providerId, range = '90d') => {
    if (!providerId) return null;
    try {
      const res = await api(`${API_BASE_URL}/providers/${providerId}/analytics?range=${encodeURIComponent(range)}`);
      const data = await res.json();
      if (!res.ok) return null;
      return data;
    } catch {
      return null;
    }
  }, []);


  const fetchProviderServiceRequests = async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await api(`${API_BASE_URL}/admin/provider-service-requests?limit=100`);

      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
        setProviderServiceRequests(list);
      } else {
        console.error('Failed to fetch provider service requests:', data);
      }
    } catch (err) {
      console.error('Failed to fetch provider service requests:', err);
    }
  };

  const fetchProviderServiceItems = async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await api(`${API_BASE_URL}/admin/provider-service-items?limit=100`);
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setProviderServiceItems(list);
      } else {
        console.error('Failed to fetch provider service items:', data);
      }
    } catch (err) {
      console.error('Failed to fetch provider service items:', err);
    }
  };


  // Ensure admin can see service requests without clicking Refresh
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchProviderServiceRequests();
      fetchProviderServiceItems();
    } else {
      setProviderServiceRequests([]);
      setProviderServiceItems([]);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);


  const approveProviderServiceRequest = async (serviceRequestId) => {
    if (currentUser?.role !== 'admin') return { error: 'Admin access required' };
    try {
      const res = await api(`${API_BASE_URL}/admin/provider-service-requests/${serviceRequestId}/approve`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProviderServiceRequests();
        await fetchProviderServiceItems();
        await fetchProviders();
        return data;
      }
      return data;
    } catch (err) {
      console.error('Failed to approve provider service request:', err);
      return { error: 'Network error' };
    }
  };

  const denyProviderServiceRequest = async (serviceRequestId, reason) => {
    if (currentUser?.role !== 'admin') return { error: 'Admin access required' };
    try {
      const res = await api(`${API_BASE_URL}/admin/provider-service-requests/${serviceRequestId}/deny`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProviderServiceRequests();
        await fetchProviderServiceItems();
        return data;
      }
      return data;
    } catch (err) {
      console.error('Failed to deny provider service request:', err);
      return { error: 'Network error' };
    }
  };


  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      providers,
      providersByApprovedService,

      bookings,
      notifications,
      tickets,
      selectedCity,
      selectedArea,
      searchQuery,
      selectedCategory,
      login,
      registerUser,
      forgotPassword,
      resetPassword,
      logout,
      setCity,
      setArea,
      setSearchQuery,
      setCategory,
      createBooking,
      updateBookingStatus,
      submitReview,
      verifyProvider,
      updateProviderAvailability,
      updateProviderProfile,
      updateProviderDispatchLocation,
      updateProviderAvailabilityStatus,
      fetchProviderRoutePlan,
      updateUserProfile,
      toggleFavoriteProvider,
      favoriteProviders,
      // fetchProviderServices: not implemented yet in this context
      // registerProviderService: not implemented yet in this context
      submitSupportTicket,
      respondToTicket,
      markNotificationAsRead,
      markAllNotificationsRead,
      clearNotifications,
      addSystemNotification,
      applyReferralCode,
      getCustomerLoyaltyTier,
      sendChatMessage,
      services,
      searchServices,
      createService,
      updateService,
      deleteService,
      hideService,
      fetchProviderAnalytics,

      // admin provider service request approvals
      providerServiceRequests,
      providerServiceItems,
      fetchProviderServiceRequests,
      fetchProviderServiceItems,
      approveProviderServiceRequest,
      denyProviderServiceRequest,
      fetchProvidersByApprovedServiceName,
      fetchProviderAvailability,
      savedProsData,
      fetchSavedPros,

      // global async action spinner
      actionSpinner,
      runWithActionSpinner,
      connectionStatus,
      socketRef,
      isInitializing,
      locationUpdates,
      getBookingLocation,
      shareProviderLocation,
      setProviderDispatchPhase
    }}>






      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};
