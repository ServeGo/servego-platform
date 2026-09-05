import React from 'react';

export default function DashboardHeader({ user, activeTab, setActiveTab, counts }) {
  const tabs = [
    { id: 'bookings', label: `My Bookings (${counts.bookings})` },
    { id: 'requests', label: `Requests (${counts.requests})` },
    { id: 'tickets', label: `Help Tickets (${counts.tickets})` },
    { id: 'notifications', label: `Alerts (${counts.notifications})` },
    { id: 'wallet', label: '💰 Wallet' },
    { id: 'profile', label: 'My Profile' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs mb-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center text-left">
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-extrabold text-base border border-indigo-500/20">
          {user?.name?.substring(0, 2).toUpperCase() || 'CU'}
        </div>
        <div>
          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase font-extrabold tracking-wide">
            Active Resident Customer
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 mt-1 leading-none">{user?.name || 'Guest Resident'}</h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">{user?.email} • Joined {user?.joinedDate}</p>
        </div>
      </div>

      <div className="flex w-full md:w-auto md:flex-wrap gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
