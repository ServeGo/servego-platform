import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Crown, Pencil, Save, X, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api as apiClient } from '../../../utils/apiClient';
import { SkeletonLoader } from '../../../components/SkeletonLoader';

const LEVEL_META = {
  BRONZE: 'bg-orange-100 text-orange-700 border-orange-200',
  SILVER: 'bg-slate-200 text-slate-700 border-slate-300',
  GOLD: 'bg-amber-100 text-amber-700 border-amber-300',
  PLATINUM: 'bg-sky-100 text-sky-700 border-sky-300',
  DIAMOND: 'bg-violet-100 text-violet-700 border-violet-300'
};

function LevelBadge({ level }) {
  const tone = LEVEL_META[level] || 'bg-slate-900 text-white border-slate-900';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${tone}`}>
      {level}
    </span>
  );
}

export default function Adminservego24Tab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">servego24 Business Model</h2>
        <p className="text-slate-500 text-xs mt-1">
          Provider level rules — thresholds and the monthly incentive % credited back to provider wallets on each level-up.
        </p>
      </div>

      <LevelRulesSection />
    </div>
  );
}

function LevelRulesSection() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');
  const flashTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiClient.get('/admin/level-rules');
    if (res.ok) {
      setRules(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.data?.message || res.data?.error || 'Failed to load level rules.');
    }
    setLoading(false);
  }, []);

  // Guard so React StrictMode's dev double-mount does not fire the same request
  // twice (real re-mounts get a fresh ref).
  const fetchedOnceRef = useRef(false);
  useEffect(() => {
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;
    load();
    return () => { if (flashTimer.current) window.clearTimeout(flashTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setMessage(''), 4000);
  };

  const patch = async (id, body, { closeEditor = false } = {}) => {
    setSavingId(id);
    const res = await apiClient.patch(`/admin/level-rules/${id}`, body);
    setSavingId(null);
    if (res.ok) {
      setRules((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      if (closeEditor) setEditingId(null);
      flash('ok', 'Level rule updated.');
    } else {
      flash('err', res.data?.message || res.data?.error || 'Failed to update level rule.');
    }
  };

  const saveEdit = (rule, values) => {
    const minJobs = Number(values.minJobs);
    const incentivePercent = Number(values.incentivePercent);
    if (!Number.isInteger(minJobs) || minJobs < 0) {
      flash('err', 'Minimum jobs must be a whole number of 0 or more.');
      return;
    }
    if (!Number.isFinite(incentivePercent) || incentivePercent < 0 || incentivePercent > 100) {
      flash('err', 'Incentive % must be a number between 0 and 100.');
      return;
    }
    patch(rule.id, {
      minJobs,
      incentivePercent,
      description: String(values.description || '').trim() || null
    }, { closeEditor: true });
  };

  const toggleActive = (rule) => {
    patch(rule.id, { active: !rule.active });
  };

  const activeCount = rules.filter((r) => r.active).length;
  const baseThreshold = rules.length
    ? rules.reduce((min, r) => (r.active && (min === null || r.minJobs < min) ? r.minJobs : min), null)
    : null;

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

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </p>
          <button onClick={load} className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="table" count={3} />
      ) : rules.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Crown className="w-6 h-6" />
          </div>
          <p className="text-xs font-extrabold text-slate-700 mt-3">No level rules configured</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1 max-w-[280px] leading-relaxed">
            Run the business model seed to create the BRONZE → DIAMOND level ladder.
          </p>
          <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800">
            Reload
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Levels" value={rules.length} />
            <StatTile label="Active" value={activeCount} />
            <StatTile label="Base jobs" value={baseThreshold !== null ? baseThreshold : '—'} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" /> Provider Level Rules
              </span>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] text-slate-400 font-semibold">Monthly incentive % — credited to provider wallets on each level-up</span>
                <button
                  onClick={load}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  title="Refresh rules"
                  aria-label="Refresh rules"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  editing={editingId === rule.id}
                  saving={savingId === rule.id}
                  onEdit={() => setEditingId(rule.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={(values) => saveEdit(rule, values)}
                  onToggle={() => toggleActive(rule)}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Level', 'Min Jobs', 'Incentive', 'Description', 'Active', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    editingId === rule.id ? (
                      <RuleEditRow
                        key={rule.id}
                        rule={rule}
                        saving={savingId === rule.id}
                        onCancel={() => setEditingId(null)}
                        onSave={(values) => saveEdit(rule, values)}
                      />
                    ) : (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        saving={savingId === rule.id}
                        onEdit={() => setEditingId(rule.id)}
                        onToggle={() => toggleActive(rule)}
                      />
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <span className="block text-xl font-black text-slate-900 mt-0.5">{value}</span>
    </div>
  );
}

function ActiveToggle({ active, saving, disabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || saving}
      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${active ? 'bg-teal-600' : 'bg-slate-200'}`}
      title={active ? 'Level is active — click to deactivate' : 'Level is inactive — click to activate'}
      aria-label={`${active ? 'Deactivate' : 'Activate'} level`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

function EditButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-900 hover:text-white hover:border-slate-900"
    >
      <Pencil className="w-3.5 h-3.5" /> Edit
    </button>
  );
}

