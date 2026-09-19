import React, { useState } from 'react';
import { Camera, ImagePlus, Layers, Loader2, Package, X } from 'lucide-react';
import { api } from '../../utils/apiClient';

const fieldClass =
  'w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all';

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{children}</p>
);

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

/**
 * Reusable create/edit service modal. The whole body sits inside a locked
 * <fieldset> while submitting so no field can be edited mid-request.
 */
export default function ServiceFormModal({
  mode,
  title,
  subtitle,
  form,
  error,
  isSubmitting,
  imageRequired = false,
  onChange,
  onClose,
  onSubmit,
}) {
  const isAdd = mode === 'add';
  const ActionIcon = isAdd ? Layers : Package;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4 animate-overlay-in">
      <form
        onSubmit={onSubmit}
        aria-busy={isSubmitting}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in"
      >
        {isSubmitting && (
          <div className="absolute inset-x-0 top-0 h-1 bg-indigo-200" role="status" aria-label="Saving">
            <div className="h-full bg-indigo-600 animate-pulse" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isAdd ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'}`}>
              <ActionIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">{title}</h3>
              {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <fieldset disabled={isSubmitting} className={`border-0 m-0 p-0 min-w-0 ${isSubmitting ? 'opacity-60' : ''}`}>
          {/* Body */}
          <div className="px-6 sm:px-8 py-6 space-y-7 max-h-[calc(100vh-16rem)] overflow-y-auto hide-scrollbar">
            {error && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <SectionLabel>Basic details</SectionLabel>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Service Name <span className="text-rose-600">*</span></label>
                  <input
                    value={form.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    className={fieldClass}
                    placeholder="e.g. Electrician"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description <span className="text-rose-600">*</span></label>
                  <textarea
                    value={form.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    rows={3}
                    className={fieldClass}
                    placeholder="Describe what this service covers"
                    required
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-4">
              <SectionLabel>Photo</SectionLabel>
              <ServiceImageField
                label="Service Photo"
                required={imageRequired}
                imageUrl={form.imageUrl}
                onChange={(url) => onChange({ imageUrl: url })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-white hover:bg-slate-100 text-slate-600 px-4 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-200 disabled:opacity-40 disabled:pointer-events-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 text-white px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-60 disabled:pointer-events-none ${isAdd ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </>
              ) : isAdd ? (
                'Create Service'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}