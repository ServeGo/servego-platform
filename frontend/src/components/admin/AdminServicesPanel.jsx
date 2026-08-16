import React from 'react';

export default function AdminServicesPanel({
  isAdmin,
  isAddingService,
  isEditingService,
  newServiceForm,
  editServiceForm,
  serviceAddError,
  serviceAddSuccess,
  serviceEditError,
  serviceEditSuccess,
  submitNewService,
  openAddService,
  closeAddService,
  openEditService,
  closeEditService,
  setNewServiceForm,
  setEditServiceForm,
  services,
  providers,
  hideService,
  deleteService,
  updateService,
  editServiceId,
  partnerCountForService,
}) {
  const canManage = isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Active Services & Hourly Rates</h2>
          <p className="text-slate-500 text-xs">Configure base cost index listings and regional specialist capacities.</p>
        </div>

        {canManage && (
          <button
            onClick={openAddService}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs"
          >
            <span>+ Add Service</span>
          </button>
        )}
      </div>

      {canManage && isAddingService && (
        <form onSubmit={submitNewService} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Add new service category</h3>
            <p className="text-slate-500 text-xs mt-1">Providers will show under the matching service name (case-insensitive).</p>
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
                placeholder="Short description for the service category"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAddService}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-200"
            >
              Cancel
            </button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Save Service
            </button>
          </div>
        </form>
      )}

      {canManage && isEditingService && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const { name, description, popularIssuesText } = editServiceForm;
            if (!name.trim()) return;
            const popularIssues = popularIssuesText.split(',').map(x => x.trim()).filter(Boolean);
            const resp = await updateService(editServiceId, { name: name.trim(), description: description.trim(), popularIssues });
            if (resp?.error) { setEditServiceForm(prev => ({ ...prev, _error: resp.error })); return; }
            closeEditService();
          }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5"
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Update service category</h3>
            <p className="text-slate-500 text-xs mt-1">Make changes to the listing details.</p>
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600 transition-all"
                placeholder="Short description for the service category"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEditService}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-200"
            >
              Cancel
            </button>

            {/* submit is intentionally handled by AdminPanel inline for now */}
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Update Service
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Array.isArray(services) ? services : []).map((cat) => {
          const partnerCount = partnerCountForService(cat.name);
          return (
            <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-4">
              <div className="space-y-2 font-semibold">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-extrabold text-base">
                  {(cat.name || '?').charAt(0)}
                </div>
                <h4 className="text-slate-900 font-extrabold text-sm">{cat.name}</h4>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">{cat.description}</p>
              </div>

              {canManage && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditService(cat)}
                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-extrabold px-2.5 py-1 text-[10px] rounded-lg transition-colors"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const ok = window.confirm(`Delete service "${cat.name}"?`);
                      if (!ok) return;
                      const resp = await deleteService(cat.id, { role: 'admin' });
                      if (resp?.error) alert(resp.error);
                    }}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-extrabold px-2.5 py-1 text-[10px] rounded-lg transition-colors"
                  >
                    Delete
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const currentlyHidden = cat.isHidden === true;
                      const nextHidden = !currentlyHidden;
                      const actionLabel = nextHidden ? 'Hide' : 'Unhide';

                      const ok = window.confirm(`${actionLabel} service "${cat.name}"?`);
                      if (!ok) return;

                      const resp = await hideService(cat.id, nextHidden);
                      if (resp?.error) {
                        alert(resp.error);
                        return;
                      }
                      alert(`${actionLabel} successful.`);
                    }}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold px-2.5 py-1 text-[10px] rounded-lg transition-colors"
                  >
                    {cat.isHidden ? 'Unhide' : 'Hide'}
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-bold">Listed Experts</span>
                  <span className="block text-slate-950 font-black mt-1 text-xs">{partnerCount} live partners</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

