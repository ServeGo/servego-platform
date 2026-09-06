import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api as apiClient, SOCKET_URL } from '../utils/apiClient';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { useToast } from './ToastContext';
import { advanceWatermark } from '../utils/reconnectWatermark';

const RealtimeContext = createContext(undefined);

const getStoredAuthToken = () => {
  try {
    return localStorage.getItem('servego_token');
  } catch {
    return null;
  }
};

// Keep as the last-resort fallback target when the primary (deployed) socket
// cannot establish a connection.
const LOCAL_SOCKET_URL = 'http://localhost:4000';

// Live-location throttle: browser GPS fixes can arrive ~1/sec, but pushing every
// tick over the socket/REST is wasteful. A fix is only sent when enough time has
// elapsed OR the provider moved a meaningful distance — this cuts battery,
// network, socket and server load without hurting tracking UX. The backend
// (trackingService) applies its own minimum-interval as a second gate.
const LOCATION_MIN_INTERVAL_MS = 8000;
const LOCATION_MIN_DISTANCE_M = 30;

export const RealtimeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const {
    fetchBookings,
    fetchNotifications,
    resyncAfterReconnect,
    fetchServices,
    fetchProviderServiceRequests,
    addLiveNotification,
    addLiveAlert,
    removeAlertSilently,
    clearAlertsSilently,
    patchBookingStatus,
    applyBookingSocketUpdate,
    refreshBooking,
    removeBooking,
  } = useData();

  const socketRef = useRef(null);

  // True once the socket has connected for this user at least once. The very
  // first connect is skipped by the reconnect resync because the data-fetch
  // effect already pulled an initial snapshot — resyncing again would just
  // double the requests.
  const hasConnectedOnceRef = useRef(false);

  // Latest live location per booking, keyed by booking id.
  // { [bookingId]: { latitude, longitude, timestamp, etaMinutes, distanceKm } }
  const [locationUpdates, setLocationUpdates] = useState({});

  const [connectionStatus, setConnectionStatus] = useState('online');

  // Last successfully sent fix per booking, used by the live-location throttle.
  const lastSentLocationRef = useRef({});

  const getBookingLocation = useCallback((bookingId) => {
    return locationUpdates[bookingId] || null;
  }, [locationUpdates]);

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

      // Granular real-time updates — patch the single affected booking in local
      // state instead of refetching the whole list. The 30s poll below is the
      // safety net that guarantees eventual consistency if an event is missed.
      // Booking status events all carry { bookingId, status }.
      const patchBookingEvent = (payload) => {
        const bookingId = payload?.bookingId;
        const status = payload?.status || payload?.booking?.status;
        patchBookingStatus(bookingId, status);
      };
      // Assignment events (buildLeadPayload) carry { bookingId, booking: { status },
      // provider, ... }. Patch the booking in place from the payload — no fetch.
      // Only when the id is not yet in local state do we fetch the canonical record.
      const handleAssignmentEvent = (payload) => {
        const bookingId = payload?.bookingId ?? payload?.booking?.id;
        if (!bookingId) return;
        const patched = applyBookingSocketUpdate(bookingId, {
          status: payload?.booking?.status || payload?.status,
          provider: payload?.provider,
        });
        if (!patched) refreshBooking(bookingId);
      };
      socket.on('bookingUpdated', patchBookingEvent);       // customer: { bookingId, status, serviceCategory }
      socket.on('bookingStatusChanged', patchBookingEvent); // provider: { bookingId, status, serviceCategory }
      socket.on('booking:statusChanged', patchBookingEvent); // both: { bookingId, status }
      socket.on('booking:cancelled', patchBookingEvent);    // both: { bookingId, status: 'CANCELLED' }
      socket.on('booking:created', handleAssignmentEvent);  // customer: { bookingId, status }
      // Provider accepted a broadcast lead — customer sees the booking move
      // from pending (waiting) to confirmed with the accepting provider.
      socket.on('leadAccepted', handleAssignmentEvent);     // customer: buildLeadPayload
      socket.on('leadRejected', handleAssignmentEvent);     // customer: buildLeadPayload
      socket.on('leadAssignmentFailed', handleAssignmentEvent); // customer: buildLeadPayload
      // Another provider accepted first — the offer and the booking it was
      // pointed at are no longer this provider's, so drop the stale row.
      socket.on('leadCancelled', (payload) => {
        removeBooking(payload?.bookingId ?? payload?.booking?.id);
      });
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
        patchBookingStatus(payload.bookingId, payload.status, { providerPhase: payload.providerPhase });
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
      // A quotation was submitted/revised for one of my bookings — pull the
      // canonical record so the quotation panel (and its total) appears fresh
      // without waiting for the 30s poll.
      socket.on('quotation', (payload) => {
        const bookingId = payload?.bookingId;
        if (!bookingId) return;
        refreshBooking(bookingId);
      });
      // Refresh service catalog when a provider service is approved (active-specialist count changes)
      socket.on('serviceApproved', () => fetchServices());
      // Admin: refresh pending service requests when a new one arrives
      if (currentUser?.role === 'admin') {
        socket.on('newApprovalRequest', () => fetchProviderServiceRequests());
      }

      // Live in-app notification. `addLiveNotification` dedupes on the stable
      // notification id (same notification also lands via REST refresh + the DB
      // poll), so the toast fires only for genuinely new events — never 3×.
      socket.on('notification', (notif) => {
        if (notif.userId === currentUser.id && addLiveNotification(notif)) {
          showToast({ title: notif.title, message: notif.message, type: notif.type });
        }
        // Advance the reconnect watermark from the server's createdAt so a
        // later reconnect can resync with `?after=` instead of a full list.
        const serverTs = notif?.createdAt || notif?.timestamp;
        if (serverTs) advanceWatermark(currentUser.id, { notificationsAfter: serverTs });
      });

      // Temporary alerts (read-once rows). The socket is the fast path — the
      // DataContext dedupe + the FETCH on mount/reconnect are the reconciliation
      // path, so a missed event is never silently lost (rule 23).
      socket.on('alert', (alert) => {
        if (alert?.userId === currentUser.id) addLiveAlert(alert);
      });
      socket.on('alert:reviewed', (payload) => {
        if (payload?.alertId) removeAlertSilently(payload.alertId);
      });
      socket.on('alert:cleared', () => {
        clearAlertsSilently();
      });

      socket.on('connect', () => {
        setConnectionStatus('online');
        // CRITICAL (rule 23): without this emit the server never runs its
        // `join`/`authenticate` handlers, so no user:<> room exists and every
        // `io.to('user:...')` broadcast is silently dropped. Re-emitting on
        // every (re)connect re-joins the rooms after Socket.IO re-establishes.
        const token = getStoredAuthToken();
        if (token) socket.emit('authenticate', token);

        const firstConnect = !hasConnectedOnceRef.current;
        hasConnectedOnceRef.current = true;
        if (!firstConnect) {
          // We were offline and missed live events. Pull everything the server
          // says changed after our lastSeen watermark and merge it in, so no
          // status change / assignment / notification is lost. If the server
          // resync fails, the 30s poll below is the eventual-consistency net.
          resyncAfterReconnect().catch((err) => {
            console.warn('Reconnect resync failed:', err?.message || err);
          });
        }
      });

      socket.on('disconnect', () => {
        // Wi-Fi dropped / server hiccup. Surface it (banner in App layout) and
        // let Socket.IO auto-reconnect; `connect` above resyncs missed state.
        setConnectionStatus('reconnecting');
        console.info('Socket disconnected — waiting to reconnect');
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

    // Poll bookings every 30s — initial fetch already handled by the data-fetch effect above
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

  const haversineMeters = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
  };

  // A fix is worth sending when it is the first one, enough time elapsed since
  // the last send, or the provider moved a meaningful distance in between.
  const shouldSendLocation = useCallback((bookingId, latitude, longitude, now = Date.now()) => {
    const prev = lastSentLocationRef.current[bookingId];
    if (!prev) return true;
    if (now - prev.t >= LOCATION_MIN_INTERVAL_MS) return true;
    if (haversineMeters(prev.lat, prev.lng, latitude, longitude) >= LOCATION_MIN_DISTANCE_M) return true;
    return false;
  }, []);

  const recordSentLocation = useCallback((bookingId, latitude, longitude, now = Date.now()) => {
    lastSentLocationRef.current[bookingId] = { t: now, lat: latitude, lng: longitude };
  }, []);

  /**
   * Provider pushes a live location fix for an active booking.
   * GPS ticks are throttled client-side (time + movement gates) so we do not
   * flood the network. Prefers the real-time socket (with ack); falls back to
   * REST when the socket is not connected so tracking keeps working in degraded
   * mode. Returns { ok: false, dropped: true } when a tick was filtered out.
   */
  const shareProviderLocation = useCallback(async (bookingId, latitude, longitude, accuracy) => {
    if (!bookingId) return { ok: false, error: 'Booking ID is required.' };
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, error: 'Valid coordinates are required.' };
    }
    if (!shouldSendLocation(bookingId, latitude, longitude)) {
      return { ok: false, dropped: true };
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
              accuracy: accuracy ?? prev[bookingId]?.accuracy ?? null,
              routePolyline: ack.data.routePolyline || null,
              providerPhase: ack.data.providerPhase || prev[bookingId]?.providerPhase || null,
              status: ack.data.status
            }
          }));
          recordSentLocation(bookingId, latitude, longitude);
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
            accuracy: accuracy ?? prev[bookingId]?.accuracy ?? null,
            routePolyline: res.data.routePolyline || null,
            providerPhase: res.data.providerPhase || prev[bookingId]?.providerPhase || null,
            status: res.data.status
          }
        }));
        recordSentLocation(bookingId, latitude, longitude);
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
  const setProviderDispatchPhase = useCallback(async (bookingId, phase, source) => {
    if (!bookingId) return { ok: false, error: 'Booking ID is required.' };
    const event = phase === 'ARRIVED' ? 'provider:arrived' : 'provider:onTheWay';
    const socket = socketRef?.current;
    if (socket?.connected) {
      try {
        const ack = await new Promise((resolve) => {
          socket.emit(event, { bookingId, source }, resolve);
          setTimeout(() => resolve({ ok: false, error: 'tracking:timeout' }), 5000);
        });
        if (ack?.ok && ack?.data) {
          setLocationUpdates((prev) => ({
            ...prev,
            [bookingId]: {
              ...(prev[bookingId] || {}),
              providerPhase: ack.data.providerPhase,
              arrivedSource: ack.data.arrivedSource,
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
      const res = await apiClient.post(path, { source });
      if (res.ok && res.data) {
        setLocationUpdates((prev) => ({
          ...prev,
          [bookingId]: {
            ...(prev[bookingId] || {}),
            providerPhase: res.data.providerPhase,
            arrivedSource: res.data.arrivedSource,
            status: res.data.status || prev[bookingId]?.status || null
          }
        }));
      }
      return { ok: res.ok, error: res.data?.message, data: res.data };
    } catch (err) {
      return { ok: false, error: err?.message || `Network error while updating ${phase}.` };
    }
  }, []);

  return (
    <RealtimeContext.Provider value={{
      socketRef,
      connectionStatus,
      locationUpdates,
      getBookingLocation,
      shareProviderLocation,
      setProviderDispatchPhase
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used inside a RealtimeProvider');
  }
  return context;
};
