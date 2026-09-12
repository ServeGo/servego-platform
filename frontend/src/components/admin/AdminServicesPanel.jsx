import React, { useState } from 'react';
import { Camera, Loader2, ImagePlus, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../utils/apiClient';

const SERVICES_PER_PAGE = 9;

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all';

/**
 * Service photo uploader. Uploads go to Cloudinary under servego/services and
 * hand the returned URL back through onChange. A photo is required to create a
 * service; on edit it can be kept or replaced.
 */
function ServiceImageField({ label, imageUrl, required = false, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setUploadError('Please choose an image file (JPG, PNG, WebP).');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('folder', 'servego/services');
      const res = await api.postFormData('/images/upload', fd);
      if (res.ok && res.data?.url) {
        onChange(res.data.url);
      } else {
        setUploadError((res.data && (res.data.message || res.data.error)) || 'Upload failed. Try again.');
      }
    } catch {
      setUploadError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rose-600">*</span>}
        {!required && imageUrl && <span className="text-slate-400 normal-case font-semibold ml-1">(keep current if left unchanged)</span>}
      </label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="Service" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading...' : imageUrl ? 'Replace photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          {required && !imageUrl && (
            <p className="text-[10px] font-semibold text-slate-400 mt-1.5">Required — every service needs a photo for the catalog.</p>
          )}
          {uploadError && <p className="text-[10px] font-bold text-rose-600 mt-1.5">{uploadError}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminServicesPanel({
  isAdmin,
  isAddingService,
  isEditingService,
  isSubmittingService,
  newServiceForm,
  editServiceForm,
  serviceAddError,
  serviceAddSuccess,
  serviceEditError,
  serviceEditSuccess,
  submitNewService,
  submitEditService,
  openAddService,
  closeAddService,
  openEditService,
  closeEditService,
  setNewServiceForm,
  setEditServiceForm,
  services,
  hideService,
  partnerCountForService,
}) {
  const canManage = isAdmin;

  const [page, setPage] = useState(1);
  // Inner filter tabs: Active / Hidden. Hidden services live in the admin list
  // (GET /admin/services); a hide/unhide issued in this session is ALSO tracked
  // locally so the row always lands in the Hidden tab instantly, even if the
  // admin list endpoint is momentarily unreachable.
  const [filter, setFilter] = useState('active');
  const [localHidden, setLocalHidden] = useState({});
  // In-flight guard for hide/unhide so the button shows a spinner instead of
  // silently appearing frozen while the server confirms (rule 16).
  const [busy, setBusy] = useState(null);

  const allServices = Array.isArray(services) ? services : [];
  // A service is hidden if the server (or this session's toggle) says so.
  const isCatHidden = (cat) => (localHidden[cat.id] !== undefined ? localHidden[cat.id] : cat.isHidden === true);
  const activeCount = allServices.filter((cat) => !isCatHidden(cat)).length;
  const hiddenCount = allServices.filter((cat) => isCatHidden(cat)).length;

  const filteredServices = allServices.filter((cat) => {
    if (filter === 'active') return !isCatHidden(cat);
    if (filter === 'hidden') return isCatHidden(cat);
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / SERVICES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * SERVICES_PER_PAGE;
  const pageServices = filteredServices.slice(startIndex, startIndex + SERVICES_PER_PAGE);
  const endIndex = Math.min(startIndex + SERVICES_PER_PAGE, filteredServices.length);

  const filterTabs = [
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'hidden', label: 'Hidden', count: hiddenCount },
  ];

  const pageItems = () => {
    const items = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) items.push(i);
      return items;
    }
    items.push(1);
    if (safePage > 3) items.push('…');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i += 1) items.push(i);
    if (safePage < totalPages - 2) items.push('…');
    items.push(totalPages);
    return items;
  };

  const handleHideToggle = async (cat) => {
    const currentlyHidden = isCatHidden(cat);
    const nextHidden = !currentlyHidden;
    const actionLabel = nextHidden ? 'Hide' : 'Unhide';

    const ok = window.confirm(`${actionLabel} service "${cat.name}"? ${nextHidden ? 'Hidden services stay out of the customer catalog.' : 'It becomes visible to customers again.'}`);
    if (!ok) return;

    setBusy({ action: 'hide', id: cat.id });
    try {
      const resp = await hideService(cat.id, nextHidden);
      if (resp?.code || resp?.error) {
        alert(resp?.message || resp?.error || `Failed to ${actionLabel.toLowerCase()} service.`);
        return;
      }
      // Reflect in this session immediately so the Hidden tab updates even
      // before the admin list refetch lands.
      setLocalHidden(prev => ({ ...prev, [cat.id]: nextHidden }));
      alert(`${actionLabel} successful.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Active Services & Hourly Rates</h2>
          <p className="text-slate-500 text-xs">Configure base cost index listings and regional specialist capacities.</p>
        </div>

        {canManage && (
          <button
            onClick={openAddService}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs"
          >
            <span>+ Add Service</span>
          </button>
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setFilter(t.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-colors ${
                filter === t.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      )}

      {canManage && isAddingService && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-overlay-in">
          <form onSubmit={submitNewService} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full relative shadow-2xl animate-fade-in space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Add new service category</h3>
                <p className="text-slate-500 text-xs mt-1">Providers will show under the matching service name (case-insensitive).</p>
              </div>
              <button
                type="button"
                onClick={closeAddService}
                disabled={isSubmittingService}
                className="cursor-pointer shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Exit
              </button>
            </div>

            {serviceAddError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold">{serviceAddError}</div>
            )}
            {serviceAddSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold">{serviceAddSuccess}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Service Name</label>
                <input
                  value={newServiceForm.name}
                  onChange={(e) => setNewServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
                  placeholder="e.g. Electrician"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Popular Issues</label>
                <input
                  value={newServiceForm.popularIssuesText}
                  onChange={(e) => setNewServiceForm((prev) => ({ ...prev, popularIssuesText: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
                  placeholder="Comma-separated, e.g. Short circuit fixing, Fan installation"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={newServiceForm.description}
                  onChange={(e) => setNewServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={inputClass}
                  placeholder="Short description for the service category"
                />
              </div>

              <div className="md:col-span-2">
                <ServiceImageField
                  label="Service Photo"
                  required
                  imageUrl={newServiceForm.imageUrl}
                  onChange={(url) => setNewServiceForm((prev) => ({ ...prev, imageUrl: url }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAddService}
                disabled={isSubmittingService}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-200 disabled:opacity-40 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingService}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmittingService ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…
                  </>
                ) : (
                  'Save Service'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {canManage && isEditingService && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-overlay-in">
          <form
            onSubmit={submitEditService}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full relative shadow-2xl animate-fade-in space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Update service category</h3>
                <p className="text-slate-500 text-xs mt-1">Make changes to the listing details.</p>
              </div>
              <button
                type="button"
                onClick={closeEditService}
                disabled={isSubmittingService}
                className="cursor-pointer shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Exit
              </button>
            </div>

            {serviceEditError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold">{serviceEditError}</div>
            )}
            {serviceEditSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold">{serviceEditSuccess}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Service Name</label>
                <input
                  value={editServiceForm.name}
                  onChange={(e) => setEditServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
                  placeholder="e.g. Electrician"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Popular Issues</label>
                <input
                  value={editServiceForm.popularIssuesText}
                  onChange={(e) => setEditServiceForm((prev) => ({ ...prev, popularIssuesText: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
                  placeholder="Comma-separated, e.g. Short circuit fixing, Fan installation"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={editServiceForm.description}
                  onChange={(e) => setEditServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={inputClass}
                  placeholder="Short description for the service category"
                />
              </div>

              <div className="md:col-span-2">
                <ServiceImageField
                  label="Service Photo"
                  imageUrl={editServiceForm.imageUrl}
                  onChange={(url) => setEditServiceForm((prev) => ({ ...prev, imageUrl: url }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditService}
                disabled={isSubmittingService}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-200 disabled:opacity-40 disabled:pointer-events-none"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingService}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmittingService ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…
                  </>
                ) : (
                  'Update Service'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredServices.length === 0 ? (
        <p className="text-slate-400 italic text-center py-12 text-xs font-semibold border border-dashed border-slate-200 rounded-2xl bg-white">
          {allServices.length === 0
            ? 'No services yet — add your first service category.'
            : filter === 'hidden'
              ? 'No hidden services. Hiding a category keeps it out of the customer catalog until you unhide it.'
              : 'No visible services — everything is currently hidden from the catalog.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {pageServices.map((cat) => {
          const partnerCount = partnerCountForService(cat.name);
          const isHidden = isCatHidden(cat);
          return (
            <div key={cat.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-4">
              <div className="space-y-3 font-semibold">
                <div className="flex items-center gap-3">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-100 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-extrabold text-base shrink-0">
                      {(cat.name || '?').charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-slate-900 font-extrabold text-sm truncate">{cat.name}</h4>
                      {cat.serviceNumber && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded border border-slate-200 tracking-wide shrink-0">
                          {cat.serviceNumber}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mt-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {partnerCount} live partner{partnerCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-3">{cat.description}</p>
              </div>

              {canManage && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-[9px] font-extrabold uppercase tracking-wide ${isHidden ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {isHidden ? 'Hidden from catalog' : 'Visible in catalog'}
                  </span>
                  <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditService(cat)}
                    disabled={busy !== null}
                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-extrabold px-2.5 py-1 text-[10px] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHideToggle(cat)}
                    disabled={busy !== null}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold px-2.5 py-1 text-[10px] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1.5"
                  >
                    {busy?.action === 'hide' && busy?.id === cat.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> {isHidden ? 'Unhiding…' : 'Hiding…'}
                      </>
                    ) : isHidden ? 'Unhide' : 'Hide'}
                  </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Showing {startIndex + 1}–{endIndex} of {filteredServices.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                {pageItems().map((it, i) =>
                  it === '…' ? (
                    <span key={`e-${i}`} className="px-1 text-slate-400 text-xs font-bold">…</span>
                  ) : (
                    <button
                      key={`p-${it}`}
                      type="button"
                      onClick={() => setPage(it)}
                      className={`min-w-8 px-2 py-1.5 rounded-lg text-[11px] font-extrabold transition-colors ${
                        it === safePage
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700'
                      }`}
                    >
                      {it}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

