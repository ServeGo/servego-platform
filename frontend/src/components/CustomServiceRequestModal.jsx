import React, { useState } from 'react';
import { AlertCircle, CircuitBoard, ShieldCheck } from 'lucide-react';
import { api } from '../utils/apiClient';

export default function CustomServiceRequestModal({ onClose, onSuccess }) {
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!serviceName.trim()) {
      setError('Please tell us the name of the service you need.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the service you need.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/permanent-service-requests', {
        requestType: 'CUSTOM',
        serviceCategory: serviceName.trim(),
        customServiceName: serviceName.trim(),
        customDescription: description.trim(),
        additionalInfo: additionalInfo.trim() || null
      });
      if (res.ok) {
        onSuccess(res.data);
      } else {
        setError(res.data?.message || res.data?.error || 'Could not submit your request. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-xl w-full relative shadow-2xl animate-fade-in mt-6 mb-6 text-left max-h-[calc(100vh-4rem)] overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Custom Service Request</h3>
            <p className="text-slate-500 text-xs font-medium">Tell us a service we don't offer yet</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Exit
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Service Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Solar Panel Cleaning"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              placeholder="Describe the service you need — what it involves, how often, your expectations, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Additional Information (Optional)</label>
            <textarea
              placeholder="Anything else our team should know?"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none"
            />
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-[11px] text-teal-800 font-medium leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Our team reviews your request, adds the service, and arranges a suitable specialist for you. You'll be updated here and through notifications.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg text-center text-sm transition-all shadow-md focus:outline-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-t-2 border-white animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CircuitBoard className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}