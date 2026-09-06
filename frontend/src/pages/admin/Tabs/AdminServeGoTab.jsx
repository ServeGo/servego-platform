import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Crown,
  Inbox,
  Gauge,
  BarChart3,
  Save,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  X,
  Wallet,
  Banknote,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { api as apiClient } from '../../../utils/apiClient';
import { exportAllPages } from '../../../utils/exportExcel';

const PAGE_SIZE = 15;

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
};

const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`;

const STATUS_STYLES = {
  NEW: 'bg-amber-100 border-amber-300 text-amber-800',
  VIEWED: 'bg-sky-100 border-sky-300 text-sky-800',
  ACCEPTED: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  REJECTED: 'bg-rose-100 border-rose-300 text-rose-800',
  EXPIRED: 'bg-slate-100 border-slate-300 text-slate-600',
  TRANSFERRED: 'bg-indigo-100 border-indigo-300 text-indigo-800',
  COMPLETED: 'bg-emerald-100 border-emerald-300 text-emerald-800'
};

const CONFIG_SCHEMA = {
  cancellationPenaltyScore: {
    type: 'number',
    label: 'Cancellation Penalty Score',
    description: 'Penalty score added per provider-initiated cancellation.',
    default: 30
  }
};

function normalizeConfigValue(schema, raw) {
  const type = schema.type;
  if (type === 'boolean') return raw === true || raw === 'true';
  if (type === 'number') return Number(raw || 0);
  if (type === 'list') return Array.isArray(raw) ? raw : String(raw || '').split(',').map((s) => s.trim()).filter(Boolean);
  return raw;
}

export default function Adminservego24Tab() {
  const [tab, setTab] = useState('config');

  const tabs = [
    { id: 'config', label: 'Config' },
    { id: 'levels', label: 'Level Rules' },
    { id: 'leads', label: 'Leads' },
    { id: 'performance', label: 'Provider Performance' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">servego24 Business Model</h2>
        <p className="text-slate-500 text-xs">Lead marketplace configuration, level rules, and marketplace analytics.</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-2xl w-full overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); }}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' && <ConfigSection />}
      {tab === 'levels' && <LevelRulesSection />}
      {tab === 'leads' && <LeadsSection />}
      {tab === 'performance' && <PerformanceSection />}
      {tab === 'wallet' && <WalletSection />}
      {tab === 'analytics' && <AnalyticsSection />}
    </div>
  );
}

/* ---------------------------------- Config ---------------------------------- */

function ConfigSection() {
  const [values, setValues] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');

  const load = useCallback(async () => {
    setLoaded(false);
    const res = await apiClient.get('/admin/configs');
    const stored = res.ok && typeof res.data === 'object' ? res.data : {};
    const merged = {};
    Object.entries(CONFIG_SCHEMA).forEach(([key, schema]) => {
      merged[key] = stored[key] !== undefined ? stored[key] : schema.default;
    });
    setValues(merged);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const save = async (key) => {
    setSavingKey(key);
    const value = normalizeConfigValue(CONFIG_SCHEMA[key], values[key]);
    const res = await apiClient.put(`/admin/configs/${key}`, { value });
    setSavingKey(null);
    if (res.ok) {
      setValues((prev) => ({ ...prev, [key]: value }));
      flash('ok', `Saved ${CONFIG_SCHEMA[key].label}.`);
    } else {
      flash('err', res.data?.message || res.data?.error || 'Failed to save config.');
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`flex items-center gap-2 text-xs font-bold rounded-2xl px-4 py-3 border ${
          messageTone === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {messageTone === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {message}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-600" /> Marketplace Configuration
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">Changes take effect within 30s (cache TTL)</span>
        </div>
        {!loaded ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">Loading configuration...</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(CONFIG_SCHEMA).map(([key, schema]) => (
              <div key={key} className="p-4 sm:px-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-slate-900">{schema.label}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{schema.description}</p>
                    <code className="text-[9px] text-slate-400 font-mono">{key}</code>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {schema.type === 'boolean' ? (
                      <button
                        onClick={() => setValues((prev) => ({ ...prev, [key]: !prev[key] }))}
                        className={`relative w-14 h-7 rounded-full transition-colors ${values[key] ? 'bg-teal-600' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${values[key] ? 'left-8' : 'left-1'}`} />
                      </button>
                    ) : schema.type === 'number' ? (
                      <input
                        type="number"
                        value={values[key] ?? ''}
                        onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
                      />
                    ) : schema.type === 'text' ? (
                      <input
                        value={typeof values[key] === 'object' && values[key] !== null ? JSON.stringify(values[key]) : (values[key] ?? '')}
                        onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="JSON"
                        className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
                      />
                    ) : (
                      <input
                        value={Array.isArray(values[key]) ? values[key].join(', ') : (values[key] ?? '')}
                        onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Comma separated"
                        className="w-full sm:w-56 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
                      />
                    )}
                    <button
                      onClick={() => save(key)}
                      disabled={savingKey === key}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingKey === key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
      ? { minJobs: Number(value.minJobs), discountPercent: Number(value.discountPercent), description: value.description || null }
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
          <span className="text-[10px] text-slate-400 font-semibold">Savings shown to providers on their plan purchases</span>
        </div>
        {loading ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">Loading level rules...</p>
        ) : rules.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">No level rules found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Level', 'Min Jobs', 'Discount %', 'Description', 'Active', 'Save'].map((h) => (
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
        )}
      </div>
    </div>
  );
}

