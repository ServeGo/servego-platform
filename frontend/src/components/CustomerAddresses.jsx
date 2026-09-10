import React, { useCallback, useEffect, useState } from 'react';
import { Home, Briefcase, MoreHorizontal, Plus, Pencil, Trash2, MapPin, Star, Loader2 } from 'lucide-react';
import { api as apiClient } from '../utils/apiClient';
import AddressEditorModal from './AddressEditorModal';

const LABEL_META = {
  HOME: { label: 'Home', icon: Home, tone: 'bg-teal-50 text-teal-600 border-teal-100' },
  OFFICE: { label: 'Office', icon: Briefcase, tone: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  OTHER: { label: 'Other', icon: MoreHorizontal, tone: 'bg-amber-50 text-amber-600 border-amber-100' },
};

/**
 * Blinkit-style saved addresses box — renders on the customer profile below the
 * personal details. Shows every address as a tile (Home/Office/Other label),
 * with add / edit / delete and set-default actions. Add & edit both open the
 * map-backed AddressEditorModal.
 */
export default function CustomerAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // address object or null
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/customer-addresses');
      if (res.ok && Array.isArray(res.data?.addresses)) {
        setAddresses(res.data.addresses);
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

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const isEdit = Boolean(editing?.id);
      let res = isEdit
        ? await apiClient.patch(`/customer-addresses/${editing.id}`, payload)
        : await apiClient.post('/customer-addresses', payload);
      // Editing an address another tab just deleted — save it as a fresh one.
      if (isEdit && res.status === 404 && !res.ok) {
        res = await apiClient.post('/customer-addresses', payload);
      }
      if (res.ok) {
        await load();
        setEditing(null);
        setAdding(false);
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
    if (res.status === 404) { return load(); }
    if (res.ok) {
      await load();
    } else {
      setError(res.data?.message || 'Could not delete this address.');
    }
  };

  const handleSetDefault = async (addr) => {
    const res = await apiClient.post(`/customer-addresses/${addr.id}/default`, {});
    if (res.status === 404) { return load(); }
    if (res.ok) {
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
            Reuse these addresses for faster bookings — add Home, Office or Other.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setAdding(true); setEditing(null); }}
          className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Address
        </button>
      </div>

      {error && (
        <p className="mt-2 inline-block text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-md px-2 py-1">{error}</p>
      )}

      {/* Address tiles */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading saved addresses…
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 px-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-700">No saved addresses yet</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1 max-w-xs mx-auto">
              Add your home or office address and pick it instantly when booking a service.
            </p>
          </div>
        ) : (
          addresses.map((addr) => {
            const meta = LABEL_META[addr.label] || LABEL_META.OTHER;
            const Icon = meta.icon;
            return (
              <div
                key={addr.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition-all hover:border-teal-300 hover:shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-900 capitalize">{meta.label}</span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5">
                        <Star className="w-2.5 h-2.5 fill-teal-500 text-teal-500" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed break-words">
                    {addr.address}
                    {addr.landmark ? ` · ${addr.landmark}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {!addr.isDefault && (
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
                      aria-label="Edit address"
                      onClick={() => { setEditing(addr); setAdding(false); }}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete address"
                      onClick={() => handleDelete(addr)}
                      className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {(adding || editing) && (
        <AddressEditorModal
          initial={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
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