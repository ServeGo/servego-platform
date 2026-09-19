import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  PackagePlus,
  Pencil,
  Users,
} from 'lucide-react';
import ServiceFormModal from './ServiceFormModal';

const SERVICES_PER_PAGE = 9;

const STATUS = {
  live: { label: 'Live in catalog', dot: 'bg-emerald-500', text: 'text-emerald-700', chip: 'bg-emerald-50' },
  hidden: { label: 'Hidden from catalog', dot: 'bg-rose-500', text: 'text-rose-600', chip: 'bg-rose-50' },
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-slate-100" />
          <div className="h-2.5 w-1/3 rounded bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-full rounded bg-slate-100" />
        <div className="h-2.5 w-4/5 rounded bg-slate-100" />
      </div>
      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <div className="h-7 w-24 rounded-lg bg-slate-100" />
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
  serviceEditError,
  submitNewService,
  submitEditService,
  openAddService,
  closeAddService,
  openEditService,
  closeEditService,
  setNewServiceForm,
  setEditServiceForm,
  services,
  servicesLoading,
  hideService,
  partnerCountForService,
}) {
  const canManage = isAdmin;

  const [page, setPage] = useState(1);
  // Inner filter: Active / Hidden. Hidden services live in the admin list
  // (GET /admin/services); a hide/unhide issued in this session is ALSO tracked
  // locally so the row always lands in the Hidden tab instantly, even if the
  // admin list endpoint is momentarily unreachable.
  const [filter, setFilter] = useState('active');
  const [localHidden, setLocalHidden] = useState({});
  // In-flight guard for hide/unhide so the button shows a spinner instead of
  // silently appearing frozen while the server confirms (rule 16).
  const [busy, setBusy] = useState(null);

  const allServices = Array.isArray(services) ? services : [];
  const isCatHidden = (cat) => (localHidden[cat.id] !== undefined ? localHidden[cat.id] : cat.isHidden === true);
  const activeCount = allServices.filter((cat) => !isCatHidden(cat)).length;
  const hiddenCount = allServices.filter((cat) => isCatHidden(cat)).length;

  const loading = Boolean(servicesLoading) && allServices.length === 0;

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
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Service Catalog</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Mange service categories, visibility, and provider partnerships.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openAddService}
            className="shrink-0 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs"
          >
            <PackagePlus className="w-4 h-4" />
            Add Service
          </button>
        )}
      </div>

      {/* Filter segmented control */}
      {canManage && (
        <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {filterTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setFilter(t.key); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                filter === t.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              <span
                className={`min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-[9px] font-black ${
                  filter === t.key ? 'bg-slate-100 text-slate-500' : 'bg-white/80 text-slate-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      {canManage && isAddingService && (
        <ServiceFormModal
          mode="add"
          title="Add new service category"
          subtitle="Providers will show under the matching service name (case-insensitive)."
          form={newServiceForm}
          error={serviceAddError}
          isSubmitting={isSubmittingService}
          imageRequired
          onChange={(patch) => setNewServiceForm((prev) => ({ ...prev, ...patch }))}
          onClose={closeAddService}
          onSubmit={submitNewService}
        />
      )}

      {canManage && isEditingService && (
        <ServiceFormModal
          mode="edit"
          title="Update service category"
          subtitle="Make changes to the listing details."
          form={editServiceForm}
          error={serviceEditError}
          isSubmitting={isSubmittingService}
          onChange={(patch) => setEditServiceForm((prev) => ({ ...prev, ...patch }))}
          onClose={closeEditService}
          onSubmit={submitEditService}
        />
      )}

      {/* Skeleton while loading (rule 15: never show a blank screen) */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state with CTA */}
      {!loading && filteredServices.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <p className="text-slate-900 text-sm font-extrabold">
              {allServices.length === 0 ? 'No services yet' : 'Nothing here'}
            </p>
            <p className="text-slate-500 text-xs font-medium mt-1 max-w-sm">
              {allServices.length === 0
                ? 'Add your first service category to start building the catalog.'
                : filter === 'hidden'
                  ? 'No hidden services. Hiding a category keeps it out of the customer catalog until you unhide it.'
                  : 'No visible services — everything is currently hidden from the catalog.'}
            </p>
          </div>
          {canManage && allServices.length === 0 && (
            <button
              onClick={openAddService}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs"
            >
              <PackagePlus className="w-4 h-4" />
              Add your first service
            </button>
          )}
        </div>
      )}

      {/* Service grid */}
      {!loading && filteredServices.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {pageServices.map((cat) => {
              const partnerCount = partnerCountForService(cat.name);
              const isHidden = isCatHidden(cat);
              const st = isHidden ? STATUS.hidden : STATUS.live;
              return (
                <article
                  key={cat.id}
                  className="group bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  <div className="p-4 sm:p-5 flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 font-extrabold text-base shrink-0">
                          {(cat.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">{cat.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {cat.serviceNumber && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded border border-slate-200 tracking-wide">
                              {cat.serviceNumber}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {partnerCount} partner{partnerCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      <span className={`shrink-0 inline-flex items-center gap-1.5 ${st.chip} ${st.text} px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {isHidden ? 'Hidden' : 'Live'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                      {cat.description || 'No description yet.'}
                    </p>
                  </div>

                  {canManage && (
                    <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Edit service"
                        onClick={() => openEditService(cat)}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 hover:text-indigo-700 font-extrabold px-2.5 py-1.5 text-[10px] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>

                      <button
                        type="button"
                        title={isHidden ? 'Show in catalog' : 'Hide from catalog'}
                        onClick={() => handleHideToggle(cat)}
                        disabled={busy !== null}
                        className={`inline-flex items-center gap-1.5 bg-white border font-extrabold px-2.5 py-1.5 text-[10px] rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                          isHidden
                            ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            : 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                      >
                        {busy?.action === 'hide' && busy?.id === cat.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isHidden ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {busy?.action === 'hide' && busy?.id === cat.id ? (isHidden ? 'Unhiding…' : 'Hiding…') : isHidden ? 'Unhide' : 'Hide'}
                      </button>
                    </div>
                  )}
                </article>
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