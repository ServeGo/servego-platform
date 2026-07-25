import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export function ResetPassword({ onNavigate }) {
  const { resetPassword } = useApp();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setInvalidToken(true);
      setErrorMsg('No reset token found. Please use the link from your email.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token) {
      setErrorMsg('Reset token is missing.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter a new password.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(token, password);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg(result.message);
    } else {
      if (result.message?.includes('expired') || result.message?.includes('invalid')) {
        setInvalidToken(true);
      }
      setErrorMsg(result.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-lg relative">

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-xl bg-slate-900 items-center justify-center text-white font-extrabold text-lg shadow-sm mb-3">
            S⚙
          </div>
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">
            Reset Password
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium leading-relaxed">
            Enter your new password below.
          </p>
        </div>

        {successMsg ? (
          <div className="text-center space-y-4">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Go to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : invalidToken && !token ? (
          <div className="text-center space-y-4">
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Request a new reset link</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Min 8 characters, include a lowercase letter and a number.</p>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-10 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 shadow-xs mt-6"
            >
              {isLoading ? (
                <span>Resetting password...</span>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center mt-6 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-slate-500 text-xs font-semibold hover:text-slate-800 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
