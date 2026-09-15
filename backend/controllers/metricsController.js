import { sendApiSuccess } from '../utils/response.js';
import { snapshot } from '../utils/telemetry/metrics.js';

/**
 * In-process observability metrics. Purely in-memory — no DB reads/writes —
 * so this endpoint is cheap even under load. Snapshots answer the operational
 * questions: which API is slow, error rate, p95/p99 latency, error code
 * distribution, queue/email counters.
 */
export const MetricsController = {
  getMetrics: (_req, res) => sendApiSuccess(res, 200, snapshot())
};