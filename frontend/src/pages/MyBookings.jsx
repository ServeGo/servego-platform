import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../scaffold/common/Loader';
import EmptyState from '../scaffold/common/EmptyState';

const statusColors = {
  upcoming: '#2563eb',
  inprogress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
};

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString();
}

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const mockBookings = [
  {
    id: 'BK-10234',
    service: 'Home Deep Cleaning',
    provider: 'Sparkle Cleaners',
    date: '2026-06-12T10:00:00',
    address: '22B, Palmview Apartments, MG Road, Bangalore',
    status: 'upcoming',
    notes: 'Please focus on the kitchen and balcony.',
    amount: 120,
    timeline: [
      { time: '2026-06-01T09:00:00', note: 'Booking Created' },
      { time: '2026-06-02T15:00:00', note: 'Provider Assigned' },
    ],
  },
  {
    id: 'BK-10235',
    service: 'AC Repair',
    provider: 'CoolPro Services',
    date: '2026-05-30T14:30:00',
    address: 'Flat 9, Rosewood Tower, Sector 11',
    status: 'completed',
    notes: 'Compressor replaced, working fine.',
    amount: 85,
    timeline: [
      { time: '2026-05-20T09:00:00', note: 'Booking Created' },
      { time: '2026-05-25T11:00:00', note: 'Provider Assigned' },
      { time: '2026-05-30T14:30:00', note: 'Service Completed' },
      { time: '2026-05-30T15:00:00', note: 'Payment Successful' },
    ],
  },
  {
    id: 'BK-10236',
    service: 'Pest Control - Quarterly',
    provider: 'SafeHome Pest',
    date: '2026-06-02T09:00:00',
    address: 'House 7, Greenfield Colony',
    status: 'inprogress',
    eta: '20 mins',
    notes: 'Use eco-friendly chemicals.',
    amount: 60,
    timeline: [
      { time: '2026-05-28T08:00:00', note: 'Booking Created' },
      { time: '2026-05-29T12:00:00', note: 'Provider Assigned' },
      { time: '2026-06-02T09:15:00', note: 'Service Started' },
    ],
  },
  {
    id: 'BK-10237',
    service: 'Sofa Shampoo',
    provider: 'FreshFabrics',
    date: '2026-05-15T11:00:00',
    address: 'A-101, Lake View',
    status: 'cancelled',
    cancelledDate: '2026-05-14T16:00:00',
    cancelReason: 'Customer requested cancellation',
    notes: '',
    amount: 45,
    timeline: [
      { time: '2026-05-10T09:00:00', note: 'Booking Created' },
      { time: '2026-05-12T10:00:00', note: 'Provider Assigned' },
      { time: '2026-05-14T16:00:00', note: 'Booking Cancelled' },
    ],
  },
];

