import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

const ADDRESS_LABELS = ['HOME', 'OFFICE', 'OTHER'];
const isFiniteCoord = (v) => v != null && Number.isFinite(Number(v));

/**
 * Customer saved addresses (Blinkit-style). Every address has a label
 * (HOME / OFFICE / OTHER), a map-picked location and exactly one default.
 * All handlers scope to the authenticated customer's own rows.
 */
export const AddressController = {
  getMine: async (req, res) => {
    try {
      const addresses = await prisma.customerAddress.findMany({
        where: { userId: req.user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
      });
      return sendApiSuccess(res, 200, { addresses });
    } catch (err) {
      console.error('Failed to fetch customer addresses:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load your saved addresses');
    }
  },

  create: async (req, res) => {
    try {
      const { label, address, pincode, landmark, latitude, longitude } = req.body || {};

      if (!address || !String(address).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Please provide an address.');
      }
      const normLabel = String(label || 'HOME').toUpperCase();
      if (!ADDRESS_LABELS.includes(normLabel)) {
        return sendApiError(res, 400, 'INVALID_LABEL', 'Address label must be HOME, OFFICE or OTHER.');
      }

      const existingCount = await prisma.customerAddress.count({ where: { userId: req.user.id } });
      // First address is always the default (keeps the "signup default = home"
      // invariant), otherwise only when the client asks for it.
      const isDefault = existingCount === 0 || req.body?.isDefault === true;

      if (isDefault) {
        await prisma.customerAddress.updateMany({
          where: { userId: req.user.id, isDefault: true },
          data: { isDefault: false }
        });
      }

      const created = await prisma.customerAddress.create({
        data: {
          userId: req.user.id,
          label: normLabel,
          address: String(address).trim(),
          pincode: pincode ? String(pincode).trim() : null,
          landmark: landmark ? String(landmark).trim() : null,
          latitude: isFiniteCoord(latitude) ? Number(latitude) : null,
          longitude: isFiniteCoord(longitude) ? Number(longitude) : null,
          isDefault
        }
      });

      return sendApiSuccess(res, 201, { address: created });
    } catch (err) {
      console.error('Failed to create customer address:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Could not save this address');
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { label, address, pincode, landmark, latitude, longitude, isDefault } = req.body || {};

      const existing = await prisma.customerAddress.findFirst({
        where: { id, userId: req.user.id }
      });
      if (!existing) {
        return sendApiError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found.');
      }

      const normLabel = label ? String(label).toUpperCase() : existing.label;
      if (!ADDRESS_LABELS.includes(normLabel)) {
        return sendApiError(res, 400, 'INVALID_LABEL', 'Address label must be HOME, OFFICE or OTHER.');
      }

      let willBeDefault = existing.isDefault;
      if (typeof isDefault === 'boolean') willBeDefault = isDefault;

      if (willBeDefault && !existing.isDefault) {
        await prisma.customerAddress.updateMany({
          where: { userId: req.user.id, isDefault: true },
          data: { isDefault: false }
        });
      }

      const updated = await prisma.customerAddress.update({
        where: { id },
        data: {
          label: normLabel,
          address: address !== undefined && address !== null ? String(address).trim() : existing.address,
          pincode: pincode !== undefined ? (pincode ? String(pincode).trim() : null) : existing.pincode,
          landmark: landmark !== undefined ? (landmark ? String(landmark).trim() : null) : existing.landmark,
          latitude: latitude !== undefined ? (isFiniteCoord(latitude) ? Number(latitude) : null) : existing.latitude,
          longitude: longitude !== undefined ? (isFiniteCoord(longitude) ? Number(longitude) : null) : existing.longitude,
          isDefault: willBeDefault
        }
      });

      return sendApiSuccess(res, 200, { address: updated });
    } catch (err) {
      console.error('Failed to update customer address:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Could not update this address');
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;

      // Delete + promote the next default atomically so a crash can never leave
      // a customer with zero default addresses while others still exist.
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.customerAddress.findFirst({
          where: { id, userId: req.user.id }
        });
        if (!existing) return { notFound: true };

        await tx.customerAddress.delete({ where: { id } });

        if (existing.isDefault) {
          // Promote the next eligible address (same order the list is shown
          // in): newest added first.
          const next = await tx.customerAddress.findFirst({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
          });
          if (next) {
            await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
          }
        }
        return { notFound: false };
      });

      if (result.notFound) {
        return sendApiError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found.');
      }
      return sendApiSuccess(res, 200, { deleted: true });
    } catch (err) {
      console.error('Failed to delete customer address:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Could not delete this address');
    }
  },

  setDefault: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await prisma.customerAddress.findFirst({
        where: { id, userId: req.user.id }
      });
      if (!existing) {
        return sendApiError(res, 404, 'ADDRESS_NOT_FOUND', 'Address not found.');
      }

      await prisma.customerAddress.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false }
      });
      const updated = await prisma.customerAddress.update({ where: { id }, data: { isDefault: true } });
      return sendApiSuccess(res, 200, { address: updated });
    } catch (err) {
      console.error('Failed to set default address:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Could not set the default address');
    }
  }
};