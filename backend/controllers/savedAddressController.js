import {
  listSavedAddresses,
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress
} from '../services/savedAddressService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

function notFoundError(res, code = 'SAVED_ADDRESS_NOT_FOUND') {
  return sendApiError(res, 404, code, 'This address is no longer available.');
}

export const SavedAddressController = {
  /** GET /saved-addresses — the logged-in user's addresses, newest first. */
  getMine: async (req, res) => {
    try {
      const addresses = await listSavedAddresses(req.user.id);
      return sendApiSuccess(res, 200, { savedAddresses: addresses, count: addresses.length });
    } catch (err) {
      console.error('[SavedAddressController.getMine] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load your saved addresses.');
    }
  },

  /** POST /saved-addresses — save a new shortcut for faster booking. */
  create: async (req, res) => {
    try {
      const address = await createSavedAddress({
        userId: req.user.id,
        label: req.body.label,
        address: req.body.address,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      });
      return sendApiSuccess(res, 201, address);
    } catch (err) {
      if (err?.code === 'SAVED_ADDRESS_LIMIT') {
        return sendApiError(res, 409, 'SAVED_ADDRESS_LIMIT', err.message);
      }
      console.error('[SavedAddressController.create] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Could not save the address. Please try again.');
    }
  },

  /** PATCH /saved-addresses/:id — edit one of the user's own addresses. */
  update: async (req, res) => {
    try {
      const address = await updateSavedAddress({
        userId: req.user.id,
        addressId: req.params.id,
        label: req.body.label,
        address: req.body.address,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      });
      if (!address) return notFoundError(res);
      return sendApiSuccess(res, 200, address);
    } catch (err) {
      console.error('[SavedAddressController.update] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Could not update the address. Please try again.');
    }
  },

  /** DELETE /saved-addresses/:id — remove one of the user's own addresses. */
  remove: async (req, res) => {
    try {
      const deleted = await deleteSavedAddress({
        userId: req.user.id,
        addressId: req.params.id
      });
      if (!deleted) return notFoundError(res);
      return sendApiSuccess(res, 200, { id: req.params.id, deleted: true });
    } catch (err) {
      console.error('[SavedAddressController.remove] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Could not delete the address. Please try again.');
    }
  }
};
