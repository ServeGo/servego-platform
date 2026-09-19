import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parsePagination, offsetMeta } from '../utils/pagination.js';

const SELECT_PROVIDER = {
  include: {
    provider: {
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true }
        }
      }
    }
  }
};

// The admin queue groups rows PENDING → DENIED → APPROVED (requests first, then
// approved links). Each bucket is its own table, so pagination is driven by
// per-status SQL totals and the requested page window is sliced onto each
// bucket's ordered rows — the query never loads rows outside the page (rule 12).
const BUCKETS = [
  { key: 'PENDING', table: 'request' },
  { key: 'DENIED', table: 'request' },
  { key: 'APPROVED', table: 'link' }
];

const mapItem = (type, approvalStatus, extra) => (r) => ({
  type,
  id: type === 'APPROVED' ? `APP-${r.id}` : r.id,
  provider: r.provider,
  name: type === 'APPROVED' ? r.service.name : r.requestedServiceName,
  description: r.description || r.service?.description || '-',
  experienceYears: r.experienceYears ?? r.provider?.experienceYears ?? null,
  createdAt: r.createdAt,
  approvalStatus,
  ...(type === 'DENIED' ? { denialReason: r.denialReason || null } : {})
});

// Window of the request's page that falls inside one bucket's rows. Buckets are
// laid out back-to-back over the combined ordering:
//   bucket k occupies combined rows [start, start + count[k])
// The page [globalSkip, globalSkip + limit) overlaps it on
//   [max(globalSkip, start), min(globalSkip + limit, start + count[k]))
const windowFor = (meta, globalSkip, limit) => {
  const bucketEnd = meta.start + meta.size;
  const overlapStart = Math.max(globalSkip, meta.start);
  const overlapEnd = Math.min(globalSkip + limit, bucketEnd);
  return {
    skip: Math.max(0, overlapStart - meta.start),
    take: Math.max(0, overlapEnd - overlapStart)
  };
};

export const AdminProviderServiceItemsController = {
  getAll: async (req, res) => {
    try {
      const { page, limit } = parsePagination(req.query, { limit: 50 });
      const statusFilter = String(req.query.status || '').toUpperCase();
      const validStatus = ['PENDING', 'APPROVED', 'DENIED'].includes(statusFilter) ? statusFilter : null;

      const activeBuckets = BUCKETS.filter((b) => !validStatus || b.key === validStatus);

      // Per-status totals are computed once in SQL (rule 12) — these both drive
      // the tab badges and provide the paging bases for the bucket windows.
      const [pendingCount, deniedCount, approvedCount] = await Promise.all([
        prisma.providerServiceRequest.count({ where: { status: 'PENDING' } }),
        prisma.providerServiceRequest.count({ where: { status: 'DENIED' } }),
        prisma.providerService.count()
      ]);
      const counts = {
        PENDING: pendingCount,
        APPROVED: approvedCount,
        DENIED: deniedCount,
        TOTAL: pendingCount + deniedCount + approvedCount
      };

      let cumulative = 0;
      const bucketMeta = activeBuckets.map((b) => {
        const meta = { ...b, start: cumulative, size: counts[b.key] };
        cumulative += meta.size;
        return meta;
      });
      const total = cumulative;

      const globalSkip = (page - 1) * limit;

      const jobs = bucketMeta.map((meta) => {
        const win = windowFor(meta, globalSkip, limit);
        if (win.take === 0) return Promise.resolve([]);
        const base = meta.table === 'request'
          ? prisma.providerServiceRequest.findMany({
              where: { status: meta.key },
              orderBy: { createdAt: 'desc' },
              skip: win.skip,
              take: win.take,
              ...SELECT_PROVIDER
            })
          : prisma.providerService.findMany({
              orderBy: { createdAt: 'desc' },
              skip: win.skip,
              take: win.take,
              include: { ...SELECT_PROVIDER.include, service: true }
            });
        return base.then((rows) => rows.map(mapItem(meta.key)));
      });

      const results = await Promise.all(jobs);
      // Buckets are resolved in priority order, so flattening preserves the
      // PENDING → DENIED → APPROVED ordering (each bucket already createdAt desc).
      const items = results.flat();

      return sendApiSuccess(res, 200, { items, pagination: offsetMeta(total, page, limit), counts });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch provider service items', err.message);
    }
  }
};