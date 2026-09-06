import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, useData } from '../context/AppContext';
import { AchievementList, VerificationLevelPill } from './ProviderReputation';
import ProfilePhotoPicker from './ProfilePhotoPicker';

export default function ProviderProfileView() {
  const { currentUser, logout } = useAuth();
  const { providers, myProviderSummary, updateProviderProfile, updateProviderDispatchLocation, updateProviderAvailabilityStatus, fetchProviderRoutePlan } = useData();

  // Resolve active provider from the dashboard summary (purpose-specific), with
  // a fallback to the providers list — no separate API call needed per view.
  const activeProvider = useMemo(() => {
    if (myProviderSummary) return myProviderSummary;

    const providerIdCandidate = currentUser?.providerId;
    const providerUserIdCandidate = currentUser?.id;

    const byProviderId = providerIdCandidate ? providers.find(p => p.id === providerIdCandidate) : null;
    const byUserId = providerUserIdCandidate ? providers.find(p => p.userId === providerUserIdCandidate) : null;

    return byProviderId || byUserId || null;
  }, [currentUser, providers, myProviderSummary]);

  const provider = activeProvider;
  const loading = !provider;

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  // Form fields — initialized from provider context data
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [serviceAreasText, setServiceAreasText] = useState('');

  // Profile photo (optional) — previewed live, persisted only on Save.
  const [avatarState, setAvatarState] = useState('');
  const [avatarChanged, setAvatarChanged] = useState(false);

  // Live tracking / route planner
  const [online, setOnline] = useState(true);
  const [accepting, setAccepting] = useState(true);
  const [baseLat, setBaseLat] = useState('');
  const [baseLng, setBaseLng] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [locating, setLocating] = useState(false);
  const [savingDispatch, setSavingDispatch] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState('');
  const [dispatchErr, setDispatchErr] = useState('');
  const [routePlan, setRoutePlan] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // When provider loads/changes, populate form state
  useEffect(() => {
    if (!provider) return;

    setBio(provider.bio || '');
    setPhone(provider.phone || provider.user?.phone || '');
    setExperienceYears(provider.experienceYears !== undefined && provider.experienceYears !== null ? String(provider.experienceYears) : '');

    setSpecialtiesText(
      Array.isArray(provider.specialties) ? provider.specialties.join(', ') : provider.specialties || ''
    );
    setServiceAreasText(
      Array.isArray(provider.serviceAreas) ? provider.serviceAreas.join(', ') : provider.serviceAreas || ''
    );

    setOnline(provider.isOnline !== undefined ? Boolean(provider.isOnline) : true);
    setAccepting(provider.acceptingBookings !== undefined ? Boolean(provider.acceptingBookings) : true);
    setBaseLat(provider.latitude != null ? String(provider.latitude) : '');
    setBaseLng(provider.longitude != null ? String(provider.longitude) : '');
    setRadiusKm(provider.maxRadiusKm != null ? String(provider.maxRadiusKm) : '');

    setAvatarState(provider.avatar || provider.photo || provider.user?.avatar || '');
    setAvatarChanged(false);
  }, [provider]);

  const user = provider?.user || {};
  const reviewsCount = provider?.reviews?.length ?? provider?.reviewsCount ?? 0;
  const rating = provider?.rating ?? provider?.avgRating ?? '—';

  const parseCommaList = (text) => {
    if (!text) return [];
    return text
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  };

  const validate = () => {
    const errors = [];

    const expNum = experienceYears === '' ? NaN : Number(experienceYears);
    if (!Number.isFinite(expNum) || expNum < 0) errors.push('Experience must be a number >= 0');

    if (phone && phone.length < 7) errors.push('Phone looks too short');

    return errors;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveMsg('');
    setSaveErr('');

    if (!provider?.id) {
      setSaveErr('Provider not available');
      return;
    }

    const errors = validate();
    if (errors.length) {
      setSaveErr(errors.join('. '));
      return;
    }

    setSaving(true);
    try {
      const nextSpecialties = parseCommaList(specialtiesText);
      const nextAreas = parseCommaList(serviceAreasText);

      await updateProviderProfile(provider.id, {
        bio: bio || '',
        phone: phone || '',
        experienceYears: Number(experienceYears),
        specialties: nextSpecialties,
        serviceAreas: nextAreas,
        ...(avatarChanged ? { avatar: avatarState || null } : {})
      });

      setSaveMsg('Profile saved successfully');
      setEditMode(false);
    } catch (err) {
      setSaveErr(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
        <div className="text-sm font-bold text-slate-900">Loading partner profile...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto">
        <div className="text-sm font-bold text-rose-700">Partner profile not found.</div>
      </div>
    );
  }

  const useMyPosition = () => {
    if (!navigator.geolocation) {
      setDispatchErr('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    setDispatchErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBaseLat(pos.coords.latitude.toFixed(6));
        setBaseLng(pos.coords.longitude.toFixed(6));
        if (!radiusKm) setRadiusKm('10');
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setDispatchErr(err.code === 1 ? 'Location permission denied.' : 'Could not read your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveDispatchSettings = async () => {
    setDispatchMsg('');
    setDispatchErr('');
    setSavingDispatch(true);
    try {
      if (baseLat || baseLng || radiusKm) {
        const lat = Number(baseLat);
        const lng = Number(baseLng);
        const radius = Number(radiusKm);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Valid latitude and longitude are required.');
        if (!Number.isFinite(radius) || radius <= 0) throw new Error('Service radius must be a positive number (km).');
        await updateProviderDispatchLocation({ latitude: lat, longitude: lng, maxRadiusKm: radius });
      }
      await updateProviderAvailabilityStatus({ isOnline: online, acceptingBookings: accepting });
      setDispatchMsg('Dispatch settings saved.');
    } catch (err) {
      setDispatchErr(err?.message || 'Failed to save dispatch settings.');
    } finally {
      setSavingDispatch(false);
    }
  };

  const loadRoutePlan = async () => {
    setRoutePlan(null);
    setLoadingRoute(true);
    try {
      const plan = await fetchProviderRoutePlan();
      setRoutePlan(plan);
    } catch (err) {
      setDispatchErr(err?.message || 'Failed to load route plan.');
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex gap-4 items-center">
            {avatarState ? (
              <img
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                src={avatarState}
                alt="Partner avatar"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
                {String(user?.name || provider?.name || 'P').substring(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <div className="text-[11px] uppercase font-black tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-100 inline-flex px-2.5 py-1 rounded-full">
                Partner Profile
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-2">{provider.name || user.name || '—'}</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                ID: <span className="font-mono text-slate-700">{provider.id}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex gap-2">
              <VerificationLevelPill provider={provider} />
              <StatPill label="Rating" value={rating} />
              <StatPill label="Reviews" value={reviewsCount} />
            </div>

            <div className="flex gap-2">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditMode(false);
                    setSaveMsg('');
                    setSaveErr('');
                    setAvatarState(provider.avatar || provider.photo || provider.user?.avatar || '');
                    setAvatarChanged(false);
                  }}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-black px-4 py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}

              <button
                onClick={() => logout()}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <Section title="Partner (Provider) details">
        {editMode ? (
          <form onSubmit={handleSave} className="space-y-4">
            <ProfilePhotoPicker
              src={avatarState}
              folder="servego/providers"
              onChange={(url) => {
                setAvatarState(url);
                setAvatarChanged(true);
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Provider ID" value={provider.id} mono />
              <Field label="Category / Sector" value={provider.category} />

              <InputField label="Phone" value={phone} onChange={setPhone} placeholder="e.g. 9876543210" />
              <TextAreaField label="Bio" value={bio} onChange={setBio} placeholder="Write a short bio about your services..." />
              <InputField label="Experience (Years)" value={experienceYears} onChange={setExperienceYears} placeholder="e.g. 3" />
              <InputField label="Specialties" value={specialtiesText} onChange={setSpecialtiesText} placeholder="Comma separated: Plumbing, AC repair" />
              <InputField label="Service Areas" value={serviceAreasText} onChange={setServiceAreasText} placeholder="Comma separated: Hyderabad, Secunderabad" />
              <Field label="Featured" value={String(!!provider.isFeatured)} />
              <Field label="Verified" value={String(!!provider.isVerified)} />
            </div>

            {saveErr ? <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">{saveErr}</div> : null}
            {saveMsg ? <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">{saveMsg}</div> : null}

            <div className="flex gap-3 justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-black px-5 py-2 rounded-xl transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Provider ID" value={provider.id} mono />
            <Field label="Category / Sector" value={provider.category} />
            <Field label="Phone" value={provider.phone || user.phone} />
            <Field label="Bio" value={provider.bio} />
            <Field label="Experience (Years)" value={provider.experienceYears} />
            <Field
              label="Specialties"
              value={Array.isArray(provider.specialties) ? provider.specialties.join(', ') : provider.specialties}
            />
            <Field
              label="Service Areas"
              value={Array.isArray(provider.serviceAreas) ? provider.serviceAreas.join(', ') : provider.serviceAreas}
            />
            <Field label="Featured" value={String(!!provider.isFeatured)} />
            <Field label="Verified" value={String(!!provider.isVerified)} />
            <Field label="Verification Level" value={provider.verificationLevel || 'BRONZE'} />
          </div>
        )}
      </Section>

      <Section title="Badges">
        <AchievementList badges={provider.badges} />
      </Section>

      <Section title="User details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="User ID" value={user.id} mono />
          <Field label="Full Name" value={user.name} />
          <Field label="Email" value={user.email} mono />
          <Field label="Role" value={user.role} />
          <Field label="Status" value={user.status} />
          <Field label="Referral Code" value={provider.referralCode || user.referralCode || '—'} mono />
          <Field label="Joined Date" value={user.joinedDate || provider.createdAt || '—'} mono />
        </div>
      </Section>

      <Section title="Live Tracking & Route Planner">
        <div className="space-y-5">
          {/* Online / accepting toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div>
                <div className="text-xs font-black text-slate-800">Online</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Receive new job leads</div>
              </div>
              <button
                type="button"
                onClick={() => setOnline(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                aria-label="Toggle online status"
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${online ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div>
                <div className="text-xs font-black text-slate-800">Accepting Bookings</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Stay open for new jobs</div>
              </div>
              <button
                type="button"
                onClick={() => setAccepting(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${accepting ? 'bg-emerald-500' : 'bg-slate-300'}`}
                aria-label="Toggle accepting bookings"
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${accepting ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Base location + radius */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">Base Location (GPS)</span>
              <div className="flex gap-2">
                <input
                  value={baseLat}
                  onChange={(e) => setBaseLat(e.target.value)}
                  placeholder="Latitude"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-800 font-mono"
                />
                <input
                  value={baseLng}
                  onChange={(e) => setBaseLng(e.target.value)}
                  placeholder="Longitude"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-800 font-mono"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">Service Radius (km)</span>
              <input
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                placeholder="e.g. 10"
                type="number"
                min="1"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={useMyPosition}
              disabled={locating}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
            >
              {locating ? 'Locating…' : 'Use my current position'}
            </button>
            <button
              type="button"
              onClick={saveDispatchSettings}
              disabled={savingDispatch}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
            >
              {savingDispatch ? 'Saving…' : 'Save Dispatch Settings'}
            </button>
            <button
              type="button"
              onClick={loadRoutePlan}
              disabled={loadingRoute}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
            >
              {loadingRoute ? 'Building…' : 'Build Today’s Route'}
            </button>
          </div>

          {dispatchErr ? <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">{dispatchErr}</div> : null}
          {dispatchMsg ? <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">{dispatchMsg}</div> : null}

          {/* Route plan result */}
          {routePlan && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="text-[10px] uppercase font-black text-slate-400 mb-3">Optimized Visit Order ({routePlan.totalStops ?? routePlan.stops?.length ?? 0} jobs)</div>
              {Array.isArray(routePlan.stops) && routePlan.stops.length > 0 ? (
                <ol className="space-y-2">
                  {routePlan.stops.map((stop) => (
                    <li key={stop.bookingId} className="flex items-center gap-3 text-xs">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-[10px] shrink-0">
                        {stop.visitOrder}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-slate-800 truncate">{stop.customerName || stop.address || stop.bookingId}</div>
                        {stop.address && <div className="text-[10px] text-slate-500 font-semibold truncate">{stop.address}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-black text-slate-700 font-mono">
                          {stop.distanceFromPreviousKm != null ? `${Number(stop.distanceFromPreviousKm).toFixed(1)} km` : '—'}
                        </div>
                        {stop.etaFromPreviousMin != null && (
                          <div className="text-[9px] text-slate-400 font-semibold">{stop.etaFromPreviousMin} min</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-xs text-slate-500 font-semibold">No upcoming jobs to route right now.</div>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="Account / Security">
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-slate-700 leading-relaxed">
            🔒 Partner profile details are shown to you only. Verification status controls lead visibility.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Provider Visible" value={provider.isVerified ? 'YES (Verified)' : 'NO (Pending/Not verified)'} />
            <Field label="Featured Badge" value={provider.isFeatured ? 'YES' : 'NO'} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">{label}</span>
      <div
        className={`bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 text-xs font-semibold ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value === undefined || value === null || value === '' ? '—' : value}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-800"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <div className="sm:col-span-2">
      <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-800 resize-none"
      />
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-left">
      <div className="text-[10px] uppercase font-black text-slate-400">{label}</div>
      <div className="text-sm font-black text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}


