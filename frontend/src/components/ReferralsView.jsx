import React from 'react';

export default function ReferralsView({ 
  user, 
  loyaltyTier, 
  completedCount, 
  bookingsNeeded, 
  progressPercent, 
  nextTierName,
  referralCode,
  referralInput,
  setReferralInput,
  onApplyCode,
  onCopyCode,
  copied,
  refError,
  refSuccess
}) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10 text-left">
      {/* LOYALTY CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-indigo-950 text-white relative">
          <div className="absolute right-6 top-6 bg-amber-500 text-slate-950 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md tracking-wider">
            Resident Loyalty
          </div>
          
          <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-widest block">Partnership Status</span>
          <div className="flex items-center gap-3 mt-2">
            <h3 className="text-3xl font-extrabold text-white">👑 {loyaltyTier.tier}</h3>
          </div>
          <p className="text-slate-300 text-xs mt-3 max-w-xl font-medium leading-relaxed">
            {loyaltyTier.desc}. Complete more jobs to level up automatically.
          </p>
          
          {nextTierName && (
            <div className="mt-6 pt-4 border-t border-white/10 text-xs">
              <div className="flex justify-between font-extrabold text-slate-300 mb-2">
                <span>Next Tier: {nextTierName}</span>
                <span className="text-white">{completedCount} / {completedCount + bookingsNeeded} Jobs</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-indigo-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Complete <span className="text-amber-400 font-bold">{bookingsNeeded} more jobs</span> to unlock higher savings.
              </p>
            </div>
          )}
        </div>

        {/* Benefits Matrix */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <TierBenefit label="Bronze" active={loyaltyTier.tier.includes('Bronze')} desc="Standard pricing & support." />
            <TierBenefit label="Silver" active={loyaltyTier.tier.includes('Silver')} desc="5% off & priority dispatch." />
            <TierBenefit label="Gold" active={loyaltyTier.tier.includes('Gold')} desc="10% off & free visual consults." />
            <TierBenefit label="Platinum" active={loyaltyTier.tier.includes('Platinum')} desc="15% off & full damage cover." />
          </div>
        </div>
      </div>

      {/* REFERRALS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 leading-none">Your Ambassador Credentials</h3>
            <p className="text-slate-500 text-xs mt-3 leading-relaxed font-semibold">
              Gift ₹150 off to friends. Once they complete a booking, you get ₹150 credited to your wallet.
            </p>
          </div>

          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-2">My Referral Code</span>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-center">
              <div className="bg-indigo-50 border border-dashed border-indigo-200 rounded-xl px-4 py-3 font-mono font-extrabold text-lg text-indigo-700 tracking-wider flex-1">
                {referralCode}
              </div>
              <button onClick={onCopyCode} className="bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white px-5 rounded-xl transition-colors py-3 sm:py-0 outline-none">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <WalletStat label="Wallet Balance" value={`₹${user?.referralDiscountBalance || 0}`} />
            <WalletStat label="Successful Referrals" value={`${user?.referralsCount || 0}`} />
          </div>
        </div>

        <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 leading-none">Claim Gift Code</h3>
          <p className="text-slate-500 text-xs mt-3 leading-relaxed font-semibold">
            Redeem a friend's code to get ₹150 credit.
          </p>

          <form onSubmit={onApplyCode} className="my-6 space-y-3">
            <input 
              type="text" 
              placeholder="Enter friend's code..." 
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              disabled={!!user?.referredBy}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-xs font-bold font-mono px-4 py-3 rounded-xl outline-none"
            />
            {refError && <div className="text-[10px] text-rose-700 font-bold bg-rose-50 p-2 rounded-lg">⚠ {refError}</div>}
            {refSuccess && <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg">✔ {refSuccess}</div>}

            {user?.referredBy ? (
              <div className="text-[10px] text-slate-500 font-bold text-center bg-slate-100 rounded-xl p-3">
                Applied: <span className="text-indigo-600 font-mono">{user.referredBy}</span>
              </div>
            ) : (
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold p-3 rounded-xl shadow-sm transition-colors">
                Claim Credit
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function TierBenefit({ label, active, desc }) {
  return (
    <div className={`bg-white border p-4 rounded-2xl relative ${active ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'}`}>
      {active && <span className="absolute -top-2 right-4 bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] font-bold">CURRENT</span>}
      <span className="font-bold text-slate-800 text-[11px] uppercase">{label} Tier</span>
      <p className="text-slate-500 font-medium text-[10px] mt-1">{desc}</p>
    </div>
  );
}

function WalletStat({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
      <span className="text-[10px] text-slate-400 font-bold uppercase block">{label}</span>
      <span className="text-2xl font-black text-slate-900 mt-2 block">{value}</span>
    </div>
  );
}