function RuleRow({ rule, saving, onEdit, onToggle }) {
  return (
    <tr className="hover:bg-slate-50 align-middle">
      <td className="px-4 py-3"><LevelBadge level={rule.level} /></td>
      <td className="px-4 py-3">
        <span className="font-black text-slate-800">{rule.minJobs}</span>
        <span className="text-slate-400 font-semibold text-[10px] ml-1">jobs</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-black text-slate-800">{rule.incentivePercent}%</span>
        <span className="text-slate-400 font-semibold text-[10px] ml-1">of band commission</span>
      </td>
      <td className="px-4 py-3">
        <span className={`${rule.description ? 'text-slate-600 font-medium' : 'text-slate-300 italic'}`}>
          {rule.description || '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        <ActiveToggle active={rule.active} saving={saving} onToggle={onToggle} />
      </td>
      <td className="px-4 py-3">
        <EditButton onClick={onEdit} />
      </td>
    </tr>
  );
}

function RuleEditRow({ rule, saving, onSave, onCancel }) {
  const [minJobs, setMinJobs] = useState(rule.minJobs);
  const [incentive, setIncentive] = useState(rule.incentivePercent);
  const [description, setDescription] = useState(rule.description || '');

  return (
    <tr className="bg-amber-50/40 align-middle">
      <td className="px-4 py-3"><LevelBadge level={rule.level} /></td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          step={1}
          value={minJobs}
          onChange={(e) => setMinJobs(e.target.value)}
          className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={incentive}
          onChange={(e) => setIncentive(e.target.value)}
          className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
        />
      </td>
      <td className="px-4 py-3">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this level"
          className="w-full min-w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
        />
      </td>
      <td className="px-4 py-3">
        <ActiveToggle active={rule.active} saving={saving} disabled={true} onToggle={() => {}} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSave({ minJobs, incentivePercent: incentive, description })}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-black px-3 py-2 hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white text-slate-600 text-xs font-bold px-3 py-2 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

function RuleCard({ rule, editing, saving, onEdit, onCancel, onSave, onToggle }) {
  return (
    <article className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LevelBadge level={rule.level} />
        </div>
        {!editing && <ActiveToggle active={rule.active} saving={saving} onToggle={onToggle} />}
      </div>

      {editing ? (
        <EditFields rule={rule} saving={saving} onSave={onSave} onCancel={onCancel} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Min jobs</span>
              <span className="block text-sm font-black text-slate-800 mt-0.5">{rule.minJobs}</span>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Incentive</span>
              <span className="block text-sm font-black text-slate-800 mt-0.5">{rule.incentivePercent}%</span>
            </div>
          </div>
          <p className={`text-xs leading-snug ${rule.description ? 'text-slate-600 font-medium' : 'text-slate-300 italic'}`}>
            {rule.description || 'No description set for this level.'}
          </p>
          <EditButton onClick={onEdit} />
        </>
      )}
    </article>
  );
}

function EditFields({ rule, saving, onSave, onCancel }) {
  const [minJobs, setMinJobs] = useState(rule.minJobs);
  const [incentive, setIncentive] = useState(rule.incentivePercent);
  const [description, setDescription] = useState(rule.description || '');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Minimum jobs
          <input type="number" min={0} step={1} value={minJobs} onChange={(e) => setMinJobs(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500" />
        </label>
        <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Incentive (%)
          <input type="number" min={0} max={100} step={0.1} value={incentive} onChange={(e) => setIncentive(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500" />
        </label>
      </div>
      <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this level"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-teal-500" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave({ minJobs, incentivePercent: incentive, description })} disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}