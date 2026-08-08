import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import apiRouter from './routes/api.js';
import { seedServicesIfEmpty } from './seeders/servicesSeed.js';
import { getCorsConfig, resolvePort } from './utils/runtimeConfig.js';
import { helmetConfig, hppConfig, generalRateLimiter } from './middleware/security.js';
import { requestLogger, errorHandler, requestTimeout } from './middleware/logging.js';
import { sendApiSuccess } from './utils/response.js';
import { startAutoCancelCron, stopAutoCancelCron } from './services/autoCancelService.js';
import { startBackupCron, stopBackupCron } from './services/backupService.js';
import { scheduleAllLeadTimers } from './services/leadExpiryService.js';
import { seedBusinessModelIfEmpty } from './seeders/businessModelSeed.js';
import { updateProviderLocation, markProviderOnTheWay, markProviderArrived } from './services/trackingService.js';
import { startQueueWorkers, stopQueueWorkers, drainQueueWorkers, recoverInterruptedJobs } from './services/queue/queueService.js';
import { maintenanceMode } from './middleware/maintenance.js';

dotenv.config();

// API version registry — the single source of truth for which API versions
// are live. Add an entry when a new version ships; keep retired versions in
// API_VERSION_DEPRECATED for the remainder of their deprecation window.
const API_VERSIONS = ['v1'];
const API_VERSION_DEPRECATED = {};

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: getCorsConfig(),
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    perMessageDeflate: { threshold: 1024 }
  });

  app.set('socketio', io);
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmetConfig);
  app.use(hppConfig);
  app.use(cors(getCorsConfig()));
  app.use(generalRateLimiter);

  // Request parsing
  // Razorpay webhooks must receive the RAW body (not JSON-parsed) so the
  // signature can be verified against the exact bytes that were sent.
  app.use('/api/v1/subscriptions/payment/webhook', express.raw({ type: () => true, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Logging & timeout
  app.use(requestLogger);
  app.use(requestTimeout(30000));

  // Normalize trailing slashes
  app.use((req, res, next) => {
    if (req.path !== '/' && req.path.endsWith('/')) {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      return res.redirect(301, req.path.slice(0, -1) + query);
    }
    next();
  });

  // Health check — must be registered BEFORE apiRouter to avoid being shadowed
  app.get('/api/health', async (req, res) => {
    const health = {
      status: 'healthy',
      service: 'servego-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      db: 'PostgreSQL',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    try {
      const { default: prisma } = await import('./prisma/client.js');
      await prisma.$queryRaw`SELECT 1 AS ok`;
      health.dbStatus = 'reachable';
      health.memoryUsage = {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      };
    } catch (dbErr) {
      health.dbStatus = 'unreachable';
      if (process.env.NODE_ENV !== 'production') {
        health.dbError = dbErr?.message;
      }
    }

    // A process that cannot reach its primary datastore is alive but not
    // ready to serve traffic. Returning 503 lets load balancers and monitors
    // distinguish that state from a healthy deployment.
    if (health.dbStatus === 'reachable') {
      return sendApiSuccess(res, 200, health);
    }
    return res.status(503).json({
      success: false,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Database is unreachable',
      data: health
    });
  });

  // Version discovery — unversioned by design so clients can always find the
  // available versions without knowing which versions exist.
  app.get('/api/versions', (req, res) => {
    return sendApiSuccess(res, 200, {
      name: 'servego-api',
      currentVersion: API_VERSIONS[API_VERSIONS.length - 1],
      versions: API_VERSIONS.map((version) => ({
        version,
        basePath: `/api/${version}`,
        deprecated: Boolean(API_VERSION_DEPRECATED[version])
      }))
    });
  });

  // API routes (maintenance gate first: the whole public surface 503s while
  // `maintenanceMode` is on, except admin/login/feature-flags — see middleware).
  app.use('/api/v1', maintenanceMode, apiRouter);

  // Socket.io
  // Authenticate sockets from the connection token so privileged handlers can
  // rely on socket.userId / socket.userRole. Anonymous sockets stay connected
  // (they only receive public/broadcast events); stale or invalid tokens are
  // treated as anonymous rather than dropped so reconnects stay stable.
  io.use((socket, next) => {
    const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'servego-dev-secret');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
    } catch {
      // ignore — anonymous connection
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}, IP: ${socket.handshake.address}`);

    socket.on('join', (userId) => {
      if (!socket.userId || userId !== socket.userId) return;
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`🔌 User ${userId} joined their notification room`);
      }
    });

    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'servego-dev-secret');
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.join(`user:${decoded.id}`);
        if (decoded.role === 'admin') {
          socket.join('room:admin');
        }
        socket.emit('authenticated', { success: true, data: { userId: decoded.id, role: decoded.role } });
      } catch {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    });

    socket.on('leave', (userId) => {
      if (!socket.userId || userId !== socket.userId) return;
      if (userId) {
        socket.leave(`user:${userId}`);
        console.log(`🔌 User ${userId} left their notification room`);
      }
    });

    // Real-time location sharing — provider pushes a live fix for an active
    // booking; the customer's room receives the broadcast. REST fallback lives
    // in BookingController.updateLocation for clients without sockets.
    socket.on('location:update', async (payload, ack) => {
      try {
        if (!socket.userId || socket.userRole !== 'provider') {
          if (typeof ack === 'function') ack({ ok: false, error: 'UNAUTHORIZED' });
          return;
        }
        const result = await updateProviderLocation({
          bookingId: payload?.bookingId,
          providerUserId: socket.userId,
          latitude: payload?.latitude,
          longitude: payload?.longitude,
          io
        });
        if (typeof ack === 'function') ack({ ok: true, data: result.payload });
      } catch (err) {
        console.error(`🔌 location:update failed:`, err.message);
        if (typeof ack === 'function') {
          ack({ ok: false, error: err.code || 'TRACKING_ERROR', message: err.message });
        }
      }
    });

    // Dispatch lifecycle (provider): "On my way" and "Arrived at location".
    // Emits `provider:onTheWay` / `provider:arrived` to the customer's room.
    socket.on('provider:onTheWay', async (payload, ack) => {
      try {
        if (!socket.userId || socket.userRole !== 'provider') {
          if (typeof ack === 'function') ack({ ok: false, error: 'UNAUTHORIZED' });
          return;
        }
        const result = await markProviderOnTheWay({
          bookingId: payload?.bookingId,
          providerUserId: socket.userId,
          io
        });
        if (typeof ack === 'function') ack({ ok: true, data: result.payload });
      } catch (err) {
        console.error(`🔌 provider:onTheWay failed:`, err.message);
        if (typeof ack === 'function') ack({ ok: false, error: err.code || 'TRACKING_ERROR', message: err.message });
      }
    });

    socket.on('provider:arrived', async (payload, ack) => {
      try {
        if (!socket.userId || socket.userRole !== 'provider') {
          if (typeof ack === 'function') ack({ ok: false, error: 'UNAUTHORIZED' });
          return;
        }
        const result = await markProviderArrived({
          bookingId: payload?.bookingId,
          providerUserId: socket.userId,
          io
        });
        if (typeof ack === 'function') ack({ ok: true, data: result.payload });
      } catch (err) {
        console.error(`🔌 provider:arrived failed:`, err.message);
        if (typeof ack === 'function') ack({ ok: false, error: err.code || 'TRACKING_ERROR', message: err.message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`🔌 Socket error: ${socket.id}`, err.message);
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  const PORT = resolvePort(process.env.PORT, 4000);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('===================================================');
    console.log(`🚀 ServeGo Engine fully online on http://0.0.0.0:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Security: Helmet + Rate Limiting enabled`);
    console.log('===================================================');
    startAutoCancelCron(io);
    startBackupCron();
    void scheduleAllLeadTimers(io).catch((err) => {
      console.error('Lead timer scheduling failed:', err.message);
    });
    // Recover any jobs a previous process left mid-flight, then drain the
    // async side-effect queue (email, analytics, invoices, performance).
    void recoverInterruptedJobs()
      .then(() => startQueueWorkers())
      .catch((err) => {
        console.error('Queue recovery failed:', err.message);
      });
  });

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the other process or set a different PORT in .env`);
    } else {
      console.error('❌ Server error:', err.message);
    }
    process.exit(1);
  });

  void seedServicesIfEmpty().catch((seedErr) => {
    console.error('Service catalog seed skipped:', seedErr.message);
  });

  void seedBusinessModelIfEmpty().catch((seedErr) => {
    console.error('Business model seed skipped:', seedErr.message);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    stopAutoCancelCron();
    stopBackupCron();
    stopQueueWorkers();
    await drainQueueWorkers(10000);
    httpServer.close(async () => {
      const { default: prisma } = await import('./prisma/client.js');
      await prisma.$disconnect();
      console.log('Server closed.');
      process.exit(0);
    });
    // Force exit if graceful shutdown hangs beyond 10s
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
