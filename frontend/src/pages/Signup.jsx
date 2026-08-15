import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AppContext';
import { api } from '../utils/apiClient';
import { User, Briefcase, Mail, Lock, Phone, ShieldAlert, Sparkles, Eye, EyeOff } from 'lucide-react';

export function Signup({ onNavigate }) {
  // Read partner application query params (set by BecomePartner page)
  const getQueryParam = (key) => {
    try {
      const params = new URLSearchParams(
        window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search
      );
      return params.get(key);
    } catch {
      return null;
    }
  };

  const partnerApplied = getQueryParam('partnerApplied');
  const partnerMessage = decodeURIComponent(getQueryParam('partnerMessage') || '');
  const { registerUser } = useAuth();


  const [signupType, setSignupType] = useState('customer');

  // Customer fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');

  // Provider fields
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  // Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Partner application redirect notice
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const applied = params.get('partnerApplied');
    if (applied === '1') {
      setSignupType('provider');
      const msg = params.get('partnerMessage');
      const decoded = msg
        ? decodeURIComponent(msg)
        : 'successfully submitted. Please register your account to continue.';
      setSuccessMsg(decoded);
      setErrorMsg('');
    }
  }, []);

  const resetErrorsAndSuccess = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const validateCommon = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10)
      return 'Please enter a valid mobile number (at least 10 digits).';
    if (!password || password.length < 8 || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return 'Password must be at least 8 characters and include a lowercase letter and a number.';
    }
    if (password !== confirmPassword) return 'Password and Confirm Password must match.';
    if (!acceptedTerms) return 'You must agree to the Terms & Conditions to continue.';
    return null;
  };

  const validateCustomer = () => {
    if (!address.trim()) return 'Please enter your address.';
    if (!pincode.trim()) return 'Please enter your pincode.';
    if (!/^[0-9]{5,6}$/.test(pincode.trim())) return 'Please enter a valid pincode (5-6 digits).';
    return null;
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetErrorsAndSuccess();

    const commonError = validateCommon();

    if (commonError) {
      setErrorMsg(commonError);
      return;
    }

    if (signupType === 'customer') {
      const customerError = validateCustomer();
      if (customerError) {
        setErrorMsg(customerError);
        return;
      }
    }

    setIsLoading(true);

    let photoUrl = null;
    if (signupType === 'provider' && photoFile) {
      setPhotoUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', photoFile);
        formData.append('folder', 'servego/providers');
        const uploadRes = await api.postFormData('/images/upload', formData);
        if (uploadRes.ok && uploadRes.data?.url) {
          photoUrl = uploadRes.data.url;
        } else {
          setIsLoading(false);
          setPhotoUploading(false);
          setErrorMsg('Failed to upload photo. Please try again.');
          return;
        }
      } catch {
        setIsLoading(false);
        setPhotoUploading(false);
        setErrorMsg('Failed to upload photo. Please try again.');
        return;
      }
      setPhotoUploading(false);
    }

    const payload =
      signupType === 'customer'
        ? {
            name: fullName.trim(),
            email: email.trim(),
            phone: mobileNumber.trim(),
            role: signupType,
            password,
            confirmPassword,
            address: address.trim(),
            pincode: pincode.trim(),
            acceptedTerms
          }
        : {
            name: fullName.trim(),
            email: email.trim(),
            phone: mobileNumber.trim(),
            role: signupType,
            password,
            confirmPassword,
            photo: photoUrl,
            acceptedTerms
          };


    const result = await registerUser(payload);

    setIsLoading(false);

    if (result && !result.success) {
      setErrorMsg(result.error || 'Failed to complete registration.');
      return;
    }

    setSuccessMsg(
      `Welcome to ServeGo, ${fullName}! Your account has been registered successfully. Getting things ready...`
    );

    setTimeout(() => {
      if (signupType === 'customer') {
        onNavigate('dashboard-customer');
      } else {
        onNavigate('dashboard-provider');
      }
    }, 1500);
  };

  return (
    <div id="signup-container-page" className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-lg relative">
        
        {/* Alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 block shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {partnerApplied === '1' && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block shrink-0 animate-ping" />
            <span>{partnerMessage || 'Application submitted successfully. Please register your account.'}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block shrink-0 animate-ping" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-xl bg-slate-900 items-center justify-center text-white font-extrabold text-lg shadow-sm mb-3">
            S⚙
          </div>
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-sans">
            Create Your Account
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium leading-relaxed">
            Join thousands of Hyderabad residents booking trusted local experts easily.
          </p>
        </div>

        {/* Signup Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setSignupType('customer');
              setErrorMsg('');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
              signupType === 'customer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />

            <span>As Customer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSignupType('provider');
              setErrorMsg('');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
              signupType === 'provider'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>As Provider</span>
          </button>
        </div>

        {/* Main form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Full Name *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="Enter your first and last name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Email Address *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Mobile Number *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                placeholder="e.g. 9848022311"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          {signupType === 'customer' && (
            <>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Address with pincode *</label>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House no, Street, Locality"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none min-h-[46px] resize-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
                <div className="mt-3">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 500081"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  />
                </div>
              </div>
            </>
          )}

          {signupType === 'provider' && (
            <div className="p-3 bg-slate-50 mb-2 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 font-sans">photo (optional)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setPhotoFile(null);
                      setPhotoPreview('');
                      return;
                    }
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="provider"
                    className="mt-3 w-16 h-16 rounded-lg object-cover border border-slate-200"
                  />
                )}
              </div>


            </div>
          )}


          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Password *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>


            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Confirm Password *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              />
              <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1">
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 text-[10px] font-semibold text-slate-600 leading-relaxed">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 accent-teal-700"
            />
            <span>
              ☐ I agree to the <span className="text-slate-900 font-extrabold">Terms &amp; Conditions</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 shadow-xs mt-6 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            {isLoading ? (
              <span>{photoUploading ? 'Uploading photo...' : 'Creating your account...'}</span>
            ) : (
              <>
                <span>Create Account</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>

          {signupType === 'provider' && (
            <div className="text-[10px] font-semibold text-slate-400 text-center leading-relaxed mt-2.5 flex items-start gap-1 justify-center bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">

              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>By registering, you confirm you have basic business eligibility under Hyderabad local guidelines.</span>
            </div>
          )}

          <div className="text-center mt-6 pt-5 border-t border-slate-100">
            <span className="text-slate-500 text-xs">Already have an account? </span>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-teal-700 font-extrabold text-xs hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
