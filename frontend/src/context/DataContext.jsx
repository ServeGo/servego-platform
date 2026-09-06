import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  normalizeBooking,
  normalizeBookings,
  normalizeProviders,
  normalizeTicket,
  normalizeTickets,
  normalizeNotification,
  normalizeNotifications,
  normalizeAlert,
  normalizeAlerts,
} from '../utils/normalizeCustomerData';
import { api as apiClient, API_BASE_URL } from '../utils/apiClient';
import { api } from '../utils/apiWrapper';
import { useAuth } from './AuthContext';
import { advanceWatermark, readWatermark } from '../utils/reconnectWatermark';
import { getErrorMessage } from '../utils/errorMessages';

const DataContext = createContext(undefined);

export const DataProvider = ({ children }) => {
  const { currentUser, setCurrentUser } = useAuth();

  // Database of users - purely for local dev fallback or admin view if needed
  const [users, setUsers] = useState([]);

  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [providersByApprovedService, setProvidersByApprovedService] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  // The provider's own dashboard summary (`GET /providers/me/summary`) — the
  // purpose-specific contract for the owner screens (header, profile, reviews,
  // wallet ambassador). Falls back to the providers list while loading.
  const [myProviderSummary, setMyProviderSummary] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Ids of notifications already surfaced through any channel (socket event,
  // REST refresh, optimistic create). One notification is created once with a
  // stable id (`ntf_...`) and may reach the client via socket + REST + DB poll;
  // the shared seen-set guarantees it is rendered — and toasts/badge fire —
  // exactly once. Bounded to the most recent 1000 ids.
  const seenNotificationIdsRef = useRef(new Set());

  // Same dedupe for temporary alerts (socket + REST + poll arrive separately).
  const seenAlertIdsRef = useRef(new Set());

  // In-flight booking status transitions (`bookingId:status`), so a physical
  // double-click on a destructive action (cancel, complete, start work) cannot
  // fan out a duplicate PATCH while the first one is still in the air.
  const pendingStatusTransitions = useRef(new Set()).current;

  const dedupeNotifications = useCallback((incoming) => {
    const seen = seenNotificationIdsRef.current;
    const fresh = [];
    for (const n of incoming) {
      if (!n?.id || seen.has(n.id)) continue;
      seen.add(n.id);
      fresh.push(n);
    }
    if (seen.size > 1000) {
      for (const id of Array.from(seen).slice(0, seen.size - 1000)) seen.delete(id);
    }
    return fresh;
  }, []);

  const clearSeenNotifications = useCallback(() => {
    seenNotificationIdsRef.current.clear();
  }, []);

  // Prepend a live (socket-delivered) notification only if it has not already
  // been surfaced. Returns true when the notification is genuinely new so the
  // caller can fire a toast / badge increment exactly once.
  const addLiveNotification = useCallback((notif) => {
    const normalized = normalizeNotification(notif);
    if (!normalized?.id || seenNotificationIdsRef.current.has(normalized.id)) return false;
    seenNotificationIdsRef.current.add(normalized.id);
    setNotifications(prev => (prev.some(n => n.id === normalized.id) ? prev : [normalized, ...prev]));
    return true;
  }, []);

  // Prepend a socket-delivered alert only if it has not already been surfaced
  // (the same alert also lands via REST refresh). Idempotent, like
  // addLiveNotification; no toast here — the Alerts tab badge carries the signal
  // and the matching notification already toasts through the socket handler.
  const addLiveAlert = useCallback((alert) => {
    const normalized = normalizeAlert(alert);
    if (!normalized?.id || seenAlertIdsRef.current.has(normalized.id)) return false;
    seenAlertIdsRef.current.add(normalized.id);
    setAlerts(prev => (prev.some(a => a.id === normalized.id) ? prev : [normalized, ...prev]));
    return true;
  }, []);

  const providersRef = useRef([]);
  const bookingsRef = useRef([]);

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

  const fetchProviders = useCallback(async () => {
    try {
      const res = await api(`${API_BASE_URL}/providers`);
      const data = await res.json();
      setProviders(normalizeProviders(data));
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  }, []);

  const fetchMyProviderSummary = useCallback(async () => {
    if (currentUser?.role !== 'provider' || !currentUser?.id) {
      setMyProviderSummary(null);
      return;
    }
    try {
      const res = await apiClient.get('/providers/me/summary');
      if (res.ok && res.data?.id) {
        setMyProviderSummary(res.data);
      } else {
        setMyProviderSummary(null);
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch provider dashboard summary', err?.message || err);
      setMyProviderSummary(null);
    }
  }, [currentUser?.role, currentUser?.id]);

  // Keep providersRef in sync so fetchBookings always reads latest providers
  useEffect(() => {
    providersRef.current = providers;
  }, [providers]);

  // Keep bookingsRef in sync so real-time socket handlers can synchronously
  // check whether a booking exists before deciding to patch vs. fetch.
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const res = await api(`${API_BASE_URL}/services`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const searchServices = useCallback(async (query = '', location = '', signal) => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (location.trim()) params.set('location', location.trim());
      const suffix = params.toString();
      const res = await api(`${API_BASE_URL}/services/search${suffix ? `?${suffix}` : ''}`, { signal });
      const data = await res.json();
      // Aborted requests return null so the caller never renders a stale or
      // empty result for a keystroke that was superseded.
      if (res.error?.name === 'AbortError') return null;
      return res.ok && Array.isArray(data) ? data : [];
    } catch (err) {
      if (err?.name === 'AbortError') return null;
      console.error('Failed to search services:', err);
      return [];
    }
  }, []);

  // --- Granular single-booking updates (real-time socket events) ---
  // Status changes / assignments patch one booking instead of refetching the
  // whole list. The 30s poll in RealtimeContext remains the safety net.

  // Replace a booking in local state, or prepend it when not present yet.
  // Declared before fetchBookings because the resync path uses it to merge.
  const mergeBooking = useCallback((booking) => {
    if (!booking?.id) return;
    const normalized = normalizeBooking(booking);
    setBookings(prev => {
      const idx = prev.findIndex(b => b.id === normalized.id);
      if (idx === -1) return [normalized, ...prev];
      const next = [...prev];
      next[idx] = normalized;
      return next;
    });
  }, []);

  const fetchBookings = useCallback(async ({ updatedAfter = null, merge = false } = {}) => {
    if (!currentUser?.id) {
      setBookings([]);
      return;
    }

    try {
      // Backend GET /bookings already scopes by role (admin=all, customer=own, provider=own).
      // Keep this as a bounded cursor snapshot for dashboard counts/analytics; the
      // booking list screens page independently via cursor pagination.
      const params = new URLSearchParams({ mode: 'cursor', limit: '25' });
      if (updatedAfter) params.set('updatedAfter', updatedAfter); // incremental reconnect resync
      const res = await api(`${API_BASE_URL}/bookings?${params.toString()}`);
      const data = await res.json();

      const bookingsArray = normalizeBookings(data);

      const scopeForRole = (list) => {
        if (currentUser?.role === 'admin') return list;
        if (currentUser?.role === 'provider') {
          const providerIds = [currentUser?.providerId, currentUser?.id].filter(Boolean);
          // Use ref to always read latest providers — avoids stale closure in socket/poll handlers
          const currentProviders = providersRef.current;
          const providerMatch = currentProviders.find((p) => providerIds.includes(p.id) || providerIds.includes(p.userId));
          const providerId = providerMatch?.id || currentUser?.providerId || currentUser?.id;
          const matchedIds = [providerId, currentUser?.providerId, currentUser?.id].filter(Boolean);
          return list.filter((b) => {
            const bookingProviderId = b.providerId || b.provider?.id || b.provider?.userId;
            return matchedIds.includes(bookingProviderId);
          });
        }
        return list.filter((b) => b.customerId === currentUser.id);
      };

      const scoped = scopeForRole(bookingsArray);

      if (merge) {
        // Incremental reconnect resync: upsert only the rows the server says
        // changed while we were offline; never blank the visible list.
        scoped.forEach(mergeBooking);
      } else {
        setBookings(scoped);
      }

      // Reconnect watermark: keep the highest server updatedAt seen so a later
      // reconnect can re-sync incrementally instead of a full refetch.
      const maxUpdatedAt = scoped.reduce(
        (max, b) => (b.updatedAt && (!max || b.updatedAt > max) ? b.updatedAt : max),
        null
      );
      if (maxUpdatedAt) advanceWatermark(currentUser.id, { bookingsAfter: maxUpdatedAt });
    } catch (err) {
      // Keep the last-known list during an outage (rule 23: stale-but-visible
      // beats a blank screen); the reconnect resync replaces it afterwards.
      console.error('Failed to fetch bookings:', err);
    }
  }, [currentUser?.id, currentUser?.providerId, currentUser?.role, mergeBooking]);

  // Patch just the status (and optional extra fields) of a booking already in
  // local state. Keeps `_raw` consistent so downstream renderers stay coherent.
  const patchBookingStatus = useCallback((bookingId, status, extra = {}) => {
    if (!bookingId) return;
    const normalizedStatus = String(status || '').toLowerCase();
    if (!normalizedStatus) return;
    setBookings(prev => prev.map(b => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: normalizedStatus,
        ...extra,
        _raw: b._raw ? { ...b._raw, status } : b._raw
      };
    }));
  }, []);

  const removeBooking = useCallback((bookingId) => {
    if (!bookingId) return;
    setBookings(prev => prev.filter(b => b.id !== bookingId));
  }, []);

  // Apply an in-place patch from a live socket payload (e.g. leadAccepted /
  // leadRejected carrying { bookingId, booking: { status }, provider }).
  // Returns true when the booking exists in local state and was patched, so
  // callers can fall back to refreshBooking for ids they have not loaded yet.
  const applyBookingSocketUpdate = useCallback((bookingId, { status, provider } = {}) => {
    if (!bookingId) return false;
    const exists = bookingsRef.current.some(b => b.id === bookingId);
    if (!exists) return false;
    setBookings(prev => prev.map(b => {
      if (b.id !== bookingId) return b;
      const next = { ...b };
      if (status) next.status = String(status).toLowerCase();
      if (provider?.id) {
        next.providerId = provider.id;
        next.providerName = provider.name || next.providerName || 'Assigned Specialist';
        next.provider = {
          id: provider.id,
          user: { id: provider.userId, name: provider.name, avatar: null },
        };
      }
      if (status && b._raw) next._raw = { ...b._raw, status };
      return next;
    }));
    return true;
  }, []);

  // Re-fetch one booking and merge the canonical record — 1 request instead of
  // the whole list. Used when an event changes more than the status (assignment).
  const refreshBooking = useCallback(async (bookingId) => {
    if (!bookingId) return null;
    try {
      const res = await apiClient.get(`/bookings/${bookingId}`);
      if (res.ok && res.data?.id) {
        mergeBooking(res.data);
        return res.data;
      }
      return null;
    } catch (err) {
      console.warn('[DataContext] Failed to refresh booking', bookingId, err?.message || err);
      return null;
    }
  }, [mergeBooking]);

  const fetchNotifications = useCallback(async ({ after = null } = {}) => {
    try {
      const params = new URLSearchParams();
      if (after) params.set('after', after); // incremental reconnect resync
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api(`${API_BASE_URL}/notifications${query}`);
      const data = await res.json();
      const normalized = normalizeNotifications(data);
      // Merge instead of replace: rows already surfaced live via socket stay
      // put, and DB rows are appended only when their id is not already shown.
      setNotifications(prev => {
        const known = new Set(prev.map(n => n.id));
        const fresh = dedupeNotifications(normalized).filter(n => !known.has(n.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      // Reconnect watermark: keep the highest server createdAt seen so a later
      // reconnect can pull `?after=` instead of a full list.
      const maxCreated = normalized.reduce((max, n) => {
        const ts = n.createdAt || n.timestamp;
        return ts && (!max || ts > max) ? ts : max;
      }, null);
      if (maxCreated && currentUser?.id) advanceWatermark(currentUser.id, { notificationsAfter: maxCreated });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [dedupeNotifications, currentUser?.id]);

  // Unreviewed alerts are read-once rows kept on the backend until reviewed
  // (reviewing DELETES them), so a fresh fetch is the canonical snapshot and
  // merge is unnecessary — replace the local list.
  const fetchAlerts = useCallback(async () => {
    if (!currentUser?.id) {
      setAlerts([]);
      return;
    }
    try {
      const res = await apiClient.get('/alerts');
      if (res.ok) {
        const normalized = normalizeAlerts(res.data?.alerts || res.data);
        normalized.forEach(a => seenAlertIdsRef.current.add(a.id));
        setAlerts(normalized);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, [currentUser?.id]);

  // Review (consume) one alert: the server deletes it, the socket broadcasts
  // `alert:reviewed` to the recipient's other devices, and we drop the local row.
  const reviewAlert = useCallback(async (alertId) => {
    if (!alertId) return { ok: false };
    try {
      const res = await apiClient.delete(`/alerts/${alertId}`);
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        return { ok: true, alertId };
      }
      if (res.data?.code === 'ALERT_NOT_FOUND') {
        // Already reviewed elsewhere — remove the stale row, it is not an error.
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        return { ok: true, alertId };
      }
      return { ok: false, error: res.data?.message || 'Unable to review this alert.' };
    } catch (err) {
      console.error('Failed to review alert:', err);
      return { ok: false, error: 'Could not reach the server. Try again.' };
    }
  }, []);

  const reviewAllAlerts = useCallback(async () => {
    try {
      const res = await apiClient.delete('/alerts');
      if (res.ok) {
        seenAlertIdsRef.current.clear();
        setAlerts([]);
        return { ok: true };
      }
      return { ok: false, error: res.data?.message || 'Unable to clear your alerts.' };
    } catch (err) {
      console.error('Failed to clear alerts:', err);
      return { ok: false, error: 'Could not reach the server. Try again.' };
    }
  }, []);

  // Cross-device sync helpers for the `alert:reviewed` / `alert:cleared` socket
  // events. The alert was already deleted server-side by the device that acted;
  // here we only drop/clear the local row — no extra DELETE round-trip.
  const removeAlertSilently = useCallback((alertId) => {
    if (!alertId) return;
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const clearAlertsSilently = useCallback(() => {
    seenAlertIdsRef.current.clear();
    setAlerts([]);
  }, []);

  // Realtime connection recovery (rule 23): called by RealtimeContext on
  // reconnect. Pulls everything the server says changed after our lastSeen
  // watermark; falls back to a full refetch when no watermark exists yet.
  const resyncAfterReconnect = useCallback(async () => {
    if (!currentUser?.id) return;
    const watermark = readWatermark(currentUser.id);
    if (watermark?.notificationsAfter) {
      await fetchNotifications({ after: watermark.notificationsAfter });
    } else {
      await fetchNotifications();
    }
    // Alerts are read-once rows — just refresh the canonical list; anything
    // reviewed while offline is gone server-side and anything missed via socket
    // is pulled back in.
    await fetchAlerts();
    if (watermark?.bookingsAfter) {
      await fetchBookings({ updatedAfter: watermark.bookingsAfter, merge: true });
    } else {
      await fetchBookings();
    }
  }, [currentUser?.id, fetchNotifications, fetchBookings, fetchAlerts]);

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
      const res = await api(`${API_BASE_URL}/services/${id}?confirm=true`, {
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

  useEffect(() => {
    // Always fetch public catalog (services) so the home page works unauthenticated.
    fetchServices();

    if (currentUser?.id) {
      fetchProviders();
      fetchNotifications();
      fetchAlerts();
      fetchBookings();
      fetchTickets();
      if (currentUser?.role === 'provider') fetchMyProviderSummary();
    } else {
      setNotifications([]);
      setAlerts([]);
      setBookings([]);
      setTickets([]);
      setProviders([]);
      setProvidersByApprovedService([]);
      setMyProviderSummary(null);
      clearSeenNotifications();
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
        return { error: getErrorMessage(data, 'Booking failed.') };
      }
      // Backend returns { booking, lead } under `data`; normalize the booking
      // itself so the caller receives the flat booking object it expects.
      const booking = data?.booking || data;
      if (booking?.id) {
        const normalized = normalizeBooking(booking);
        setBookings(prev => [normalized, ...prev]);
        return normalized;
      }
      return { error: getErrorMessage(data, 'Booking failed.') };
    } catch (err) {
      console.error('Failed to create booking:', err);
      return { error: getErrorMessage(err, 'Booking failed.') };
    }
  };

  const updateBookingStatus = async (bookingId, status, note, verificationCode) => {
    const targetStatus = String(status || '').toLowerCase();
    const existing = bookings.find(b => b.id === bookingId);

    // Rule 18 — idempotency: a second click/retry on a booking that is already
    // in the requested state is a benign no-op (no duplicate side effects).
    if (existing && String(existing.status || '').toLowerCase() === targetStatus) {
      return existing;
    }

    const inFlightKey = `${bookingId}:${targetStatus}`;
    if (pendingStatusTransitions.has(inFlightKey)) return existing;
    pendingStatusTransitions.add(inFlightKey);

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
      // NO_CHANGE means the transition raced with another client or this very
      // booking already reached the target state server-side — treat it as
      // success (the current row is correct), never a scary "already handled".
      if (data?.code === 'NO_CHANGE' && existing) {
        return existing;
      }
      // Backend failures arrive as { success:false, code, message } — resolve a
      // friendly, actionable line instead of dropping the code (rule 19).
      return { error: getErrorMessage(data, 'Unable to update this booking.') };
    } catch (err) {
      console.error('Failed to update booking status:', err);
      return { error: getErrorMessage(err, 'Unable to update this booking.') };
    } finally {
      pendingStatusTransitions.delete(inFlightKey);
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
        fetchMyProviderSummary(); // Refresh the owner dashboard review audit
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
        // Keep the auth user's avatar in sync so the navbar/app avatar updates
        // the moment a provider saves a new profile photo (the provider PATCH
        // writes to user.avatar via the backend transaction).
        const newAvatar = data?.user?.avatar;
        if (newAvatar !== undefined && newAvatar !== null) {
          setCurrentUser(prev => (prev ? { ...prev, avatar: newAvatar } : prev));
        }
        fetchMyProviderSummary();
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
        fetchMyProviderSummary();
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
        fetchMyProviderSummary();
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
      const body = await res.json();
      const data = body?.data || body;
      if (res.ok && data?.id) {
        setNotifications(prev => prev.map(n => n.id === id ? normalizeNotification(data) : n));
        return;
      }
      // 404 = the row was already deleted server-side (cleared/read elsewhere).
      // Drop the stale row locally instead of piling up console noise — this
      // is the normal recovery path, not an error.
      if (res.status === 404) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        clearSeenNotifications();
        return;
      }
      console.error('Failed to mark notification as read:', body?.message || body?.code || res.status);
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
      clearSeenNotifications();
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
      const normalized = normalizeNotification(data?.notification || data);
      // The same notification also arrives over the socket — dedupe on id so
      // the optimistic add and the live event never double up.
      if (normalized?.id) {
        setNotifications(prev => {
          if (prev.some(n => n.id === normalized.id)) return prev;
          seenNotificationIdsRef.current.add(normalized.id);
          return [normalized, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to add notification:', err);
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
      const res = await apiClient.post(`/bookings/${bookingId}/messages`, {
        senderId: currentUser?.id,
        senderName: currentUser?.name,
        senderRole,
        text,
        timestamp: new Date().toISOString()
      });
      if (res.ok && res.data?.id) {
        const normalized = normalizeBooking(res.data);
        setBookings(prev => prev.map(bk => bk.id === bookingId ? normalized : bk));
        return { ok: true };
      }
      return {
        ok: false,
        error:
          (res.data && (res.data.message || res.data.error)) ||
          'Could not send the message. Please try again.'
      };
    } catch (err) {
      console.error('Failed to send message:', err);
      return {
        ok: false,
        error: 'Could not send the message. Please check your connection and try again.'
      };
    }
  };

  // --- Admin: provider service request approvals ---
  const [providerServiceRequests, setProviderServiceRequests] = useState([]);
  const [providerServiceItems, setProviderServiceItems] = useState([]);

  const fetchProviderAnalytics = useCallback(async (providerId, range = '90d') => {
    if (!providerId) return null;
    try {
      const res = await api(`${API_BASE_URL}/providers/${providerId}/analytics?range=${encodeURIComponent(range)}`);
      const body = await res.json();
      if (!res.ok) return null;
      // `api` (apiWrapper) routes through apiClient, which already unwraps the
      // `{ success, data }` envelope — so the analytics object is `body` itself.
      // Handle both raw and unwrapped shapes defensively.
      const resource = body?.data ?? body;
      return resource && typeof resource === 'object' ? resource : null;
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
    <DataContext.Provider value={{
      users,
      providers,
      providersByApprovedService,
      myProviderSummary,
      bookings,
      notifications,
      tickets,
      services,
      servicesLoading,
      providerServiceRequests,
      providerServiceItems,
      fetchProvidersByApprovedServiceName,
      fetchProviders,
      fetchMyProviderSummary,
      fetchServices,
      searchServices,
      fetchBookings,
      // granular single-booking helpers consumed by real-time socket handlers
      mergeBooking,
      patchBookingStatus,      removeBooking,
      applyBookingSocketUpdate,
      refreshBooking,
      fetchNotifications,
      // temporary alerts (read-once, deleted on review)
      alerts,
      fetchAlerts,
      reviewAlert,
      reviewAllAlerts,
      removeAlertSilently,
      clearAlertsSilently,
      // realtime connection recovery (rule 23)
      resyncAfterReconnect,
      fetchTickets,
      fetchUsers,
      createService,
      updateService,
      deleteService,
      hideService,
      createBooking,
      updateBookingStatus,
      submitReview,
      verifyProvider,
      updateProviderProfile,
      updateProviderDispatchLocation,
      updateProviderAvailabilityStatus,
      fetchProviderRoutePlan,
      submitSupportTicket,
      respondToTicket,
      markNotificationAsRead,
      markAllNotificationsRead,
      clearNotifications,
      addSystemNotification,
      getCustomerLoyaltyTier,
      sendChatMessage,
      fetchProviderAnalytics,
      fetchProviderServiceRequests,
      fetchProviderServiceItems,
      approveProviderServiceRequest,
      denyProviderServiceRequest,
      // Dedupe-aware live-notification prepend for RealtimeProvider.
      addLiveNotification,
      addLiveAlert
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used inside a DataProvider');
  }
  return context;
};
