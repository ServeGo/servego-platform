import React, { useState } from 'react';
import ProfilePhotoPicker from './ProfilePhotoPicker';
import { useData } from '../context/AppContext';
import LocationPicker from './LocationPicker';
import { Home, Briefcase, Plus, MapPin, Trash2, Pencil } from 'lucide-react';

const ADDRESS_LABELS = ['Home', 'Work', 'Office', 'Other'];

export default function ProfileView({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || user?.customerProfile?.address || '');
  const [photoUrl, setPhotoUrl] = useState(user?.avatar || '');
  const [photoChanged, setPhotoChanged] = useState(false);

  // --- Saved addresses (Home/Work/Office shortcuts used by the booking modals) ---
  const { savedAddresses, createSavedAddress, updateSavedAddress, deleteSavedAddress } = useData();

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressText, setAddressText] = useState('');
  const [addressLat, setAddressLat] = useState(null);
  const [addressLng, setAddressLng] = useState(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');

  const resetAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressLabel('Home');
    setAddressText('');
    setAddressLat(null);
    setAddressLng(null);
    setAddressError('');
  };

  const startAddAddress = () => {
    resetAddressForm();
    setShowAddressForm(true);
  };

  const startEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressLabel(addr.label || 'Home');
    setAddressText(addr.address || '');
    setAddressLat(addr.latitude ?? null);
    setAddressLng(addr.longitude ?? null);
    setAddressError('');
    setShowAddressForm(true);
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError('');
    if (!addressText.trim()) {
      setAddressError('Please enter an address.');
      return;
    }
    if (addressLat == null || addressLng == null) {
      setAddressError('Please pick the location on the map before saving.');
      return;
    }
    setAddressSaving(true);
    const payload = {
      label: addressLabel,
      address: addressText.trim(),
      latitude: addressLat,
      longitude: addressLng,
    };
    const res = editingAddressId
      ? await updateSavedAddress(editingAddressId, payload)
      : await createSavedAddress(payload);
    setAddressSaving(false);
    if (res?.error) {
      setAddressError(res.error);
      return;
    }
    resetAddressForm();
    setSuccess(editingAddressId ? 'Address updated successfully.' : 'Address saved successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteAddress = async (addr) => {
    if (!window.confirm(`Delete "${addr.label || 'Address'}"? This cannot be undone.`)) return;
    setError('');
    const res = await deleteSavedAddress(addr.id);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setSuccess('Address deleted.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const startEditing = () => {
    setName(user?.name || '');
    setAddress(user?.address || user?.customerProfile?.address || '');
    setPhotoUrl(user?.avatar || '');
    setPhotoChanged(false);
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name,
      address,
      ...(photoChanged ? { avatar: photoUrl || null } : {})
    };
    const res = await onSave?.(payload);
    setSaving(false);
    if (res?.user || res?.success) {
      setSuccess('Profile updated successfully.');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(res?.error || 'Could not update your profile. Please try again.');
    }
  };

  const currentAvatar = photoUrl || user?.avatar;
  const initial = String(user?.name || '?').trim().substring(0, 1).toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">My Profile</h3>
          <p className="text-slate-500 text-xs mt-1 font-medium">Manage your personal information and profile photo.</p>
        </div>
        {!editing && (
          <button
            onClick={startEditing}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Photo + name shown once; hidden while editing so the picker is the single display */}
      {!editing && (
        <div className="relative flex min-h-[118px] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-[0_8px_20px_-16px_rgba(15,23,42,.35)] sm:px-8">
          <div className="shrink-0">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Profile"
                className="h-20 w-20 rounded-2xl border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#102044] text-2xl font-black text-white">
                {String(user?.name || 'CU').trim().substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-flex rounded-md bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-600">
              Active Resident Customer
            </span>
            <p className="mt-2 truncate text-2xl font-black tracking-tight text-[#102244]">
              {user?.name || 'Your account'}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[#71839d]">
              {user?.email} <span className="mx-1">•</span> Joined {user?.joinedDate || (user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 p-3 rounded-xl">✔ {success}</div>
      )}
      {error && (
        <div className="text-[11px] text-rose-700 font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl">⚠ {error}</div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-5 text-xs font-bold text-slate-700">
          <ProfilePhotoPicker
            src={photoUrl || user?.avatar}
            folder="servego/customers"
            onChange={(url) => {
              setPhotoUrl(url);
              setPhotoChanged(true);
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Full Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 outline-none font-semibold"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Address</span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 outline-none font-semibold resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setPhotoUrl(user?.avatar || '');
                setPhotoChanged(false);
                setEditing(false);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
          <ProfileField label="Full Name" value={user?.name} />
          <ProfileField label="Email Address" value={user?.email} isMono />
          <ProfileField label="Contact Phone" value={user?.phone} />
          <ProfileField label="Address" value={user?.address || user?.customerProfile?.address} />
        </div>
      )}

      {/* ================= Saved Addresses ================= */}
      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-black text-slate-900">Saved Addresses</h4>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Quick shortcuts used for faster booking.</p>
          </div>
          {!showAddressForm && (
            <button
              onClick={startAddAddress}
              className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add New Address
            </button>
          )}
        </div>

        {showAddressForm && (
          <AddressForm
            editingId={editingAddressId}
            initialLabel={addressLabel}
            initialText={addressText}
            initialLat={addressLat}
            initialLng={addressLng}
            labels={ADDRESS_LABELS}
            saving={addressSaving}
            error={addressError}
            onLabel={(v) => setAddressLabel(v)}
            onLocation={({ latitude, longitude, address: addr }) => {
              setAddressLat(latitude);
              setAddressLng(longitude);
              setAddressText(addr);
            }}
            onText={(v) => setAddressText(v)}
            onSubmit={handleAddressSubmit}
            onCancel={resetAddressForm}
          />
        )}

        <div className="space-y-2">
          {savedAddresses.length === 0 && !showAddressForm ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
              <MapPin className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-500">No saved addresses yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Add your Home or Work address to book faster.</p>
            </div>
          ) : (
            savedAddresses.map((addr) => (
              <AddressRow
                key={addr.id}
                addr={addr}
                onEdit={() => startEditAddress(addr)}
                onDelete={() => handleDeleteAddress(addr)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AddressRow({ addr, onEdit, onDelete }) {
  const label = String(addr.label || 'Home').toLowerCase();
  const Icon = label.includes('work') ? Briefcase : Home;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-800">{addr.label || 'Home'}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{addr.address}</span>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={onEdit}
          aria-label={`Edit ${addr.label}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          aria-label={`Delete ${addr.label}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AddressForm({ editingId, initialLabel, initialText, initialLat, initialLng, labels, saving, error, onLabel, onLocation, onText, onSubmit, onCancel }) {
  const [label, setLabel] = useState(initialLabel || 'Home');
  const [text, setText] = useState(initialText || '');
  const [location, setLocation] = useState(
    initialLat != null && initialLng != null ? { latitude: initialLat, longitude: initialLng, address: initialText || '' } : {}
  );

  const handleLabel = (v) => {
    setLabel(v);
    onLabel?.(v);
  };
  const handleText = (v) => {
    setText(v);
    onText?.(v);
  };
  const handleLocation = (loc) => {
    setLocation(loc);
    onLocation?.(loc);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-black text-slate-800">{editingId ? 'Edit Address' : 'Add New Address'}</h5>
      </div>

      <div>
        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Label</span>
        <div className="flex flex-wrap gap-2">
          {labels.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => handleLabel(l)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                label === l
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Pick location on map</span>
        <LocationPicker value={location} onChange={handleLocation} height="h-48 sm:h-56" />
      </div>

      <div>
        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Address</span>
        <textarea
          value={text}
          onChange={(e) => handleText(e.target.value)}
          rows={2}
          placeholder="Flat no, building, street, area..."
          className="w-full bg-white p-3 rounded-xl border border-slate-200 focus:border-indigo-500 text-slate-800 outline-none font-semibold resize-none"
        />
      </div>

      {error && (
        <div className="text-[11px] text-rose-700 font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl">⚠ {error}</div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold px-5 py-2.5 rounded-xl border border-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Address'}
        </button>
      </div>
    </form>
  );
}

function ProfileField({ label, value, isMono }) {
  return (
    <div>
      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{label}</span>
      <div className={`bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 ${isMono ? 'font-mono' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}