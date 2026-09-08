import React, { useState } from 'react';
import { AlertCircle, Briefcase, ShieldCheck } from 'lucide-react';
import { api } from '../utils/apiClient';
import LocationPicker from './LocationPicker';

export default function PermanentServiceRequestModal({ serviceName, onClose, onSuccess }) {
  const [serviceNameInput, setServiceNameInput] = useState(serviceName || '');
  const [startDate, setStartDate] = useState('');
  const [engagementType, setEngagementType] = useState('PERMANENT');
  const [contractYears, setContractYears] = useState('');
  const [contractDays, setContractDays] = useState('');
  const [budget, setBudget] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!serviceNameInput.trim()) {
      setError('Please tell us which service you need.');
      return;
    }
    const serviceCategory = serviceNameInput.trim();
    if (!latitude || !longitude || !address.trim()) {
      setError('Please select your service location on the map.');
      return;
    }
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }
    if (engagementType === 'CONTRACT' && !contractYears && !contractDays) {
      setError('For a contract, please provide a duration in years or days.');
      return;
    }
    const budgetValue = Number(budget);
    if (!budget || Number.isNaN(budgetValue) || budgetValue <= 0) {
      setError('Please enter a valid monthly budget.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/permanent-service-requests', {
        serviceCategory,
        engagementType,
        startDate,
        contractDurationYears: contractYears ? Number(contractYears) : null,
        contractDurationDays: contractDays ? Number(contractDays) : null,
        monthlyBudget: budgetValue,
        additionalInfo: additionalInfo.trim() || null,
        locationAddress: address.trim(),
        serviceLatitude: latitude,
        serviceLongitude: longitude
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
            <h3 className="text-xl font-bold text-slate-900">Permanent / Contract Request</h3>
            <p className="text-slate-500 text-xs font-medium">{serviceName}</p>
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
            {serviceName ? (
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800">
                {serviceName}
              </div>
            ) : (
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. Cooking, Housekeeping, Driver"
                value={serviceNameInput}
                onChange={(e) => setServiceNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                required
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Monthly Budget (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 15000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Service Location <span className="text-rose-500">*</span>
            </label>
            <LocationPicker
              value={{ latitude, longitude, address }}
              onChange={({ latitude: lat, longitude: lng, address: addr }) => {
                setLatitude(lat);
                setLongitude(lng);
                setAddress(addr);
              }}
              error={error && !latitude}
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Engagement Type <span className="text-rose-500">*</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEngagementType('PERMANENT')}
                className={`cursor-pointer py-2 px-4 text-xs font-bold rounded-full border transition-all ${
                  engagementType === 'PERMANENT'
                    ? 'bg-teal-600 border-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Permanent
              </button>
              <button
                type="button"
                onClick={() => setEngagementType('CONTRACT')}
                className={`cursor-pointer py-2 px-4 text-xs font-bold rounded-full border transition-all ${
                  engagementType === 'CONTRACT'
                    ? 'bg-teal-600 border-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Contract
              </button>
            </div>
          </div>

          {engagementType === 'CONTRACT' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Contract Duration <span className="text-rose-500">*</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Years</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="e.g. 1"
                    value={contractYears}
                    onChange={(e) => setContractYears(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Days</label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    placeholder="e.g. 90"
                    value={contractDays}
                    onChange={(e) => setContractDays(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-2">Provide either years or days.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Additional Information (Optional)</label>
            <textarea
              placeholder="Tell us about your requirements, work schedule, pets, preferred timings, etc."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 outline-none"
            />
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-[11px] text-teal-800 font-medium leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Our team reviews your request and arranges a suitable specialist for you. You'll be updated here and through notifications.
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
              className="cursor-pointer inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-lg text-center text-sm transition-all shadow-md focus:outline-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-t-2 border-white animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4" />
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
