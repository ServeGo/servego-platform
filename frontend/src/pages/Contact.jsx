import React, { useState } from 'react';
import { CheckCircle2, MapPin, Mail, Phone, Landmark, Send, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Contact = () => {
  const { submitSupportTicket, currentUser } = useApp();

  // Logged-in ticket form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Booking Settle Issues');
  const [message, setMessage] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorText('');

    if (!currentUser) {
      window.location.hash = 'login';
      return;
    }

    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorText('Please fill out all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      submitSupportTicket({
        name,
        email,
        subject,
        message,
      });

      setIsSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="contact-page" className="bg-slate-50 min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-teal-700 font-extrabold uppercase tracking-wider text-xs">
            Customer Support Hub
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-sans text-slate-900 mt-2 tracking-tight">
            Get in touch
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            Bookings, refunds, and partner registration queries—our Hyderabad support team is available 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left: Public contact details */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 space-y-8 h-full shadow-sm">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Direct Hotlines</h3>
                <p className="text-slate-400 text-xs mt-1">Fast help for customers and service partners</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-teal-400 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block font-normal text-[10px] uppercase tracking-wide">Customer Toll-Free</span>
                    <span className="text-sm font-bold text-slate-100">1800-410-2026</span>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-teal-400 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block font-normal text-[10px] uppercase tracking-wide">Official Email</span>
                    <span className="text-sm font-bold text-slate-100">support@servego.com</span>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-emerald-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 block font-normal text-[10px] uppercase tracking-wide">Main Hyderabad HQ</span>
                    <span className="text-sm font-bold text-slate-100 leading-tight block">Mindspace, Hyderabad - 500081</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-start gap-3">
                <Landmark className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">Support Timings</h4>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">Mon-Sat: 10:00 AM to 6:00 PM (Identity verification)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Ticket area (logged-in only) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              {!currentUser ? (
                <div className="flex flex-col items-center text-center">
                  <h3 className="text-2xl font-bold text-slate-900">Contact Support</h3>
                  <p className="text-slate-500 text-sm mt-2 max-w-md">
                    To open and track support tickets, please login first. For quick help, use the hotlines on this page.
                  </p>

                  <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs w-full max-w-md">
                    <div className="font-bold">Support SLA</div>
                    <div className="text-slate-700 mt-1">Within 4 hours</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = 'login';
                    }}
                    className="mt-6 w-full max-w-md bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 border border-slate-750/30 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  >
                    <span>Login to Open a Support Ticket</span>
                  </button>
                </div>
              ) : (
                <div className="w-full">
                  <h3 className="text-2xl font-bold text-slate-900">Open a Support Ticket</h3>
                  <p className="text-slate-500 text-sm mt-2">Provide your details and we will respond shortly.</p>

                  {isSuccess && (
                    <div className="my-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">Support Ticket Logged</span>
                        <span className="text-slate-600">Check your Customer Dashboard for admin updates.</span>
                      </div>
                    </div>
                  )}

                  {errorText && (
                    <div className="my-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs">{errorText}</div>
                  )}

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Anand Kumar"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Your Email *</label>
                        <input
                          type="email"
                          required
                          placeholder="anand@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Inquiry Topic</label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        <option value="Booking Issues">Booking Issues</option>
                        <option value="Partner Verification">Partner Verification</option>
                        <option value="Payments & Refunds">Payments & Refunds</option>
                        <option value="Service Quality Details">Service Quality Details</option>
                        <option value="Business Inquiries">Business Inquiries</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Your detailed message *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="We ask for booking ID or specific details if requesting cancellations and refunds..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 border border-slate-750/30 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{isSubmitting ? 'Submitting...' : 'Send Ticket Message'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span>🔒 Secure support feedback</span>
              <span>SLA Response: Within 4 Hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

