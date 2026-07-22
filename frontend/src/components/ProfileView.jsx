import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export default function ProfileView({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || user?.customerProfile?.address || '',
    pincode: user?.pincode || user?.customerProfile?.pincode || '',
  });

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const startEditing = () => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || user?.customerProfile?.address || '',
      pincode: user?.pincode || user?.customerProfile?.pincode || '',
    });
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await onSave?.(form);
    setSaving(false);
    if (res?.success) {
      setSuccess('Profile updated successfully.');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(res?.error || 'Could not update your profile. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Your Resident Profile</h3>
          <p className="text-slate-500 text-xs mt-1 font-medium">Security identity markers verified under Hyderabad Operations.</p>
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

      {success && (
        <div className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 p-3 rounded-xl">✔ {success}</div>
      )}
      {error && (
        <div className="text-[11px] text-rose-700 font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl">⚠ {error}</div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EditField label="Full Name" value={form.name} onChange={setField('name')} required />
            <EditField label="Contact Phone" value={form.phone} onChange={setField('phone')} />
            {user?.role === 'customer' && (
              <>
                <EditField label="Address" value={form.address} onChange={setField('address')} />
                <EditField label="Pincode" value={form.pincode} onChange={setField('pincode')} />
              </>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 text-xs font-bold text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProfileField label="Full Name" value={user?.name} />
            <ProfileField label="Email Address" value={user?.email} isMono />
            <ProfileField label="Contact Phone" value={user?.phone} />
            <ProfileField label="Account Role" value={user?.role?.toUpperCase()} />
            {user?.role === 'customer' && (
              <>
                <ProfileField label="Address" value={user?.address || user?.customerProfile?.address} />
                <ProfileField label="Pincode" value={user?.pincode || user?.customerProfile?.pincode} />
              </>
            )}
            {user?.role === 'provider' && (
              <ProfileField label="Provider ID" value={user?.providerId || 'Not linked'} isMono />
            )}
          </div>

          <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-teal-800 leading-relaxed font-semibold text-[11px]">
            <Lock className="w-3.5 h-3.5 inline-block mr-1" /> Your resident address coordinates are protected. Specialists only access dispatch waypoints within 60 minutes of scheduled windows.
          </div>
        </div>
      )}
    </div>
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

function EditField({ label, value, onChange, required }) {
  return (
    <label className="block">
      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 outline-none font-semibold"
      />
    </label>
  );
}
