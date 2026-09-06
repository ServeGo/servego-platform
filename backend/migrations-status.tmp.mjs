import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const rows = await p.$queryRawUnsafe(
  'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at'
);
for (const r of rows) console.log(`${r.migration_name}\tfinished=${r.finished_at ? 'yes' : 'NO'}\trolled_back=${r.rolled_back_at ? 'yes' : 'no'}`);
await p.$disconnect();