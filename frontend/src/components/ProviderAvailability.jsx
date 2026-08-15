import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, useData } from '../context/AppContext';

function parseCommaList(text) {
  if (!text) return [];
  return text
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function Field({ label, children }) {
  return (
    <div>
      <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">{label}</span>
      {children}
    </div>
  );
}


export default function ProviderAvailability() {
  const { currentUser } = useAuth();
  const { providers, updateProviderAvailability } = useData();

  const activeProvider = useMemo(() => {
    const providerIdCandidate = currentUser?.providerId;
    const providerUserIdCandidate = currentUser?.id;

    const byProviderId = providerIdCandidate ? providers.find(p => p.id === providerIdCandidate) : null;
    const byUserId = providerUserIdCandidate ? providers.find(p => p.userId === providerUserIdCandidate) : null;

    return byProviderId || byUserId || null;
  }, [currentUser, providers]);

  const [loading, setLoading] = useState(!activeProvider);

  const [availableDays, setAvailableDays] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setLoading(!activeProvider);
    setSaveErr('');
    setSaveMsg('');

    if (!activeProvider) return;

    setAvailableDays(Array.isArray(activeProvider.availableDays) ? activeProvider.availableDays : (activeProvider.availableDays ? parseCommaList(activeProvider.availableDays) : []));
    setAvailabilitySlots(Array.isArray(activeProvider.availabilitySlots) ? activeProvider.availabilitySlots : []);

    setLoading(false);
  }, [activeProvider]);

  const validate = () => {
    const errors = [];

    if (!availableDays.length) errors.push('Available days is required');

    if (availableDays.some(d => d.length > 20)) errors.push('Day names look too long');
    if (availabilitySlots.some((slot) => !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime)) errors.push('Every time slot needs a valid start and end time');

    return errors;
  };


  const handleSave = async (e) => {
    e.preventDefault();
    setSaveErr('');
    setSaveMsg('');


    if (!activeProvider?.id) {
      setSaveErr('Partner not available');
      return;
    }

    const errors = validate();
    if (errors.length) {
      setSaveErr(errors.join('. '));
      return;
    }

    setSaving(true);
    try {
      await updateProviderAvailability(activeProvider.id, availableDays, [], availabilitySlots);
      setSaveMsg('Availability saved successfully');
    } catch (err) {
      setSaveErr(err?.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }



  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-3xl mx-auto">
        <div className="text-sm font-bold text-slate-900">Loading availability...</div>
      </div>
    );
  }

  if (!activeProvider) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-3xl mx-auto">
        <div className="text-sm font-bold text-rose-700">Partner availability not found.</div>
      </div>
    );
  }

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toggleDay = (d) => {
    setAvailableDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
    setAvailabilitySlots(prev => prev.filter((slot) => slot.dayOfWeek !== d || !availableDays.includes(d)));
  };

  const addSlot = (dayOfWeek) => setAvailabilitySlots((prev) => [...prev, { dayOfWeek, startTime: '09:00', endTime: '17:00' }]);
  const updateSlot = (index, key, value) => setAvailabilitySlots((prev) => prev.map((slot, i) => i === index ? { ...slot, [key]: value } : slot));



  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
        <h2 className="text-xl font-black text-slate-900">Availability</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Choose working days and one or more appointment windows for each day.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-5">
            <Field label="Available Days">
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => {
                  const active = availableDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={
                        `px-3 py-2 text-xs font-black rounded-xl border transition-colors ` +
                        (active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                      }
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <div className="space-y-3">
            <Field label="Appointment windows">
              {availableDays.length === 0 ? (
                <p className="text-xs text-slate-500">Select at least one day to add time slots.</p>
              ) : availableDays.map((day) => {
                const daySlots = availabilitySlots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.dayOfWeek === day);
                return <div key={day} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between"><span className="text-xs font-black text-slate-700">{day}</span><button type="button" onClick={() => addSlot(day)} className="text-xs font-bold text-indigo-700 transition-colors">Add slot</button></div>
                  {daySlots.map(({ slot, index }) => <div key={`${day}-${index}`} className="flex items-center gap-2">
                    <input type="time" value={slot.startTime} onChange={(e) => updateSlot(index, 'startTime', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                    <span className="text-xs text-slate-400">to</span>
                    <input type="time" value={slot.endTime} onChange={(e) => updateSlot(index, 'endTime', e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                    <button type="button" onClick={() => setAvailabilitySlots((prev) => prev.filter((_, i) => i !== index))} className="text-xs font-bold text-rose-600 transition-colors">Remove</button>
                  </div>)}
                </div>;
              })}
            </Field>
          </div>

          <div className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 rounded-2xl p-4">
            Tip: Add multiple windows when you work morning and evening shifts.
          </div>


          {saveErr ? (
            <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">{saveErr}</div>
          ) : null}
          {saveMsg ? (
            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">{saveMsg}</div>
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-black px-5 py-2 rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


