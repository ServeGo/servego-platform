import React, { useState } from 'react';
import { ShieldAlert, Sparkles, Send } from 'lucide-react';
import { SERVICE_CATEGORIES, HYDERABAD_NEIGHBORHOODS } from '../data';

export const BecomePartner = () => {
  
  // Intake form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0].name);
  const [experience, setExperience] = useState('5');
  const [hourlyRate, setHourlyRate] = useState('300');
  const [bio, setBio] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [selectedAreas, setSelectedAreas] = useState(['Gachibowli', 'Madhapur']);
  
  // Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  

  const handleAreaToggle = (area) => {
    setSelectedAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  // NOTE: `currentUser` and a dedicated `specialtiesList` preview are intentionally omitted
  // to keep this registration form focused and avoid unused variable warnings.

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorText('');

    if (!name.trim() || !email.trim() || !phone.trim() || !bio.trim()) {
      setErrorText('Please fill out all required fields.');
      return;
    }

    if (selectedAreas.length === 0) {
      setErrorText('Please select at least one Hyderabad active zone.');
      return;
    }

    // No excel saving for now (per requirement). Redirect to Signup with a success notice.
    setIsSubmitting(true);

    const msg = encodeURIComponent('successfully submitted. Please register your account to continue.');

    // Use hash-based navigation so SPA route stays consistent.
    window.location.hash = `signup?partnerApplied=1&partnerMessage=${msg}`;
  };



  return (
    <div id="become-partner-page" className="bg-slate-50 min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Pitching Grid header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Make up to ₹45,000 / month</span>
            </div>
            <h1 className="text-4xl font-bold font-sans text-slate-900 tracking-tight leading-tight">
              Grow Your Home Service Business With ServeGo
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              We handle your bookings, customer requests, and payments while you focus on delivering premium service. Expand comfortably across Hyderabad.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Weekly Settlements</h5>
                <p className="text-slate-500 text-xs mt-1">Direct account transfers every Tuesday morning without default.</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">True Autonomy</h5>
                <p className="text-slate-500 text-xs mt-1">Accept or decline job leads depending on your own slot schedule.</p>
              </div>
            </div>
          </div>

          {/* Form container */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8">
            <h3 className="text-xl font-bold text-slate-900">Partner Registration</h3>
            <p className="text-slate-500 text-xs mt-1">Provide your professional credentials to begin the verification.</p>

            {errorText && (
              <div className="mt-4 bg-rose-50 border border-slate-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{errorText}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Profile setup details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Srinivas Reddy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">E-mail Address *</label>
                  <input 
                    type="email"
                    required
                    placeholder="srinivas@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mobile Phone Number *</label>
                  <input 
                    type="tel"
                    required
                    placeholder="9988776655"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Specialty Category *</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  >
                    {SERVICE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Experience (Years) *</label>
                  <input 
                    type="number"
                    min="1"
                    max="40"
                    required
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Stated Day pricing (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">₹</span>
                    <input 
                      type="number"
                      min="100"
                      max="2000"
                      required
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-6 pr-3 py-2 text-xs font-semibold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Describe Biography / Experience *</label>
                <textarea 
                  required
                  placeholder="Share details about your licensing, training, or notable commercial jobs completed..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Add Specialty Tags (Comma-separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Smart Switches Setup, Geyser Specialist, Industrial wiring"
                  value={specialtiesText}
                  onChange={(e) => setSpecialtiesText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                />
              </div>

               {/* Service Areas */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Service Sectors (Hyderabad Locations) *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {HYDERABAD_NEIGHBORHOODS.map(area => {
                    const checked = selectedAreas.includes(area);
                    return (
                      <button
                        type="button"
                        key={area}
                        onClick={() => handleAreaToggle(area)}
                        className={`p-2 rounded-lg text-[10px] font-bold border text-center transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                          checked 
                            ? 'bg-teal-700 border-teal-850 text-white' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                ⓘ By submitting, you agree to ServeGo’s security screening and platform service fee deductions (flat 20%).
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-2 border border-teal-500/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
              >
                {isSubmitting ? (
                  <span>Redirecting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Partner Application</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
