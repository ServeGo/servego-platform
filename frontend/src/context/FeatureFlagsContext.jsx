import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api as apiClient } from '../utils/apiClient';

/**
 * Client-side view of the PUBLIC feature flags (`/feature-flags/public`, backed by
 * the ~30s-cached AdminConfig store). Only flags marked `public` reach the browser.
 *
 * This is the ONE place the endpoint is read. App.jsx used to run a second,
 * independent `GET /feature-flags/public` for the announcement banner while this
 * provider fetched the very same payload for the boolean toggles — so every page load
 * asked twice for identical bytes, and the two copies could disagree for a moment
 * after a poll. The announcement fields are exposed here alongside the booleans so
 * there is a single source of truth and a single request.
 *
 * Defaults match the registry defaults so the UI is sane before the first GET.
 *
 * Defaults (mirror backend FEATURE_FLAGS):
 *   - liveTrackingCustomers: true  (customer already saw live tracking)
 *   - liveTrackingProviders: false (provider card shows service address; opt-in)
 *   - chatbotEnabled: true          (Knowledge Assistant widget shown)
 *   - newFeature: disabled announcement banner
 */
const DEFAULT_FLAGS = {
  liveTrackingCustomers: true,
  liveTrackingProviders: false,
  chatbotEnabled: true,
  newFeature: { enabled: false, audience: 'customer', text: '' }
};

const FeatureFlagsContext = createContext(DEFAULT_FLAGS);

export const FeatureFlagsProvider = ({ children }) => {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);

  // Backend config cache TTL is ~30s. Flags change rarely (admin toggles for
  // live-tracking), so a 5-minute poll keeps admin toggles applying to open
  // apps within a few minutes without a full page reload — any reload still
  // picks up the latest value, and the endpoint now also sends Cache-Control so a
  // reload usually does not even reach the origin (rule 14).
  const FLAGS_POLL_MS = 300000;

  const loadFlags = useCallback(() => {
    apiClient
      .get('/feature-flags/public')
      .then((res) => {
        const raw = res.data?.flags || {};
        setFlags({
          liveTrackingCustomers: raw.liveTrackingCustomers === true,
          liveTrackingProviders: raw.liveTrackingProviders === true,
          chatbotEnabled: raw.chatbotEnabled !== false,
          newFeature: {
            enabled: raw.newFeatureEnabled === true,
            audience: raw.newFeatureAudience || 'customer',
            text: raw.newFeatureText || ''
          }
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