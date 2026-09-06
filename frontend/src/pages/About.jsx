import React from 'react';
import { Shield, Users, Award, Landmark, MapPin, Milestone, Sparkles } from 'lucide-react';
import { CITIES } from '../data';

export const About = () => {
  return (
    <div id="about-page" className="bg-slate-50 min-h-screen py-12 px-4">
      {/* Editorial Header */}
      <div className="max-w-4xl mx-auto text-center mb-16">
        <span className="text-indigo-600 font-extrabold uppercase tracking-wider text-xs">Our Genesis</span>
        <h1 className="text-4xl md:text-5xl font-bold font-sans text-slate-900 mt-2 tracking-tight">
          Uncompromised Quality. At Your Command.
        </h1>
        <p className="text-slate-600 text-base sm:text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
          servego24 brings order to everyday home services. Built with the pace and precision of Hyderabad, we connect verified professionals with families—so you get reliable work, clear pricing, and quick resolution.
        </p>
      </div>

      {/* The Hyderabad and Beyond Map/Target */}
      <div className="max-w-5xl mx-auto bg-slate-900 rounded-3xl p-8 sm:p-12 text-white mb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,#4f46e5_0%,transparent_60%)] opacity-50" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-4">
              <MapPin className="w-3.5 h-3.5" />
              <span>Starting in Hyderabad (HQ)</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Our Multi-City Growth Strategy</h3>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              We started in Hyderabad and stress-tested our service flow across high-density areas like Gachibowli, Jubilee Hills, and Madhapur.
              The result: smoother scheduling, consistent quality, and faster resolution—ready to expand next.
            </p>

            {/* Cities Slider/Badges */}
            <div className="mt-6">
              <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 block mb-3">Rollout Cities Map</span>
              <div className="flex flex-wrap gap-2">
                <span className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md border border-indigo-500">
                  📍 Hyderabad (Live)
                </span>
                {CITIES.filter(c => c !== 'Hyderabad').map(city => (
                  <span key={city} className="bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-medium border border-slate-700/60">
                    {city} (Phase 2)
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <h4 className="text-3xl font-extrabold text-indigo-400">200+</h4>
              <p className="text-xs text-slate-300 mt-1 font-semibold">Registered Masters</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <h4 className="text-3xl font-extrabold text-indigo-400">4,500+</h4>
              <p className="text-xs text-slate-300 mt-1 font-semibold">Jobs Completed</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <h4 className="text-3xl font-extrabold text-emerald-400">4.85★</h4>
              <p className="text-xs text-slate-300 mt-1 font-semibold">Average Feedback</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <h4 className="text-3xl font-extrabold text-rose-400">60m</h4>
              <p className="text-xs text-slate-300 mt-1 font-semibold">Service Slashed SLA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Pillars */}
      <div className="max-w-5xl mx-auto mb-20">
        <h3 className="text-2xl font-bold text-center text-slate-900 mb-12 font-sans">The Pillars of the servego24 Ecosystem</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/10">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Ironclad Safety Vetting</h4>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              Every partner goes through structured verification checks—so your home stays safe, and you feel confident from day one.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Partner First Philosophy</h4>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              We support local pros with simple tools and fast payouts—so they can focus on doing quality work for customers.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Absolute Price Guard</h4>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed">
              Transparent pricing before you confirm—so there are no surprises later.
            </p>
          </div>
        </div>
      </div>

      {/* Training and Centers */}
      <div className="max-w-5xl mx-auto bg-indigo-50/50 rounded-3xl border border-indigo-100 p-8 sm:p-12">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <span className="text-indigo-600 font-extrabold uppercase tracking-wider text-xs">Skills & Mastery</span>
            <h3 className="text-2xl font-bold font-sans text-slate-900 mt-2">Physical Experience Centers (Nodal Training)</h3>
            <p className="text-slate-600 text-sm mt-4 leading-relaxed">
              To guarantee startup readiness and outstanding consistency, we established training labs in Hyderabad. Our partners undergo simulated household drills to master smart home appliance interfaces, water leakage acoustic sensors, and eco-friendly paint formulations before earning their Certified Badge.
            </p>
            <div className="mt-6 flex gap-4 items-center">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" />
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" />
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" />
              </div>
              <span className="text-xs font-semibold text-slate-600">Daily drill inspections at Gachibowli Hub</span>
            </div>
          </div>
          <div className="md:w-1/2 grid grid-cols-2 gap-4 w-full">
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-indigo-100">
              <Milestone className="w-5 h-5 text-indigo-600 mb-2" />
              <h5 className="font-bold text-slate-900 text-sm">Strict Quality Check</h5>
              <p className="text-xs text-slate-500 mt-1">Daily pre-departure tool checklist validations.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-indigo-100">
              <Sparkles className="w-5 h-5 text-indigo-600 mb-2" />
              <h5 className="font-bold text-slate-900 text-sm">Eco Chemistry</h5>
              <p className="text-xs text-slate-500 mt-1">Using only non-toxic sanitizing products.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-indigo-100">
              <Users className="w-5 h-5 text-indigo-600 mb-2" />
              <h5 className="font-bold text-slate-900 text-sm">Punctual Mandate</h5>
              <p className="text-xs text-slate-500 mt-1">If late by more than 15 mins, enjoy flat ₹100 discount.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-xs border border-indigo-100">
              <Landmark className="w-5 h-5 text-indigo-600 mb-2" />
              <h5 className="font-bold text-slate-900 text-sm">Fair wages</h5>
              <p className="text-xs text-slate-500 mt-1">80% of booking cost flows directly to the provider.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
