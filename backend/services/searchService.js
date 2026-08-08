/**
 * Typo-tolerant, ranked Postgres search over the service catalog.
 *
 * Uses pg_trgm (enabled + indexed in migration 20260808000003_search_trgm):
 *   - exact       : nameNormalized equality (highest priority)
 *   - prefix      : name starts with the query
 *   - fuzzy name  : similarity / word_similarity against the service name
 *   - fuzzy desc  : similarity against the description (lowest weight)
 *
 * word_similarity keeps short queries (e.g. "ac") useful where the bare `%`
 * trigram operator needs three characters. All helpers are pure SQL and stay
 * transactional with the rows they rank, so no external search cluster is
 * needed at this scale.
 *
 * If catalog size and traffic ever outgrow Postgres, reindex these queries
 * into MeiliSearch behind the same function signatures (see queue job §15.5).
 */

import prisma from '../prisma/client.js';

const WORD_SIM_THRESHOLD = 0.35;

/**
 * Ranked list of matching service ids for a free-text catalog query.
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<Array<{ id: string, score: number }>>} desc by score
 */
export async function rankedServiceMatches(query, { limit = 100 } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];

  const rows = await prisma.$queryRaw`
    SELECT "id",
      GREATEST(
        CASE WHEN "nameNormalized" = lower(${q}) THEN 12 ELSE 0 END,
        CASE WHEN lower("name") LIKE lower(${q}) || '%' THEN 8 ELSE 0 END,
        CASE WHEN "name" % ${q} THEN similarity("name", ${q}) * 6 ELSE 0 END,
        CASE WHEN word_similarity(${q}, "name") > ${WORD_SIM_THRESHOLD}
             THEN word_similarity(${q}, "name") * 6 ELSE 0 END,
        CASE WHEN "description" % ${q} THEN similarity("description", ${q}) * 3 ELSE 0 END,
        CASE WHEN word_similarity(${q}, "description") > ${WORD_SIM_THRESHOLD}
             THEN word_similarity(${q}, "description") * 3 ELSE 0 END
      ) AS score
    FROM "Service"
    WHERE "isHidden" = false AND (
      "nameNormalized" = lower(${q})
      OR lower("name") LIKE '%' || lower(${q}) || '%'
      OR "name" % ${q}
      OR word_similarity(${q}, "name") > ${WORD_SIM_THRESHOLD}
      OR word_similarity(${q}, "description") > ${WORD_SIM_THRESHOLD}
    )
    ORDER BY score DESC, "name" ASC
    LIMIT ${limit};
  `;

  return rows.map((r) => ({ id: r.id, score: Number(r.score) || 0 }));
}

const DISCOVERY_SCORE_THRESHOLD = 35;

/**
 * Resolve a customer's free-text need ("ac repair servic") to the single
 * closest canonical Service. Exact and prefix matches win outright; otherwise
 * the best name-based trigram match is returned only if it clears a minimum
 * score so garbage queries don't silently redirect to an unrelated service.
 * @param {string} query
 * @returns {Promise<{ id: string, name: string } | null>}
 */
export async function resolveServiceForQuery(query) {
  const q = String(query || '').trim();
  if (!q) return null;

  const rows = await prisma.$queryRaw`
    SELECT "id", "name",
      GREATEST(
        CASE WHEN "nameNormalized" = lower(${q}) THEN 100 ELSE 0 END,
        CASE WHEN lower("name") LIKE lower(${q}) || '%' THEN 80 ELSE 0 END,
        CASE WHEN "name" % ${q} THEN similarity("name", ${q}) * 60 ELSE 0 END,
        CASE WHEN word_similarity(${q}, "name") > ${WORD_SIM_THRESHOLD}
             THEN word_similarity(${q}, "name") * 60 ELSE 0 END
      ) AS score
    FROM "Service"
    WHERE "isHidden" = false AND (
      "nameNormalized" = lower(${q})
      OR lower("name") LIKE '%' || lower(${q}) || '%'
      OR "name" % ${q}
      OR word_similarity(${q}, "name") > ${WORD_SIM_THRESHOLD}
    )
    ORDER BY score DESC, "name" ASC
    LIMIT 1;
  `;

  const best = rows[0];
  if (!best) return null;
  if ((Number(best.score) || 0) < DISCOVERY_SCORE_THRESHOLD) return null;
  return { id: best.id, name: best.name };
}
