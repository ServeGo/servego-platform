import React, { Suspense, lazy } from 'react';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

// The assistant's UI is a separate chunk, pulled in only when the `chatbotEnabled` flag
// is on AND the user actually opens the panel. Gating before the import means a disabled
// assistant costs zero bytes rather than just rendering nothing.
const ChatWidget = lazy(() => import('./ChatWidget'));

/**
 * Global entry point for the ServeGo24 Knowledge Assistant.
 *
 * Rendered once in App (both the main and admin layouts) so it is available on every
 * page. Controlled by the admin-visible `chatbotEnabled` feature flag, so the assistant
 * can be switched off without a redeploy.
 */
export default function KnowledgeAssistant() {
  const { chatbotEnabled } = useFeatureFlags();

  if (!chatbotEnabled) return null;

  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
}
