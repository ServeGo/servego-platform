import React from 'react';
import { Lightbulb } from 'lucide-react';

export default function AvailabilityForm({ 
  onSubmit, 
  phone, setPhone, 
  experience, setExperience, 
  hourlyRate, setHourlyRate, 
  bio, setBio, 
  days, toggleDay, 
  slots, toggleSlot,
  isSaved,
  specialties
}) {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const daySlots = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left">
      <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <h4 className="font-bold text-slate-800 text-sm">Operational Configurations</h4>
        
        {isSaved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold">
            ✔ Profile and availability updated successfully
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Direct Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Experience</label>
                <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Daily Rate (₹)</label>
                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Biography</label>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none" placeholder="Service history, tools, etc..." />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3">On-Duty Days</label>
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
              {weekDays.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)} className={`p-2 rounded-xl text-xs font-black border transition-all ${days.includes(day) ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{day}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Active Dispatch Shifts</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {daySlots.map(slot => (
                <button key={slot} type="button" onClick={() => toggleSlot(slot)} className={`p-2 rounded-xl text-[10px] font-black border transition-all ${slots.includes(slot) ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{slot}</button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm">Save Configurations</button>
          </div>
        </form>
      </div>

      <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-3xs">
        <h4 className="font-bold text-slate-800 text-sm">Vetted Specialties</h4>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {specialties?.map((tag, idx) => (
            <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded border border-slate-200 uppercase tracking-tight">✔ {tag}</span>
          ))}
        </div>
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 text-[11px] p-4 rounded-xl font-semibold opacity-90 italic">
          <Lightbulb className="w-3.5 h-3.5 inline-block mr-1" /> Contact Admin to add new licenses or primary credentials to your public specialist profile.
        </div>
      </div>
    </div>
  );
}
