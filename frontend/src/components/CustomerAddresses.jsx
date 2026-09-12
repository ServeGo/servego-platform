import React, { useCallback, useEffect, useState } from 'react';
import { Home, Briefcase, MoreHorizontal, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { api as apiClient } from '../utils/apiClient';
import { cachedRequest, invalidateCache } from '../utils/requestCache';
import { normalizeSavedAddresses } from '../utils/normalizeCustomerData';
import AddressEditorModal from './AddressEditorModal';

const LABEL_META = {
  HOME: { label: 'Home', icon: Home, tone: 'bg-teal-50 text-teal-600 border-teal-100' },
  OFFICE: { label: 'Office', icon: Briefcase, tone: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  OTHER: { label: 'Other', icon: MoreHorizontal, tone: 'bg-amber-50 text-amber-600 border-amber-100' },
};

const LABEL_ORDER = ['HOME', 'OFFICE', 'OTHER'];

/**
 * Blinkit-style saved addresses box — renders on the customer profile below the
 * personal details. Customers get exactly THREE fixed slots (Home/Office/Other),
 * each always visible so any of them can be filled or edited. The backend
 * upserts by label, so saving an address can never create a fourth slot.
 */
export default function CustomerAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingLabel, setEditingLabel] = useState(null); // 'HOME' | 'OFFICE' | 'OTHER' | null
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await cachedRequest('customer-addresses', () => apiClient.get('/customer-addresses'));
      if (res.ok && Array.isArray(res.data?.addresses)) {
        setAddresses(normalizeSavedAddresses(res.data.addresses));
      } else {
        setError(res.data?.message || 'Could not load your saved addresses.');
      }
    } catch {
      setError('Could not load your saved addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-dismiss errors so a stale message can't sit there looking huge.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const byLabel = {};
  for (const a of addresses) if (a) byLabel[a.label] = a;
  const editing = editingLabel ? byLabel[editingLabel] || null : null;

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      // Editing the tile for a filled label patches its row; an empty tile
      // creates it. A 404 means another tab deleted the row — re-save fresh.
      let res = editing
        ? await apiClient.patch(`/customer-addresses/${editing.id}`, payload)
        : await apiClient.post('/customer-addresses', payload);
      if (editing && res.status === 404 && !res.ok) {
        res = await apiClient.post('/customer-addresses', payload);
      }
      if (res.ok) {
        invalidateCache('customer-addresses');
        await load();
        setEditingLabel(null);
        return { ok: true };
      }
      return { ok: false, error: res.data?.message || 'Could not save this address.' };
    } catch {
      return { ok: false, error: 'Could not save this address.' };
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addr) => {
    if (!window.confirm(`Delete the "${LABEL_META[addr.label]?.label || 'saved'} address"?`)) return;
    // A 404 (ADDRESS_NOT_FOUND) just means another tab already deleted it —
    // silently refresh instead of scaring the user with a big error.
    const res = await apiClient.delete(`/customer-addresses/${addr.id}`);
    if (res.status === 404) { invalidateCache('customer-addresses'); return load(); }
    if (res.ok) {
      invalidateCache('customer-addresses');
      await load();
    } else {
      setError(res.data?.message || 'Could not delete this address.');
    }
  };

  const handleSetDefault = async (addr) => {
    const res = await apiClient.post(`/customer-addresses/${addr.id}/default`, {});
    if (res.status === 404) { invalidateCache('customer-addresses'); return load(); }
    if (res.ok) {
      invalidateCache('customer-addresses');
      await load();
    } else {
      setError(res.data?.message || 'Could not set this address as default.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Saved Addresses</h3>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Keep one Home, Office and Other address for faster bookings.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 inline-block text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-md px-2 py-1">{error}</p>
      )}

      {/* Exactly three tiles — one per fixed slot, always visible. */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading saved addresses…
          </div>
        ) : (
          LABEL_ORDER.map((labelId) => {
            const meta = LABEL_META[labelId];
            const Icon = meta.icon;
            const addr = byLabel[labelId];
            return (
              <div
                key={labelId}
                className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                  addr ? 'border-slate-200 hover:border-teal-300 hover:shadow-sm' : 'border-dashed border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{meta.label}</span>
                    {addr?.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                        <Star className="w-2.5 h-2.5 fill-teal-500 text-teal-500" /> Default
                      </span>
                    )}
                  </div>
                  {addr ? (
                    <p className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed break-words">
                      {addr.address}
                      {addr.landmark ? ` · ${addr.landmark}` : ''}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                      Not saved yet — tap the pencil to set your {meta.label.toLowerCase()} address.
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {addr && !addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr)}
                      className="text-[9px] font-bold text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      Set default
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${addr ? 'Edit' : 'Add'} ${meta.label} address`}
                      onClick={() => setEditingLabel(labelId)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {addr && (
                      <button
                        type="button"
                        aria-label={`Delete ${meta.label} address`}
                        onClick={() => handleDelete(addr)}
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingLabel && (
        <AddressEditorModal
          initial={editing}
          usedLabels={addresses.map((a) => a.label)}
          onClose={() => setEditingLabel(null)}
          onSave={async (payload) => {
            const result = await handleSave(payload);
            return result;
          }}
          saving={saving}
          submitLabel={editing ? 'Save Changes' : 'Save Address'}
        />
      )}
    </div>
  );
}