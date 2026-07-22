import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ReviewModal({ 
  booking, 
  rating, setRating, 
  comment, setComment, 
  onClose, 
  onSubmit,
  submitting
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full relative shadow-2xl animate-fade-in text-left">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Review Your Specialist</h3>
            <p className="text-slate-500 text-xs font-medium">Share your experience with {booking.providerName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Score rating</label>
            <div className="flex justify-center gap-1.5 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl transition-all ${rating >= star ? 'text-amber-400 scale-110' : 'text-slate-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="block text-center text-xs font-semibold text-amber-600 mt-1">
              {rating === 5 && '🌟 Perfect work'}
              {rating === 4 && '👍 Great job'}
              {rating === 3 && '✊ Satisfactory'}
              {rating === 2 && '⚠ Needs improvement'}
              {rating === 1 && '👎 Frustrating'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-750 uppercase tracking-wide mb-1">Your Detailed Comment *</label>
            <textarea
              rows={3}
              required
              placeholder="Describe their punctuality, cleanliness, professional advice, etc..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-xs transition-colors border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors border border-indigo-500/10 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {submitting ? 'Publishing...' : 'Publish Verified Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
