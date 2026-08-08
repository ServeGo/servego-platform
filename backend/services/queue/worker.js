import dotenv from 'dotenv';
import prisma from '../../prisma/client.js';
import { startQueueWorkers, stopQueueWorkers, recoverInterruptedJobs, drainQueueWorkers } from './queueService.js';

dotenv.config();

/**
 * Standalone queue worker process. Run `npm run worker` to drain jobs without
 * running the API server — useful for scale-out: one web instance and any
 * number of worker instances safely share the same PostgreSQL-backed queue.
 */

async function main() {
  const recovered = await recoverInterruptedJobs();
  startQueueWorkers();
  console.log(`[QueueWorker] Started. Recovered ${recovered} interrupted job(s).`);

  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Draining queue workers...`);
    stopQueueWorkers();
    const drained = await drainQueueWorkers(10000);
    await prisma.$disconnect();
    console.log(drained ? 'Queue workers drained cleanly.' : 'Queue workers force-stopped.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[QueueWorker] Fatal error:', err);
  process.exit(1);
});
