import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Save, Loader2 } from 'lucide-react';
import { api } from '../utils/apiClient';

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        `shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-black rounded-xl border transition-colors ` +
        (active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800')
      }
    >
      {label}
    </button>
  );
}

export default function ProviderServicesPanel({ provider, initialServices = [], allServices: globalServices = [], onRefresh }) {
  const [myServices, setMyServices] = useState(initialServices);
  const [servicesError, setServicesError] = useState('');
  const [loadingMyServices, setLoadingMyServices] = useState(false);

  const [servicesFilter, setServicesFilter] = useState('APPROVED'); // APPROVED | PENDING | DENIED

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [serviceInterestedOption, setServiceInterestedOption] = useState('');
  const [experienceYears, setExperienceYears] = useState('');

  // Mandatory fields
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);



  const providerId = provider?.id;

  // The Services tab only mounts on click, so fetch on mount — the dashboard's
  // background prefetch may still be warming when the tab opens, and the panel
  // is the authoritative source once mounted (it also refreshes the header).
  useEffect(() => {
    if (providerId) fetchProviderServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const filteredServices = useMemo(() => {
    if (!Array.isArray(myServices)) return [];

    let arr = myServices;

    if (servicesFilter === 'APPROVED') arr = arr.filter(sv => sv.approvalStatus === 'APPROVED');
    if (servicesFilter === 'PENDING') arr = arr.filter(sv => sv.approvalStatus === 'PENDING');
    if (servicesFilter === 'DENIED') arr = arr.filter(sv => sv.approvalStatus === 'DENIED');

    return arr;
  }, [myServices, servicesFilter]);

  const fetchProviderServices = async () => {
    if (!providerId) return;
    try {
      setLoadingMyServices(true);
      const res = await api.get(`/providers/${providerId}/services`);
      const data = res.data;

      if (!res.ok) {
        setServicesError(data?.message || `Failed to load your services. (${res.status})`);
        setMyServices([]);
        return;
      }

      setMyServices(Array.isArray(data) ? data : []);
      if (onRefresh) onRefresh();
    } catch (e) {
      setServicesError('Failed to load your services.');
      setMyServices([]);
    } finally {
      setLoadingMyServices(false);
    }
  };

  const openRegister = () => {
    setServicesError('');
    setServiceInterestedOption('');
    setExperienceYears('');
    setDescription('');
    setIsRegisterOpen(true);
  };

  const closeRegister = () => {
    setIsRegisterOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerId) return;

    console.log('[ProviderServicesPanel] providerId', providerId);


    const selectedName = serviceInterestedOption;

    if (!selectedName?.trim()) {
      setServicesError('Please select a service.');
      return;
    }

    const expNum = Number(experienceYears);
    if (
      experienceYears === '' ||
      experienceYears === null ||
      experienceYears === undefined ||
      !Number.isFinite(expNum) ||
      expNum < 0
    ) {
      setServicesError('Please enter your experience in years.');
      return;
    }

    if (!description || !description.trim()) {
      setServicesError('Please enter service description.');
      return;
    }


    setSubmitting(true);
    setServicesError('');

    try {
      const res = await api.post(`/providers/${providerId}/services/register`, {
          serviceName: selectedName.trim(),
          description: description.trim(),
          popularIssues: [],
          experienceYears: Number(experienceYears ?? 0)
      });
      const data = res.data;
      if (!res.ok) {
        setServicesError(data?.message || 'Failed to register service.');
        setSubmitting(false);
        return;
      }


      setIsRegisterOpen(false);
      await fetchProviderServices();
    } catch (err) {
      setServicesError('Failed to register service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">My Services</h3>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              Your registered service specialties appear here.
            </p>
          </div>
          <button
            type="button"
            onClick={openRegister}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 sm:px-4 py-2 rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Register</span>
            <span className="hidden sm:inline">&nbsp;For a service</span>
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-nowrap -mx-1 px-1">
            <FilterButton label="Approved services" active={servicesFilter === 'APPROVED'} onClick={() => setServicesFilter('APPROVED')} />
            <FilterButton label="Denied services" active={servicesFilter === 'DENIED'} onClick={() => setServicesFilter('DENIED')} />
            <FilterButton label="Pending services" active={servicesFilter === 'PENDING'} onClick={() => setServicesFilter('PENDING')} />
          </div>

          {loadingMyServices && (
            <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading...
            </div>
          )}

        </div>


        {servicesError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold">
            {servicesError}
          </div>
        )}

        {filteredServices.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-slate-500 text-xs font-semibold">
              {`No ${servicesFilter === 'APPROVED' ? 'approved' : servicesFilter === 'PENDING' ? 'pending' : 'denied'} services yet.`}
            </div>
            <div className="text-slate-400 text-[11px] mt-2 font-medium">Click Register to add your service.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((sv) => (
              <div key={sv.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service</div>
                    <div className="text-sm font-black text-slate-900 mt-1">{sv.name}</div>
                    <div className="text-[11px] text-slate-600 mt-1 font-semibold">
                      Experience: {provider?.experienceYears ?? experienceYears} years
                    </div>


                  </div>
                  <div
                    className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                      sv.approvalStatus === 'APPROVED'
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        : sv.approvalStatus === 'PENDING'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {sv.approvalStatus === 'APPROVED'
                      ? 'Approved'
                      : sv.approvalStatus === 'PENDING'
                        ? 'Pending Approval'
                        : 'Denied'}
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 mt-3">
                  <div className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Description</div>
                  <p className="mt-1 break-words">{sv.description ?? '-'}</p>
                  {sv.createdAt && (
                    <div className="text-[10px] text-slate-400 font-semibold mt-2">
Requested: {new Date(sv.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isRegisterOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Register a Service</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium">Add a new service specialty to your provider profile.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {servicesError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold">
                  {servicesError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Service interested *</label>
                <select
                  value={serviceInterestedOption}
                  onChange={(e) => setServiceInterestedOption(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="">Select service</option>
                  {globalServices
                    .filter((s) => !s.isHidden)
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Experience (years) *</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  inputMode="numeric"
                  placeholder="e.g. 5"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Enter the number of years you've worked in this field.</p>
              </div>



              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Service Description *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none"
                  placeholder="Write description about your service"
                />
              </div>


              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRegister}
                  className="bg-white hover:bg-slate-50 text-slate-800 font-black px-4 py-2 rounded-xl text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-black px-4 py-2 rounded-xl text-xs shadow-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Registering...' : 'Register Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