export default function MyBookings() {
  const [tab, setTab] = useState('upcoming');
  const [selected, setSelected] = useState(null);
  const [isLoading] = useState(false);

  const totals = mockBookings.reduce(
    (acc, b) => {
      acc.total += 1;
      acc[b.status === 'completed' ? 'completed' : b.status === 'cancelled' ? 'cancelled' : b.status === 'inprogress' ? 'inprogress' : 'upcoming'] += 1;
      return acc;
    },
    { total: 0, upcoming: 0, inprogress: 0, completed: 0, cancelled: 0 }
  );

  const bookingsByTab = {
    upcoming: mockBookings.filter((b) => b.status === 'upcoming'),
    inprogress: mockBookings.filter((b) => b.status === 'inprogress'),
    completed: mockBookings.filter((b) => b.status === 'completed'),
    cancelled: mockBookings.filter((b) => b.status === 'cancelled'),
  };

  return (
    <div className="mybookings-root">
      <style>{`
        .mybookings-root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:28px; color:#0f172a}
        .mybookings-root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:12px; color:#0f172a}
        .header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
        .title{font-size:22px;font-weight:700;margin:0}
        .subtitle{color:#64748b;margin-top:4px}
        .quick-actions{display:flex;gap:8px}
        .qa-btn{background:#111827;color:#fff;padding:8px 12px;border-radius:10px;border:none;cursor:pointer;box-shadow:0 6px 18px rgba(2,6,23,0.06);transition:transform .12s}
        .qa-btn:hover{transform:translateY(-2px)}

        .grid{display:grid;grid-template-columns:1fr 280px;gap:12px}
        .main{background:transparent}
        .cards{display:flex;gap:10px;margin:12px 0 14px;flex-wrap:wrap}
        .stat{flex:1;min-width:140px;background:linear-gradient(180deg,#ffffff,#f8fafc);border-radius:10px;padding:10px;box-shadow:0 6px 20px rgba(2,6,23,0.05);border:1px solid rgba(15,23,42,0.04)}
        .stat h4{margin:0;color:#334155;font-size:12px}
        .stat .num{font-size:18px;font-weight:700;margin-top:6px}

        .tabs{display:flex;gap:6px;border-bottom:1px solid #e6eef6;padding-bottom:8px}
        .tab{padding:8px 10px;border-radius:8px 8px 0 0;color:#475569;cursor:pointer;font-size:14px}
        .tab.active{background:#eef2ff;color:#1e40af;font-weight:600;box-shadow:inset 0 -3px 0 #c7d2fe}

        .list{display:flex;flex-direction:column;gap:10px;margin-top:12px}
        .card{background:#fff;border-radius:10px;padding:12px;border:1px solid rgba(2,6,23,0.06);display:flex;justify-content:space-between;gap:10px;align-items:flex-start;box-shadow:0 6px 20px rgba(2,6,23,0.04);transition:transform .12s}
        .card:hover{transform:translateY(-4px)}
        .card-left{display:flex;gap:10px;align-items:flex-start;flex:1}
        .avatar{width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,#eef2ff,#e9f8ff);display:flex;align-items:center;justify-content:center;font-weight:700;color:#0f172a}
        .meta{min-width:0}
        .service{font-weight:600;color:#0f172a}
        .provider{color:#475569;font-size:13px;margin-top:4px}
        .when{color:#64748b;font-size:13px;margin-top:6px}
        .addr{color:#94a3b8;font-size:13px;margin-top:6px}

        .badge{padding:6px 8px;border-radius:999px;font-weight:600;font-size:12px}
        .actions{display:flex;gap:8px}
        .btn{padding:6px 10px;border-radius:8px;border:none;cursor:pointer;background:#f1f5f9;color:#0f172a;font-size:13px}
        .primary{background:#2563eb;color:#fff;box-shadow:0 6px 18px rgba(37,99,235,0.12)}
        .ghost{background:transparent;border:1px solid #e2e8f0}

        .right{background:#fff;border-radius:10px;padding:12px;border:1px solid rgba(2,6,23,0.04);min-height:120px}
        .timeline{display:flex;flex-direction:column;gap:10px}
        .tl-item{display:flex;gap:8px;align-items:flex-start}
        .dot{width:9px;height:9px;border-radius:50%;background:#c7d2fe;margin-top:6px}
        .tl-meta{color:#475569;font-size:13px}

        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;border-radius:10px;border:1px dashed #e6eef6;background:linear-gradient(180deg,#ffffff,#fbfdff)}
        .empty svg{width:120px;height:90px;margin-bottom:12px}

        @media (max-width:900px){
          .grid{grid-template-columns:1fr;}
          .right{order:2}
          .card{flex-direction:column;align-items:stretch}
          .card-left{align-items:center}
          .avatar{width:40px;height:40px}
          .actions{justify-content:flex-end;flex-wrap:wrap}
          .btn, .qa-btn{width:100%;max-width:220px}
        }
      `}</style>

      <div className="header">
        <div>
          <h1 className="title">My Bookings</h1>
          <div className="subtitle">Track, manage, and review all your service bookings in one place.</div>
        </div>
        <div className="quick-actions">
          <button className="qa-btn" onClick={() => navigate('/book-service')}>Book New Service</button>
          <button className="qa-btn" onClick={() => navigate('/services')}>Browse Services</button>
          <button className="qa-btn" onClick={() => navigate('/support-center')}>Contact Support</button>
        </div>
      </div>

      <div className="grid">
        <div className="main">
          <div className="cards">
            <div className="stat">
              <h4>Total Bookings</h4>
              <div className="num">{totals.total}</div>
            </div>
            <div className="stat">
              <h4>Upcoming Services</h4>
              <div className="num">{totals.upcoming}</div>
            </div>
            <div className="stat">
              <h4>Completed Services</h4>
              <div className="num">{totals.completed}</div>
            </div>
            <div className="stat">
              <h4>Cancelled Services</h4>
              <div className="num">{totals.cancelled}</div>
            </div>
          </div>

          <div className="tabs" role="tablist">
            <div className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>Upcoming</div>
            <div className={`tab ${tab === 'inprogress' ? 'active' : ''}`} onClick={() => setTab('inprogress')}>In Progress</div>
            <div className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>Completed</div>
            <div className={`tab ${tab === 'cancelled' ? 'active' : ''}`} onClick={() => setTab('cancelled')}>Cancelled</div>
          </div>

          <div className="list">
              {isLoading ? (
                <Loader />
              ) : bookingsByTab[tab].length === 0 ? (
                <EmptyState />
              ) : null}

            {bookingsByTab[tab].map((b) => (
              <div key={b.id} className="card">
                <div className="card-left">
                  <div className="avatar">{b.service.split(' ').slice(0,2).map(s=>s[0]).join('')}</div>
                  <div className="meta">
                    <div className="service">{b.service}</div>
                    <div className="provider">{b.provider} • <span style={{color:'#94a3b8',fontWeight:600}}>{b.id}</span></div>
                    <div className="when">{formatDate(b.date)} • {formatTime(b.date)}</div>
                    <div className="addr">{b.address}</div>
                  </div>
                </div>

                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <div className="badge" style={{background:statusColors[b.status] || '#64748b',color:'#fff'}}>{b.status.toUpperCase()}</div>
                  </div>

                  <div className="actions">
                    <button className="btn ghost" onClick={() => setSelected(b)}>View Details</button>
                    {b.status === 'upcoming' && <button className="btn" >Reschedule</button>}
                    {b.status === 'upcoming' && <button className="btn" style={{background:'#fee2e2',color:'#991b1b'}}>Cancel Booking</button>}
                    {b.status === 'inprogress' && <button className="btn primary">Track Service</button>}
                    {b.status === 'completed' && <button className="btn primary">Book Again</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="right">
          <h3 style={{margin:0, marginBottom:8}}>Recent Activity</h3>
          <div className="timeline">
            {mockBookings.slice(0,5).map((b) => (
              <div key={b.id} className="tl-item">
                <div className="dot" style={{background: statusColors[b.status] || '#c7d2fe'}} />
                <div>
                  <div style={{fontWeight:700,color:'#0f172a'}}>{b.service}</div>
                  <div className="tl-meta">{b.timeline[b.timeline.length-1].note} • {formatDate(b.timeline[b.timeline.length-1].time)}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>

      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(2,6,23,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:60}} onClick={() => setSelected(null)}>
          <div style={{width:'min(920px,96%)',background:'#fff',borderRadius:12,padding:20}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div>
                <h2 style={{margin:0}}>{selected.service}</h2>
                <div style={{color:'#64748b',marginTop:6}}>{selected.provider} • {selected.id}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <div className="badge" style={{background: statusColors[selected.status] || '#64748b', color:'#fff'}}>{selected.status.toUpperCase()}</div>
                <button className="btn ghost" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:18,marginTop:16}}>
              <div>
                <section style={{marginBottom:12}}>
                  <h4 style={{margin:'0 0 8px 0'}}>Service Information</h4>
                  <div style={{color:'#475569'}}>{selected.service} • {formatDate(selected.date)} • {formatTime(selected.date)}</div>
                  <div style={{marginTop:8,color:'#64748b'}}>{selected.address}</div>
                </section>

                <section style={{marginBottom:12}}>
                  <h4 style={{margin:'0 0 8px 0'}}>Provider Information</h4>
                  <div style={{color:'#0f172a',fontWeight:700}}>{selected.provider}</div>
                  <div style={{color:'#64748b',marginTop:6}}>Contact: +91 98765 43210</div>
                </section>

                <section style={{marginBottom:12}}>
                  <h4 style={{margin:'0 0 8px 0'}}>Booking Timeline</h4>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {selected.timeline.map((t, i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between'}}>
                        <div style={{color:'#475569'}}>{new Date(t.time).toLocaleString()}</div>
                        <div style={{color:'#0f172a'}}>{t.note}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 style={{margin:'0 0 8px 0'}}>Payment Summary</h4>
                  <div style={{display:'flex',justifyContent:'space-between',color:'#475569'}}>
                    <div>Service Charge</div>
                    <div>₹{selected.amount}</div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',color:'#0f172a',fontWeight:700,marginTop:8}}>
                    <div>Total Paid</div>
                    <div>₹{selected.amount}</div>
                  </div>
                </section>
              </div>

              <div style={{borderLeft:'1px solid #eef2f7',paddingLeft:12}}>
                <section style={{marginBottom:12}}>
                  <h4 style={{margin:'0 0 8px 0'}}>Customer Notes</h4>
                  <div style={{color:'#64748b'}}>{selected.notes || 'No additional notes.'}</div>
                </section>

                <section style={{marginBottom:12}}>
                  <h4 style={{margin:'0 0 8px 0'}}>Actions</h4>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <button className="qa-btn">Contact Provider</button>
                    <button className="qa-btn">Download Invoice</button>
                    <button className="qa-btn">Raise an Issue</button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
