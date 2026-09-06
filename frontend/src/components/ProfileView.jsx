import React, { useState } from 'react';
import ProfilePhotoPicker from './ProfilePhotoPicker';

export default function ProfileView({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || user?.customerProfile?.address || '');
  const [photoUrl, setPhotoUrl] = useState(user?.avatar || '');
  const [photoChanged, setPhotoChanged] = useState(false);

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
        <div className="flex items-center gap-4">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Profile"
              className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-2xl shrink-0">
              {initial}
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-slate-800">{user?.name || 'Your account'}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{user?.email}</p>
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