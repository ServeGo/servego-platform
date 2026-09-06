import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { api } from '../utils/apiClient';

/**
 * Optional profile photo uploader used in the customer and provider profile
 * editors. Uploads go straight to Cloudinary (folder-scoped per role) and the
 * parent saves the resulting URL together with the rest of the profile.
 *
 * Controlled component: `src` is the currently committed/displayed photo; the
 * parent decides whether a freshly uploaded URL is persisted (cancel = revert).
 */
export default function ProfilePhotoPicker({ src, folder, onChange, size = 'w-24 h-24' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError('Please choose an image file (JPG, PNG, WebP).');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('folder', folder);
      const res = await api.postFormData('/images/upload', fd);
      if (res.ok && res.data?.url) {
        onChange(res.data.url);
      } else {
        setError(
          (res.data && (res.data.message || res.data.error)) ||
            'Could not upload your photo — you can keep the current one.'
        );
      }
    } catch {
      setError('Could not upload your photo. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload a new profile photo (optional)"
        className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 group transition-opacity disabled:opacity-70 ${size}`}
      >
        {src ? (
          <img src={src} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-7 h-7 text-slate-400 group-hover:text-slate-600" />
        )}
        <span className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-6 h-6 text-white" />
        </span>
        {uploading && (
          <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
          </span>
        )}
      </button>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800">Profile photo</p>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
          Optional. Tap the photo to upload a new one.
        </p>
        {error && <p className="text-[10px] text-rose-600 font-bold mt-1">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}