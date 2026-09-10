import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { enableNotifications } from '../notifications';
import { api } from '../utils/apiClient';
import { getErrorInfo } from '../utils/errorMessages';

const STORAGE_KEY = 'servego_notifications_enabled';

/**
 * Rule 19/20/16 — "Enable Notifications" button for customer + provider
 * dashboards. On click it requests browser permission, registers the
 * firebase-messaging service worker, obtains an FCM token via
 * `enableNotifications()` and POSTs it to the backend. The button stays
 * disabled + "Enabling…" while the request is in flight and only flips to the
 * confirmed state once the server writes the token (never optimistic for the
 * permission write).
 */
export default function NotificationToggle({ className = '' }) {
  const [status, setStatus] = useState('idle');
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (
      localStorage.getItem(STORAGE_KEY) === 'true' &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      setEnabled(true);
    }
  }, []);

  const handleEnable = async () => {
    setStatus('enabling');
    setError('');

    const token = await enableNotifications();
    if (!token) {
      setStatus('idle');
      setError(
        typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'Notifications are blocked in your browser. Allow them in your browser settings, then try again.'
          : 'Your browser does not support notifications, or the permission was denied.'
      );
      return;
    }

    const res = await api.post('/notifications/register-token', { token, enabled: true });
    if (!res.ok) {
      const info = getErrorInfo(res.data, 'We could not save your notification preference. Please try again.');
      setStatus('idle');
      setError(info.message);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // storage may be unavailable; in-app state still reflects the server write
    }
    setEnabled(true);
    setStatus('done');
  };

  if (enabled) {
    return (
      <div className={`inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2 rounded-xl ${className}`}>
        <BellRing className="w-4 h-4" />
        Notifications enabled
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-start gap-1.5 ${className}`}>
      <button
        onClick={handleEnable}
        disabled={status === 'enabling'}
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
      >
        {status === 'enabling' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enabling…
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            Enable Notifications
          </>
        )}
      </button>
      {error && <span className="text-rose-600 text-[10px] font-semibold max-w-xs leading-snug">{error}</span>}
    </div>
  );
}