import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api as apiClient } from '../utils/apiClient';

/**
 * Client-side view of the PUBLIC feature flags (`/feature-flags/public`, backed
 * by the ~30s-cached AdminConfig store). Only flags marked `public` reach the
 * browser — the amount, audience and message live in App.jsx's own siteFlags
 * fetch, while the boolean runtime toggles the deep components need (live
 * tracking on customer bookings / provider Active Duty cards) read them here.
 * Defaults match the registry defaults so the UI is sane before the first GET.
 *
 * Defaults (mirror backend FEATURE_FLAGS):
 *   - liveTrackingCustomers: true  (customer already saw live tracking)
 *   - liveTrackingProviders: false (provider card shows service address; opt-in)
 */
const DEFAULT_FLAGS = {
  liveTrackingCustomers: true,
  liveTrackingProviders: false
};

const FeatureFlagsContext = createContext(DEFAULT_FLAGS);

export const FeatureFlagsProvider = ({ children }) => {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);

  // Backend config cache TTL is ~30s; a 60s poll keeps admin toggles applying
  // to open apps without a full page reload (rule 14).
  const FLAGS_POLL_MS = 60000;

  const loadFlags = useCallback(() => {
    apiClient
      .get('/feature-flags/public')
      .then((res) => {
        const raw = res.data?.flags || {};
        setFlags({
          liveTrackingCustomers: raw.liveTrackingCustomers === true,
          liveTrackingProviders: raw.liveTrackingProviders === true
        });
      })
      .catch(() => {
        // fail open — keep the sane defaults (rule 19: never a raw error).
      });
  }, []);

  useEffect(() => {
    loadFlags();
    const id = window.setInterval(loadFlags, FLAGS_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadFlags]);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);