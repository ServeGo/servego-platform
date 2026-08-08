/**
 * Shared pagination helpers.
 *
 * Offset pagination is the default for most admin lists; cursor pagination is
 * used for high-volume, ordered feeds (notifications, wallet transactions,
 * booking history) so results stay consistent while rows are inserted.
 *
 * All list endpoints should return:
 *   { items: [...], meta: { total, page, limit, pages } }
 * or, for cursor mode:
 *   { items: [...], meta: { total, nextCursor, hasMore } }
 */

const DEFAULT_MAX_LIMIT = 100;

/**
 * Parse `page`/`limit` from a query string into a Prisma-ready offset shape.
 * Values are clamped: page >= 1, 1 <= limit <= maxLimit.
 */
export function parsePagination(query = {}, defaults = {}) {
  const maxLimit = defaults.maxLimit ?? DEFAULT_MAX_LIMIT;
  const rawLimit = Number(query.limit) || (defaults.limit ?? 20);
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(rawLimit)));
  const page = Math.max(1, Math.floor(Number(query.page) || (defaults.page ?? 1)));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit
  };
}

/**
 * Parse a cursor token. The token is the base64 of `id|date` so clients can
 * pass it back verbatim without worrying about URL-safe encodings.
 */
export function parseCursor(token, { orderBy = 'createdAt' } = {}) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(String(token), 'base64').toString('utf8');
    const [id, stamp] = decoded.split('|');
    if (!id) return null;
    const date = stamp ? new Date(stamp) : null;
    return {
      id,
      date: date && !Number.isNaN(date.getTime()) ? date : null,
      where: { [orderBy]: date && !Number.isNaN(date.getTime()) ? date : undefined, id }
    };
  } catch {
    return null;
  }
}

/**
 * Encode the cursor token for the last row of a page.
 */
export function encodeCursor(row, { orderBy = 'createdAt' } = {}) {
  const id = row?.id;
  const stamp = row?.[orderBy] ? new Date(row[orderBy]).toISOString() : '';
  if (!id) return null;
  return Buffer.from(`${id}|${stamp}`).toString('base64');
}

/**
 * Build the response `meta` block for offset pagination.
 */
export function offsetMeta(total, page, limit) {
  return { total, page, limit, pages: total === 0 ? 0 : Math.ceil(total / limit) };
}

/**
 * Build the response `meta` block for cursor pagination. `hasMore` is true
 * when the page was full — the caller issues one extra row (`take + 1`) and
 * drops it here when present.
 */
export function cursorMeta(total, items, nextCursor, { hasMore } = {}) {
  return { total, nextCursor, hasMore: hasMore ?? (items.length > 0 && !!nextCursor) };
}

/**
 * For cursor feeds: fetch `limit + 1` rows, keep only `limit`, and report
 * whether another page exists. Expects `items` ordered by `orderBy desc, id desc`.
 */
export function sliceCursorPage(items, limit, { orderBy = 'createdAt' } = {}) {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const last = page[page.length - 1];
  return { items: page, nextCursor: hasMore ? encodeCursor(last, { orderBy }) : null, hasMore };
}
