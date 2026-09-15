import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/telemetry/logger.js';

const isDev = process.env.NODE_ENV !== 'production';

let prisma = new PrismaClient({
  log: isDev ? ['warn', 'error'] : ['error'],
});

// Observability-only Prisma query extension: emits a structured log line keyed
// to the request context (requestId/userId/role) for every booking event and
// admin audit record. It never alters the query itself and requires no schema
// or DB change — debugging correlation lives in the log stream, not in rows.
try {
  prisma = prisma.$extends({
    query: {
      bookingEvent: {
        async create({ args, query }) {
          logger.info('booking.event', {
            bookingId: args?.data?.bookingId,
            action: args?.data?.action,
            actorRole: args?.data?.actorRole,
            actorId: args?.data?.actorId
          });
          return query(args);
        }
      },
      auditLog: {
        async create({ args, query }) {
          logger.info('audit.event', {
            actorId: args?.data?.actorId,
            actorRole: args?.data?.actorRole,
            action: args?.data?.action,
            targetType: args?.data?.targetType,
            targetId: args?.data?.targetId
          });
          return query(args);
        }
      }
    }
  });
} catch (err) {
  console.error('[telemetry] Prisma query extension unavailable:', err?.message);
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;