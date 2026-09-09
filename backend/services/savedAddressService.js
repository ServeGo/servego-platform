import prisma from '../prisma/client.js';

/**
 * Saved address shortcuts used for faster booking (Home/Work/Office/etc.).
 * Every operation is scoped to the owning user — a customer can only read,
 * edit or delete their own addresses.
 */

const MAX_ADDRESSES_PER_USER = 20;

/** The logged-in user's saved addresses, newest first. */
export async function listSavedAddresses(userId, { client = prisma } = {}) {
  return client.savedAddress.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Create a saved address for the user. The user id always comes from the
 * authenticated session (req.user.id), never from the request body.
 */
export async function createSavedAddress({ userId, label, address, latitude, longitude, client = prisma }) {
  const count = await client.savedAddress.count({ where: { userId } });
  if (count >= MAX_ADDRESSES_PER_USER) {
    const error = new Error(`You can save up to ${MAX_ADDRESSES_PER_USER} addresses.`);
    error.code = 'SAVED_ADDRESS_LIMIT';
    throw error;
  }
  return client.savedAddress.create({
    data: {
      userId,
      label: String(label || 'Home').trim() || 'Home',
      address: String(address || '').trim(),
      latitude: latitude ?? null,
      longitude: longitude ?? null
    }
  });
}

/**
 * Update one of the user's own addresses. Returns null when the caller doesn't
 * own the row (caller maps that to a 404-style response).
 */
export async function updateSavedAddress({ userId, addressId, label, address, latitude, longitude, client = prisma }) {
  const upsert = { label: String(label || 'Home').trim() || 'Home' };
  if (address != null) upsert.address = String(address).trim();
  if (latitude != null) upsert.latitude = latitude;
  if (longitude != null) upsert.longitude = longitude;

  const updated = await client.savedAddress.updateMany({
    where: { id: addressId, userId },
    data: upsert
  });
  if (updated.count === 0) return null;
  return client.savedAddress.findUnique({ where: { id: addressId } });
}

/**
 * Delete one of the user's own addresses. Returns true only when a row was
 * actually deleted (so retries can't double-apply). If the row belonged to
 * another user the where clause matches nothing and this is a no-op.
 */
export async function deleteSavedAddress({ userId, addressId, client = prisma }) {
  const deleted = await client.savedAddress.deleteMany({
    where: { id: addressId, userId }
  });
  return deleted.count > 0;
}
