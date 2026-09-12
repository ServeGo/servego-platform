/**
 * In-memory Socket.IO traffic metrics.
 *
 * Bounded counters + time-sample rings, zero infrastructure — the same shape as
 * the queue metrics. Lets the admin dashboard answer "how does realtime traffic
 * scale?" (location events/sec, connections, messages/sec, payload bytes/sec,
 * DB writes and external Maps calls caused by the live-tracking path, process
 * CPU) without adding an APM dependency. Realtime events are fire-and-forget:
 * the ring buffers are pruned on arrival so memory never grows with traffic.
 */

const EVENT_WINDOW_MS = 60_000;
const MAX_SAMPLES = 100_000;

// Ring of timestamps (ms) used to compute per-window rates. Pruned lazily.
let eventSamples = []; // { t, event }
let messageSamples = []; // { t, bytes }
let dbWriteSamples = []; // { t }
let mapsCallSamples = []; // { t }

const state = {
  startedAt: Date.now(),
  connectionsTotal: 0,
  connectionsCurrent: 0,
  events: {}, // event name -> total count
  messagesTotal: 0,
  bytesTotal: 0,
  dbWritesTotal: 0,
  mapsCallsTotal: 0,
  handlerDurationMs: {}, // event name -> running average
  handlerSamples: {} // event name -> count
};

let lastCpuUsage = process.cpuUsage();

function pruneRing(samples) {
  const cutoff = Date.now() - EVENT_WINDOW_MS;
  let i = 0;
  while (i < samples.length && samples[i].t < cutoff) i += 1;
  if (i > 0) samples.splice(0, i);
}

function recordTotal(obj, key, n = 1) {
  obj[key] = (obj[key] || 0) + n;
}

export const socketMetrics = {
  recordConnection() {
    state.connectionsTotal += 1;
    state.connectionsCurrent += 1;
  },

  recordDisconnection() {
    if (state.connectionsCurrent > 0) state.connectionsCurrent -= 1;
  },

  /**
   * A socket event arrived (or was broadcast): `location:update`,
   * `provider:onTheWay`, `provider:arrived`, ACK'd writes, etc.
   */
  recordEvent(eventName) {
    recordTotal(state.events, eventName);
    eventSamples.push({ t: Date.now(), event: eventName });
    pruneRing(eventSamples);
  },

  /** A message was delivered to a room — track payload size to estimate bandwidth. */
  recordMessage(bytes = 0) {
    state.messagesTotal += 1;
    state.bytesTotal += bytes || 0;
    messageSamples.push({ t: Date.now(), bytes: bytes || 0 });
    pruneRing(messageSamples);
  },

  /** A DB write happened inside the realtime-tracking path. */
  recordDbWrite() {
    state.dbWritesTotal += 1;
    dbWriteSamples.push({ t: Date.now() });
    pruneRing(dbWriteSamples);
  },

  /** An external Maps API call (distance/route geocoding) happened in tracking. */
  recordMapsCall() {
    state.mapsCallsTotal += 1;
    mapsCallSamples.push({ t: Date.now() });
    pruneRing(mapsCallSamples);
  },

  /** Handler wall time for an event (running average, not a full histogram). */
  recordHandlerDuration(eventName, ms) {
    const samples = state.handlerSamples[eventName] || 0;
    const prior = state.handlerDurationMs[eventName] || 0;
    state.handlerSamples[eventName] = samples + 1;
    state.handlerDurationMs[eventName] = samples + 1 <= 1
      ? ms
      : prior + (ms - prior) / (samples + 1);
  },

  /** Current live metrics + per-event rate over the sliding minute window. */
  snapshot() {
    const now = Date.now();
    const windowSec = EVENT_WINDOW_MS / 1000;

    pruneRing(eventSamples);
    pruneRing(messageSamples);
    pruneRing(dbWriteSamples);
    pruneRing(mapsCallSamples);

    const eventCounts = {};
    for (const sample of eventSamples) recordTotal(eventCounts, sample.event);
    const eventRates = {};
    for (const [name, count] of Object.entries(eventCounts)) {
      eventRates[name] = Number((count / windowSec).toFixed(2));
    }

    const messageBytes = messageSamples.reduce((sum, s) => sum + s.bytes, 0);

    // CPU time (ms) consumed by THIS process since the previous snapshot. A
    // snapshot-to-snapshot delta — repeated polling shows the realtime path's
    // CPU cost without needing an OS-level agent.
    const cpu = process.cpuUsage(lastCpuUsage);
    lastCpuUsage = process.cpuUsage();
    const cpuMs = (cpu.user + cpu.system) / 1000;

    return {
      startedAt: state.startedAt,
      connections: {
        total: state.connectionsTotal,
        current: state.connectionsCurrent
      },
      events: {
        total: state.events,
        perSec: eventRates
      },
      messages: {
        total: state.messagesTotal,
        perSec: Number((messageSamples.length / windowSec).toFixed(2)),
        bytesTotal: state.bytesTotal,
        bytesPerSec: Number((messageBytes / windowSec).toFixed(0))
      },
      dbWrites: {
        total: state.dbWritesTotal,
        perSec: Number((dbWriteSamples.length / windowSec).toFixed(2))
      },
      mapsCalls: {
        total: state.mapsCallsTotal,
        perSec: Number((mapsCallSamples.length / windowSec).toFixed(2))
      },
      handlerAvgMs: state.handlerDurationMs,
      cpuMsSinceLastSnapshot: Math.round(cpuMs)
    };
  },

  reset() {
    state.startedAt = Date.now();
    state.connectionsTotal = 0;
    state.connectionsCurrent = 0;
    state.events = {};
    state.messagesTotal = 0;
    state.bytesTotal = 0;
    state.dbWritesTotal = 0;
    state.mapsCallsTotal = 0;
    state.handlerDurationMs = {};
    state.handlerSamples = {};
    eventSamples = [];
    messageSamples = [];
    dbWriteSamples = [];
    mapsCallSamples = [];
    lastCpuUsage = process.cpuUsage();
  }
};