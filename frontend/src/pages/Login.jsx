import React, { useState } from 'react';
import { useAuth } from '../context/AppContext';
import Logo from '../components/Logo';
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';



export function Login({ onNavigate }) {
  const { login } = useAuth();

  // Read redirect intent from URL query param (set by booking flow when unauthenticated)
  const redirectParam = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('redirect')
    : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);

    const response = await login(email, password);
    setIsLoading(false);

    if (!response.success) {
      if (response.needsReview || response.blockedReason) {
        setErrorMsg(response.error || 'Your account is currently under review.');
      } else {
        setErrorMsg(response.error || 'Login failed. Please check your email and password.');
      }
    } else { 
      const destRole = response.role;
      setSuccessMsg(`Welcome Back! Successfully logged in as ${
        destRole === 'admin' ? 'System Administrator' : destRole === 'provider' ? 'Service Provider' : 'Customer'
      }. Opening your dashboard...`);
      
      setTimeout(() => {
        // Check for a stored booking intent (set when unauthenticated user clicked Book)
        const bookingIntentRaw = sessionStorage.getItem('servego_booking_intent');
        if (bookingIntentRaw && destRole === 'customer') {
          try {
            const intent = JSON.parse(bookingIntentRaw);
            if (intent.catId) {
              // Navigate back to services; the page will resume the modal
              onNavigate('services');
              return;
            }
          } catch {
            sessionStorage.removeItem('servego_booking_intent');
          }
        }
        // If there's a redirect intent (e.g. from booking flow), honor it
        if (redirectParam && destRole === 'customer') {
          // redirectParam is like "service-details/Electrician" — parse and navigate
          const parts = redirectParam.replace(/^\//, '').split('/');
          if (parts[0] === 'service-details' && parts[1]) {
            onNavigate('services');
            return;
          }
        }
        if (destRole === 'customer') {
          onNavigate('dashboard-customer');
        } else if (destRole === 'provider') {
          onNavigate('dashboard-provider');
        } else if (destRole === 'admin') {
          onNavigate('admin');
        }
      }, 1200);
    }
  };

  return (
    <div id="login-container-page" className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-lg relative">
        
        {/* Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="text-center mb-8">
          <Logo className="w-12 h-12 rounded-2xl mx-auto mb-3 shadow-md" />
          <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight font-sans">
            Sign In to servego24
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium leading-relaxed">
            Enter your email and password to log safely into your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Email address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="customer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-lg pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Password</label>
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
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-teal-700 text-[11px] font-bold hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
                className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition-all uppercase flex items-center justify-center gap-2 shadow-xs mt-6 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            {isLoading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Secure Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center mt-6 pt-5 border-t border-slate-100">
            <span className="text-slate-500 text-xs">New to servego24? </span>
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="text-teal-700 font-extrabold text-xs hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              Sign Up Now
            </button>
          </div>

        </form>


      </div>
    </div>
  );
}