function RuleRow({ rule, saving, onSave }) {
  const [minJobs, setMinJobs] = useState(rule.minJobs);
  const [discount, setDiscount] = useState(rule.discountPercent);
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
        <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500" />
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
          onClick={() => onSave(rule.id, 'bulk', { minJobs: Number(minJobs), discountPercent: Number(discount), description: description || null })}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

/* ----------------------------------- Leads ---------------------------------- */

function LeadsSection() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (status) q.set('status', status);
    const res = await apiClient.get(`/admin/leads?${q.toString()}`);
    if (res.ok) {
      setLeads(res.data?.leads || []);
      setTotal(res.data?.pagination?.total || 0);
      setPages(res.data?.pagination?.pages || 0);
    } else {
      setLeads([]);
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = async (lead) => {
    const res = await apiClient.get(`/admin/leads/${lead.id}`);
    if (res.ok) setDetail(res.data);
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllPages({
        fetchPage: async (page, limit) => {
          const q = new URLSearchParams({ page: String(page), limit: String(limit) });
          if (status) q.set('status', status);
          const res = await apiClient.get(`/admin/leads?${q.toString()}`);
          const rows = (res.data?.leads || []).map((lead) => ({
            Lead: lead.id,
            Customer: lead.customer?.name || '',
            'Customer Phone': lead.customer?.phone || '',
            Category: lead.serviceCategory || '',
            Status: lead.status || '',
            Provider: lead.provider?.user?.name || '',
            'Distance (km)': lead.distanceKm != null ? Number(lead.distanceKm).toFixed(1) : '',
            Transfers: lead.transferCount ?? 0,
            'Created At': fmtDate(lead.createdAt)
          }));
          return { rows, total: res.data?.pagination?.total || 0 };
        },
        fileName: 'leads-report',
        sheetName: 'Leads'
      });
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-teal-600" /> All Leads ({total})
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || total === 0}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <div className="flex flex-wrap gap-1">
              {[['', 'All'], ['NEW', 'New'], ['VIEWED', 'Viewed'], ['ACCEPTED', 'Accepted'], ['REJECTED', 'Rejected'], ['EXPIRED', 'Expired'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']].map(([val, label]) => (
                <button
                  key={val || 'all'}
                  onClick={() => { setStatus(val); setPage(1); }}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${status === val ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">Loading leads...</p>
        ) : leads.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">No leads found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Lead', 'Customer', 'Category', 'Status', 'Provider', 'Distance', 'Transfers', 'Created', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-700">{lead.id.slice(0, 12)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{lead.customer?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.serviceCategory || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${STATUS_STYLES[lead.status] || 'bg-slate-100 border-slate-300 text-slate-600'}`}>{lead.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.provider?.user?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.distanceKm != null ? `${Number(lead.distanceKm).toFixed(1)} km` : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.transferCount}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(lead.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(lead)} className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-100">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">Page {page} of {pages}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {detail && <LeadDetailDrawer lead={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function LeadDetailDrawer({ lead, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-extrabold text-slate-900">Lead {lead.id.slice(0, 14)}</h4>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Info label="Status" value={lead.status} />
          <Info label="Category" value={lead.serviceCategory} />
          <Info label="Customer" value={lead.customer?.name} />
          <Info label="Customer Phone" value={lead.customer?.phone} />
          <Info label="Current Provider" value={lead.provider?.user?.name} />
          <Info label="Distance" value={lead.distanceKm != null ? `${Number(lead.distanceKm).toFixed(1)} km` : null} />
          <Info label="Expires" value={lead.expiryTime ? fmtDate(lead.expiryTime) : null} />
          <Info label="Created" value={fmtDate(lead.createdAt)} />
        </div>

        {lead.booking && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Booking</p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1 text-xs">
              <p><span className="font-bold text-slate-500">ID:</span> <span className="font-mono text-slate-700">{lead.booking.id}</span></p>
              <p><span className="font-bold text-slate-500">Status:</span> <span className="text-slate-800 font-semibold">{lead.booking.status}</span></p>
              <p><span className="font-bold text-slate-500">Amount:</span> <span className="text-emerald-700 font-bold">{fmtMoney(lead.booking.amount)}</span></p>
              <p><span className="font-bold text-slate-500">Address:</span> <span className="text-slate-700">{lead.booking.locationAddress}</span></p>
              <p><span className="font-bold text-slate-500">Notes:</span> <span className="text-slate-700">{lead.booking.instructions || '—'}</span></p>
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Assignment History</p>
          {lead.assignmentHistory?.length ? (
            <ol className="relative border-l border-slate-200 ml-2 space-y-3">
              {lead.assignmentHistory.map((a) => (
                <li key={a.id} className="ml-4 relative">
                  <span className="absolute -left-[9px] top-1 w-2 h-2 rounded-full bg-teal-500" />
                  <p className="text-xs font-bold text-slate-800">{a.provider?.user?.name} <span className={`text-[9px] uppercase font-black ml-1 ${STATUS_STYLES[a.status] ? STATUS_STYLES[a.status].split(' ')[0] + ' text-slate-700' : ''}`}>{a.status}</span></p>
                  <p className="text-[10px] text-slate-500 font-semibold">{fmtDate(a.assignedAt)}{a.reason ? ` · ${a.reason}` : ''}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-slate-400 text-xs italic">No assignment history.</p>
          )}
        </div>

        {lead.transferHistory?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Transfers</p>
            {lead.transferHistory.map((t) => (
              <div key={t.id} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-xs font-semibold text-indigo-800 mb-2">
                {t.fromProvider?.user?.name || '—'} → {t.toProvider?.user?.name || '—'} · {fmtDate(t.transferredAt)}
              </div>
            ))}
          </div>
        )}

        {lead.cancellationReasons?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Cancellations</p>
            {lead.cancellationReasons.map((c) => (
              <div key={c.id} className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs font-semibold text-rose-800 mb-2">
                {c.reason}{c.detail ? ` — ${c.detail}` : ''} · by {c.actor} · {fmtDate(c.createdAt)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-800">{value || '—'}</p>
    </div>
  );
}

/* -------------------------------- Performance -------------------------------- */

function PerformanceSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search.trim()) q.set('search', search.trim());
    const res = await apiClient.get(`/admin/providers/performance?${q.toString()}`);
    if (res.ok) {
      setRows(res.data?.performance || []);
      setTotal(res.data?.pagination?.total || 0);
      setPages(res.data?.pagination?.pages || 0);
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cooldownActive = (row) => Boolean(row.cooldownUntil && new Date(row.cooldownUntil) > new Date());

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllPages({
        fetchPage: async (page, limit) => {
          const q = new URLSearchParams({ page: String(page), limit: String(limit) });
          if (search.trim()) q.set('search', search.trim());
          const res = await apiClient.get(`/admin/providers/performance?${q.toString()}`);
          const rows = (res.data?.performance || []).map((row) => ({
            Provider: row.provider?.user?.name || '',
            Level: row.provider?.providerLevel || '',
            Sector: row.provider?.sector || '',
            'Total Leads': row.totalLeads ?? 0,
            'Acceptance Rate (%)': row.acceptanceRate != null ? Math.round(Number(row.acceptanceRate) * 100) : '',
            'Response Rate (%)': row.responseRate != null ? Math.round(Number(row.responseRate) * 100) : '',
            'Cancellation Rate (%)': row.cancellationRate != null ? Math.round(Number(row.cancellationRate) * 100) : '',
            'Completed Jobs': row.completedJobs ?? 0,
            'Total Earnings (₹)': row.totalEarnings ?? 0,
            Cooldown: cooldownActive(row) ? fmtDate(row.cooldownUntil) : ''
          }));
          return { rows, total: res.data?.pagination?.total || 0 };
        },
        fileName: 'provider-performance-report',
        sheetName: 'Performance'
      });
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-teal-600" /> Provider Performance ({total})
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || total === 0}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search provider name..."
                className="pl-9 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 w-56"
              />
            </div>
            <button onClick={() => setSearch('')} className="text-[10px] font-black text-slate-500 hover:text-slate-800">Clear</button>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">Loading performance...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-6 text-center">No performance records found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Provider', 'Level', 'Sector', 'Leads', 'Acceptance', 'Response', 'Cancellation', 'Jobs', 'Earnings', 'Cooldown'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.provider?.user?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase border bg-slate-900 text-white border-slate-900">{row.provider?.providerLevel}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.provider?.sector}</td>
                      <td className="px-4 py-3 text-slate-600">{row.totalLeads}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{pct(row.acceptanceRate)}</td>
                      <td className="px-4 py-3 font-bold text-sky-700">{pct(row.responseRate)}</td>
                      <td className="px-4 py-3 font-bold text-rose-700">{pct(row.cancellationRate)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.completedJobs}</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{fmtMoney(row.totalEarnings)}</td>
                      <td className="px-4 py-3">
                        {cooldownActive(row) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-sky-50 text-sky-700 border-sky-200">
                            Until {fmtDate(row.cooldownUntil)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">Page {page} of {pages}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Wallet ---------------------------------- */

const WITHDRAWAL_STATUS_STYLES = {
  PENDING: 'bg-amber-100 border-amber-300 text-amber-800',
  APPROVED: 'bg-sky-100 border-sky-300 text-sky-800',
  REJECTED: 'bg-rose-100 border-rose-300 text-rose-800',
  PAID: 'bg-emerald-100 border-emerald-300 text-emerald-800'
};

function WalletSection() {
  const [overview, setOverview] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState('PENDING');
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [withdrawalPages, setWithdrawalPages] = useState(0);
  const [withdrawalTotal, setWithdrawalTotal] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPages, setLedgerPages] = useState(0);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [exporting, setExporting] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('ok');
  const [userSearch, setUserSearch] = useState('');
  const [creditForm, setCreditForm] = useState({ userId: '', amount: '', category: 'PROMOTIONAL_CREDIT', description: '' });
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  const flash = (tone, text) => {
    setMessageTone(tone);
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadOverview = useCallback(async () => {
    const res = await apiClient.get('/admin/wallet');
    if (res.ok) setOverview(res.data);
  }, []);

  const loadWithdrawals = useCallback(async () => {
    const res = await apiClient.get(`/admin/wallet/withdrawals?status=${withdrawalStatus}&page=${withdrawalPage}&limit=25`);
    if (res.ok) {
      setWithdrawals(res.data?.withdrawals || []);
      setWithdrawalTotal(res.data?.pagination?.total || 0);
      setWithdrawalPages(res.data?.pagination?.pages || 0);
    }
  }, [withdrawalStatus, withdrawalPage]);

  const loadLedger = useCallback(async () => {
    const q = new URLSearchParams({ page: String(ledgerPage), limit: '25' });
    if (userSearch.trim()) q.set('userId', userSearch.trim());
    const res = await apiClient.get(`/admin/wallet/ledger?${q.toString()}`);
    if (res.ok) {
      setLedger(res.data?.transactions || []);
      setLedgerTotal(res.data?.pagination?.total || 0);
      setLedgerPages(res.data?.pagination?.pages || 0);
    }
  }, [ledgerPage, userSearch]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadOverview(), loadWithdrawals(), loadLedger()]);
      setLoading(false);
    })();
  }, [loadOverview, loadWithdrawals, loadLedger]);

  const process = async (id, action) => {
    setProcessingId(id);
    const res = await apiClient.patch(`/admin/wallet/withdrawals/${id}/process`, { action, adminNote: action === 'REJECTED' ? 'Rejected by admin' : null });
    setProcessingId(null);
    if (res.ok) {
      flash('ok', `Withdrawal ${action.toLowerCase()}.`);
      await Promise.all([loadOverview(), loadWithdrawals()]);
    } else {
      flash('err', res.data?.message || res.data?.error || 'Failed to process withdrawal.');
    }
  };

  const submitCredit = async (e) => {
    e.preventDefault();
    setCreditSubmitting(true);
    const res = await apiClient.post('/admin/wallet/credit', {
      userId: creditForm.userId.trim(),
      amount: Number(creditForm.amount),
      category: creditForm.category,
      description: creditForm.description.trim() || null
    });
    setCreditSubmitting(false);
    if (res.ok) {
      flash('ok', 'Wallet credited successfully.');
      setCreditForm({ userId: '', amount: '', category: 'PROMOTIONAL_CREDIT', description: '' });
      setUserSearch('');
      loadOverview();
      loadLedger();
    } else {
      flash('err', res.data?.message || res.data?.error || 'Failed to credit wallet.');
    }
  };

  const handleExport = async (kind) => {
    setExporting(kind);
    try {
      if (kind === 'ledger') {
        await exportAllPages({
          fetchPage: async (page, limit) => {
            const q = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (userSearch.trim()) q.set('userId', userSearch.trim());
            const res = await apiClient.get(`/admin/wallet/ledger?${q.toString()}`);
            const rows = (res.data?.transactions || []).map((t) => ({
              User: t.user?.name || '',
              Email: t.user?.email || '',
              Type: t.type || '',
              Category: t.category || '',
              Amount: t.type === 'CREDIT' ? Number(t.amount) : -Number(t.amount),
              'Balance After': t.balanceAfter ?? '',
              Reference: t.referenceType || ''
            }));
            return { rows, total: res.data?.pagination?.total || 0 };
          },
          fileName: 'wallet-ledger-report',
          sheetName: 'Ledger'
        });
      } else {
        await exportAllPages({
          fetchPage: async (page, limit) => {
            const res = await apiClient.get(`/admin/wallet/withdrawals?status=${withdrawalStatus}&page=${page}&limit=${limit}`);
            const rows = (res.data?.withdrawals || []).map((w) => ({
              Provider: w.provider?.user?.name || '',
              Amount: w.amount ?? 0,
              Status: w.status || '',
              Method: w.paymentMethod || '',
              'Requested At': fmtDate(w.requestedAt || w.createdAt),
              'Processed At': fmtDate(w.processedAt)
            }));
            return { rows, total: res.data?.pagination?.total || 0 };
          },
          fileName: 'withdrawals-report',
          sheetName: 'Withdrawals'
        });
      }
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExporting('');
    }
  };

  if (loading && !overview) {
    return <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs font-semibold">Loading wallet...</div>;
  }

  const summary = overview?.summary || {};

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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Wallets', value: summary.wallets ?? 0 },
          { label: 'Total Balance', value: fmtMoney(summary.totalBalance), tone: 'text-slate-900' },
          { label: 'Total Credited', value: fmtMoney(summary.totalCredited), tone: 'text-emerald-700' },
          { label: 'Total Withdrawn', value: fmtMoney(summary.totalWithdrawn), tone: 'text-rose-600' },
          { label: 'Pending Payouts', value: summary.pendingWithdrawals ?? 0, tone: 'text-amber-600' }
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">{s.label}</p>
            <p className={`text-xl font-black mt-1 break-all ${s.tone || 'text-slate-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Withdrawal requests */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-teal-600" /> Withdrawal Requests ({withdrawalTotal})
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleExport('withdrawals')}
                disabled={exporting === 'withdrawals' || withdrawalTotal === 0}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exporting === 'withdrawals' ? 'Exporting...' : 'Export Excel'}
              </button>
              <div className="flex gap-1">
                {[['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['PAID', 'Paid'], ['REJECTED', 'Rejected']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setWithdrawalStatus(val); setWithdrawalPage(1); }}
                    className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg transition-all ${withdrawalStatus === val ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {withdrawals.length === 0 ? (
            <p className="text-slate-400 text-xs italic p-8 text-center">No {withdrawalStatus.toLowerCase()} withdrawal requests.</p>
          ) : (
            <>
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {withdrawals.map((w) => (
                  <div key={w.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-900">{fmtMoney(w.amount)}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{w.provider?.user?.name} · {w.provider?.user?.email}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{fmtDate(w.createdAt)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${WITHDRAWAL_STATUS_STYLES[w.status]}`}>{w.status}</span>
                    </div>
                    {w.accountDetails && (w.accountDetails.upiId || w.accountDetails.accountNumber) && (
                      <p className="text-[10px] font-bold text-slate-500 mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                        Payout to: {w.accountDetails.upiId || `A/C ${w.accountDetails.accountNumber}${w.accountDetails.ifsc ? ` (${w.accountDetails.ifsc})` : ''}`}
                      </p>
                    )}
                    {w.status === 'PENDING' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => process(w.id, 'APPROVED')} disabled={processingId === w.id} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
                          <ThumbsUp className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => process(w.id, 'PAID')} disabled={processingId === w.id} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
                          <ShieldCheck className="w-3 h-3" /> Mark Paid
                        </button>
                        <button onClick={() => process(w.id, 'REJECTED')} disabled={processingId === w.id} className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
                          <ThumbsDown className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    )}
                    {w.status === 'APPROVED' && (
                      <button onClick={() => process(w.id, 'PAID')} disabled={processingId === w.id} className="mt-3 flex items-center gap-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
                        <ShieldCheck className="w-3 h-3" /> Confirm Payment → Mark Paid
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {withdrawalPages > 1 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">Page {withdrawalPage} of {withdrawalPages}</span>
                  <div className="flex gap-1">
                    <button disabled={withdrawalPage <= 1} onClick={() => setWithdrawalPage((p) => p - 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={withdrawalPage >= withdrawalPages} onClick={() => setWithdrawalPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Manual credit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-teal-600" /> Credit Wallet (Manual)
          </span>
          <form onSubmit={submitCredit} className="mt-4 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">User ID</label>
              <input
                type="text"
                required
                value={creditForm.userId}
                onChange={(e) => setCreditForm((f) => ({ ...f, userId: e.target.value }))}
                placeholder="Paste a user (customer/provider) ID"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Category</label>
                <select
                  value={creditForm.category}
                  onChange={(e) => setCreditForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
                >
                  <option value="PROMOTIONAL_CREDIT">Promotional</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="BOOKING_REFUND">Refund</option>
                  <option value="DISPUTE_REFUND">Dispute refund</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                value={creditForm.description}
                onChange={(e) => setCreditForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500"
              />
            </div>
            <button type="submit" disabled={creditSubmitting} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all">
              {creditSubmitting ? 'Crediting...' : 'Credit Wallet'}
            </button>
          </form>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <span className="text-sm font-extrabold text-slate-900">Wallet Ledger ({ledgerTotal})</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExport('ledger')}
              disabled={exporting === 'ledger' || ledgerTotal === 0}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {exporting === 'ledger' ? 'Exporting...' : 'Export Excel'}
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setLedgerPage(1); }}
                placeholder="Filter by user ID..."
                className="pl-9 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 w-56"
              />
            </div>
          </div>
        </div>
        {ledger.length === 0 ? (
          <p className="text-slate-400 text-xs italic p-8 text-center">No wallet transactions found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['User', 'Type', 'Category', 'Amount', 'Balance After', 'Reference', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{t.user?.name || '—'}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{t.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{t.type}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.category}</td>
                      <td className={`px-4 py-3 font-black ${t.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-600'}`}>{t.type === 'CREDIT' ? '+' : '−'}{fmtMoney(t.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtMoney(t.balanceAfter)}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{(t.referenceType || '—')}{t.referenceId ? `:${t.referenceId.slice(0, 8)}` : ''}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ledgerPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">Page {ledgerPage} of {ledgerPages}</span>
                <div className="flex gap-1">
                  <button disabled={ledgerPage <= 1} onClick={() => setLedgerPage((p) => p - 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={ledgerPage >= ledgerPages} onClick={() => setLedgerPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Analytics --------------------------------- */

function AnalyticsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cancel, promo] = await Promise.all([
        apiClient.get('/admin/analytics/cancellations'),
        apiClient.get('/admin/analytics/promotions')
      ]);
      setData({
        cancel: cancel.ok ? cancel.data : null,
        promo: promo.ok ? promo.data : null
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-xs font-semibold">Loading analytics...</div>;
  }

  return (
    <div className="space-y-4">
      <AnalyticsPanel title="Cancellations" subtitle="By actor">
          <div className="space-y-3">
            {(data?.cancel?.byActor || []).map((row) => (
              <div key={row.actor} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 capitalize">{row.actor}</span>
                <span className="font-black text-slate-900">{row._count?._all ?? 0}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Top reasons</p>
              <div className="space-y-1.5">
                {(data?.cancel?.byReason || []).slice(0, 6).map((r) => (
                  <p key={r.reason} className="flex justify-between text-xs"><span className="font-semibold text-slate-600 truncate">{r.reason}</span><span className="font-bold text-slate-900 ml-3">{r._count?._all ?? 0}</span></p>
                ))}
              </div>
            </div>
          </div>
        </AnalyticsPanel>

      <AnalyticsPanel title="Promotions" subtitle="Level-ups granted">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(data?.promo?.byLevel || []).map((row) => (
              <span key={row.toLevel} className="px-3 py-1.5 rounded-xl border bg-slate-900 text-white text-[10px] font-black uppercase">
                {row.toLevel} × {row._count?._all ?? 0}
              </span>
            ))}
          </div>
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Recent promotions</p>
            <div className="space-y-2">
              {(data?.promo?.recent || []).slice(0, 8).map((p) => (
                <p key={p.id} className="text-xs font-semibold text-slate-600">
                  {p.provider?.user?.name} → <span className="font-black text-slate-900">{p.fromLevel} → {p.toLevel}</span> <span className="text-slate-400">· {fmtDate(p.promotedAt)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </AnalyticsPanel>
    </div>
  );
}

function AnalyticsPanel({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-teal-600" />
        <div>
          <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
          <p className="text-[10px] text-slate-400 font-semibold">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
