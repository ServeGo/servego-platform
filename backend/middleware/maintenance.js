import { getConfig } from '../services/adminConfigService.js';

/**
 * Maintenance-mode gate for the API. Registered in server.js just before the
 * `/api/v1` router. When `maintenanceMode` is on (admin-config feature flag,
 * effective within 30s — no redeploy), the public surface returns 503 while
 * admin routes, authentication and the feature-flag read stay available so an
 * admin can log in and take the site back up.
 */
export async function maintenanceMode(req, res, next) {
  try {
    const enabled = await getConfig('maintenanceMode', false);
    if (enabled === false || enabled === 'false' || enabled === 0 || enabled === '0') {
      return next();
    }
    const path = req.path || '';
    if (
      path.startsWith('/admin') ||
      path === '/auth/login' ||
      path === '/auth/refresh' ||
      path === '/feature-flags'
    ) {
      return next();
    }
    return res.status(503).json({
      success: false,
      code: 'MAINTENANCE_MODE',
      message: 'The platform is temporarily under maintenance. Please try again shortly.',
      data: { maintenance: true }
    });
  } catch (err) {
    // If the config read itself fails, fail open (never take the API down
    // because of a config hiccup) and log.
    console.error('[MaintenanceMode] config read failed, failing open:', err.message);
    return next();
  }
}
