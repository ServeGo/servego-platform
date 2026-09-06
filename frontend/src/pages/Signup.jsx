import React, { useMemo, useState } from 'react';
import { useAuth, useData } from '../context/AppContext';
import { api } from '../utils/apiClient';
import Logo from '../components/Logo';
import LocationPicker from '../components/LocationPicker';
import {
  Mail,
  Lock,
  Phone,
  User,
  Sparkles,
  Wrench,
  Camera,
  ImagePlus,
  MapPin,
  Check,
  ShieldCheck,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const inputClass =
  'w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-teal-600 focus:bg-white rounded-xl pl-10 pr-3 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 transition-all outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1';
const labelClass = 'block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5';

function FieldIcon({ icon: Icon }) {
  return (
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
      <Icon className="w-4 h-4" />
    </div>
  );
}

export function Signup({ onNavigate }) {
  const { registerUser } = useAuth();
  const { services } = useData();

  const [role, setRole] = useState('customer');
  const isProvider = role === 'provider';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationError, setLocationError] = useState('');

  const [category, setCategory] = useState('');

  const [imageUrl, setImageUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const serviceOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    for (const s of services || []) {
      const n = String(s?.name || '').trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        opts.push(n);
      }
    }
    return opts.sort((a, b) => a.localeCompare(b));
  }, [services]);

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setPhotoError('Please choose an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image is too large. Please choose one under 5 MB.');
      return;
    }
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('folder', isProvider ? 'servego/providers' : 'servego/customers');
      const res = await api.postFormData('/images/upload', fd);
      if (res.ok && res.data?.url) {
        setImageUrl(res.data.url);
        setPhotoPreview(URL.createObjectURL(file));
      } else {
        setPhotoError(
          (res.data && (res.data.message || res.data.error)) ||
            'Could not upload your photo — you can continue without one.'
        );
      }
    } catch {
      setPhotoError('Could not upload your photo — you can continue without one.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const validateCommon = () => {
    if (!fullName.trim() || fullName.trim().length < 2) return 'Please enter your full name.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return 'Please enter a valid email address.';
    if (!mobileNumber.trim() || !/^[+]?[\d\s-]{10,15}$/.test(mobileNumber.trim()))
      return 'Please enter a valid mobile number (10 digits or more).';
    if (!password || password.length < 8 || !/[a-z]/.test(password) || !/\d/.test(password))
      return 'Password must be at least 8 characters and include a lowercase letter and a number.';
    if (password !== confirmPassword) return 'Password and Confirm Password must match.';
    if (!acceptedTerms) return 'You must agree to the Terms & Conditions to continue.';
    return null;
  };

  const validateLocation = () => {
    if (!address.trim()) return 'Please enter your service address.';
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)))
      return 'Please choose your location on the map.';
    return null;
  };

  const validateProvider = () => {
    if (!category.trim()) return 'Please select the service you provide.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const commonError = validateCommon();
    if (commonError) {
      setErrorMsg(commonError);
      return;
    }
    const locError = validateLocation();
    if (locError) {
      setLocationError(locError);
      setErrorMsg('Please complete your service location.');
      return;
    }
    if (isProvider) {
      const providerError = validateProvider();
      if (providerError) {
        setErrorMsg(providerError);
        return;
      }
    }

    setIsLoading(true);

    const payload = {
      name: fullName.trim(),
      email: email.trim(),
      phone: mobileNumber.trim(),
      role,
      password,
      confirmPassword,
      address: address.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      acceptedTerms,
      ...(imageUrl ? { imageUrl } : {})
    };
    if (isProvider) {
      payload.category = category.trim();
    }

    const result = await registerUser(payload);

    setIsLoading(false);

    if (result && !result.success) {
      setErrorMsg(result.error || 'Failed to complete registration.');
      return;
    }

    setSuccessMsg(
      isProvider
        ? `Welcome aboard, ${fullName.split(' ')[0]}! Your professional account is pending admin verification. You'll start receiving leads once a service is approved.`
        : `Welcome to servego24, ${fullName.split(' ')[0]}! Your account has been registered successfully. Getting things ready...`
    );

    setTimeout(() => {
      onNavigate(isProvider ? 'dashboard-provider' : 'dashboard-customer');
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <Logo className="w-14 h-14 rounded-2xl shadow-md mb-3" />
          <h1 className="text-xl font-extrabold text-slate-950 tracking-tight text-center">
            Create your account
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium text-center">
            Join servego24 as a{' '}
            <span className="text-teal-700 font-extrabold">{isProvider ? 'service provider' : 'customer'}</span>{' '}
            — it takes less than a minute.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 sm:p-7">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account type */}
            <div>
              <span className={labelClass}>I am joining as</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole('customer');
                    setLocationError('');
                  }}
                  className={`cursor-pointer py-2.5 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 ${
                    !isProvider
                      ? 'bg-teal-700 border-teal-800 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('provider');
                    setLocationError('');
                  }}
                  className={`cursor-pointer py-2.5 rounded-xl text-xs font-bold transition-all border focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 ${
                    isProvider
                      ? 'bg-teal-700 border-teal-800 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Service Provider
                </button>
              </div>
            </div>

            {/* Optional photo */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => document.getElementById('signup-photo-input')?.click()}
                disabled={photoUploading}
                className="relative w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 flex items-center justify-center transition-all overflow-hidden disabled:opacity-60 group shrink-0"
                title="Add a profile photo (optional)"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400 group-hover:text-teal-600" />
                )}
                <span className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImagePlus className="w-5 h-5 text-white" />
                </span>
                {photoUploading && (
                  <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-teal-600 animate-spin" />
                  </span>
                )}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-800">Profile photo</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Optional. Upload a clear photo — we store it securely. If skipped, a default avatar is used.
                </p>
                {photoError && <p className="text-[10px] text-rose-600 font-bold mt-1">{photoError}</p>}
              </div>
              <input
                id="signup-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                }}
              />
            </div>

            <div>
              <label className={labelClass}>Full Name *</label>
              <div className="relative">
                <FieldIcon icon={User} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ravi Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email Address *</label>
              <div className="relative">
                <FieldIcon icon={Mail} />
                <input
                  type="email"
                  required
                  placeholder={isProvider ? 'provider@gmail.com' : 'customer@gmail.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Mobile Number *</label>
              <div className="relative">
                <FieldIcon icon={Phone} />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9848022311"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {isProvider && (
              <div>
                <label className={labelClass}>Service You Provide *</label>
                <div className="relative">
                  <FieldIcon icon={Wrench} />
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select your service</option>
                    {serviceOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Mandatory location for both roles */}
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  {isProvider ? 'Service Area / Base Location' : 'Your Service Location'} *
                </span>
              </label>
              <LocationPicker
                value={{ latitude, longitude, address }}
                onChange={({ latitude: lat, longitude: lng, address: addr }) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setAddress(addr);
                  setLocationError('');
                }}
                error={locationError || (errorMsg && !latitude) || undefined}
              />
              <p className="text-[10px] text-slate-500 font-medium mt-2">
                {isProvider
                  ? 'We use this to match you with customer jobs near you.'
                  : 'We use this to show you nearby providers and relevant services — no pincode needed.'}
              </p>
            </div>

            {isProvider && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-[11px] text-teal-800 font-medium leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Admin verifies every professional before they appear in search. You'll be notified once your profile
                  and service are approved.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Password *</label>
                <div className="relative">
                  <FieldIcon icon={Lock} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Confirm Password *</label>
                <div className="relative">
                  <FieldIcon icon={Lock} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2 text-[10px] font-semibold text-slate-600 leading-relaxed cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-teal-700 cursor-pointer"
              />
              <span>
                I agree to the <span className="text-slate-900 font-extrabold">Terms &amp; Conditions</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
            >
              {isLoading ? (
                <span>Creating your account...</span>
              ) : (
                <>
                  <span>{isProvider ? 'Create Professional Account' : 'Create Account'}</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center mt-2">
              <span className="text-slate-500 text-xs">Already have an account? </span>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-teal-700 font-extrabold text-xs hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}