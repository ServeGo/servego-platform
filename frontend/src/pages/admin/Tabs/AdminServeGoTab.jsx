import React, { useState, useEffect, useCallback } from 'react';
import { Crown, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api as apiClient } from '../../../utils/apiClient';

export default function Adminservego24Tab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">servego24 Business Model</h2>
        <p className="text-slate-500 text-xs">Level rules and marketplace configuration.</p>
      </div>

      <LevelRulesSection />
    </div>
  );
}

/* -------------------------------- Level Rules -------------------------------- */

function LevelRulesSection() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.get('/admin/level-rules');
    if (res.ok) setRules(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const patch = async (id, field, value) => {
    setSavingId(id);
    const body = field === 'bulk'
      ? { minJobs: Number(value.minJobs), incentivePercent: Number(value.incentivePercent), description: value.description || null }
      : { [field]: value };
    const res = await apiClient.patch(`/admin/level-rules/${id}`, body);
    setSavingId(null);
    if (res.ok) {
      setRules((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      flash('ok', 'Level rule updated.');
    } else {
      flash('err', res.data?.message || res.data?.error || 'Failed to update level rule.');
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`flex items-center gap-2 text-xs font-bold rounded-2xl px-4 py-3 border ${
          messageTone === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {messageTone === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {message}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Provider Level Rules
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">Monthly incentive % — credited back to provider wallets on each level-up</span>
        </div>
        {loading ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">Loading level rules...</p>
        ) : rules.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">No level rules found.</p>
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} saving={savingId === rule.id} onSave={patch} />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Level', 'Min Jobs', 'Incentive %', 'Description', 'Active', 'Save'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    <RuleRow key={rule.id} rule={rule} saving={savingId === rule.id} onSave={patch} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RuleRow({ rule, saving, onSave }) {
  const [minJobs, setMinJobs] = useState(rule.minJobs);
  const [incentive, setIncentive] = useState(rule.incentivePercent);
  const [description, setDescription] = useState(rule.description || '');
  const [active, setActive] = useState(rule.active);

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase border bg-slate-900 text-white border-slate-900">{rule.level}</span>
      </td>
      <td className="px-4 py-3">
        <input type="number" value={minJobs} onChange={(e) => setMinJobs(e.target.value)} className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500" />
      </td>
      <td className="px-4 py-3">
        <input type="number" value={incentive} onChange={(e) => setIncentive(e.target.value)} className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500" />
      </td>
      <td className="px-4 py-3">
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-w-[180px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500" />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => { setActive(!active); onSave(rule.id, 'active', !active); }}
          className={`relative w-12 h-6 rounded-full transition-colors ${active ? 'bg-teal-600' : 'bg-slate-200'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
        </button>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onSave(rule.id, 'bulk', { minJobs: Number(minJobs), incentivePercent: Number(incentive), description: description || null })}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

function RuleCard({ rule, saving, onSave }) {
  const [minJobs, setMinJobs] = useState(rule.minJobs);
  const [incentive, setIncentive] = useState(rule.incentivePercent);
  const [description, setDescription] = useState(rule.description || '');
  const [active, setActive] = useState(rule.active);

  const saveRule = () => onSave(rule.id, 'bulk', {
    minJobs: Number(minJobs),
    incentivePercent: Number(incentive),
    description: description || null
  });

  const toggleActive = () => {
    const nextActive = !active;
    setActive(nextActive);
    onSave(rule.id, 'active', nextActive);
  };

  return (
    <article className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border bg-slate-900 text-white border-slate-900">{rule.level}</span>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">Provider level requirements</p>
        </div>
        <button type="button" onClick={toggleActive} disabled={saving} className={`relative h-7 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-teal-600' : 'bg-slate-200'}`} aria-label={`${active ? 'Deactivate' : 'Activate'} ${rule.level} level`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${active ? 'left-8' : 'left-1'}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-[9px] font-black uppercase tracking-wide text-slate-400">Minimum jobs
          <input type="number" value={minJobs} onChange={(e) => setMinJobs(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500" />
        </label>
        <label className="text-[9px] font-black uppercase tracking-wide text-slate-400">Incentive (%)
          <input type="number" value={incentive} onChange={(e) => setIncentive(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500" />
        </label>
      </div>

      <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this level" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500" />
      </label>

      <button type="button" onClick={saveRule} disabled={saving} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
        <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save level rule'}
      </button>
    </article>
  );
}