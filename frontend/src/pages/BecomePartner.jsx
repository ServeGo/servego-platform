import React from 'react';

function BecomePartnerPage() {
  return (
    <main className="bp-page" aria-labelledby="bp-hero-title">
      <section className="bp-hero" id="bp-hero" style={{ padding: '4rem 2rem', background: 'linear-gradient(135deg,#f8fafc,#ffffff)' }}>
        <div className="bp-hero-inner" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, alignItems: 'center' }}>
          <div>
            <h1 id="bp-hero-title" style={{ fontSize: 44, lineHeight: 1.05, margin: 0, fontWeight: 800, color: '#0f172a' }}>
              Grow Your Service Business With ServeGo
            </h1>
            <p style={{ marginTop: 16, fontSize: 18, color: '#475569' }}>
              Join thousands of skilled professionals and receive more bookings, more customers, and higher earnings every month.
            </p>

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button className="btn-primary" style={{ background: '#f97316', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Apply Now
              </button>
              <button className="btn-secondary" style={{ background: 'transparent', border: '2px solid #2563eb', color: '#2563eb', padding: '10px 18px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                Learn More
              </button>
            </div>

            <ul style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap', listStyle: 'none', padding: 0 }}>
              <li style={{ minWidth: 160 }}>
                <div style={{ fontSize: 14, color: '#64748b' }}>10,000+ </div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Happy Customers</div>
              </li>
              <li style={{ minWidth: 160 }}>
                <div style={{ fontSize: 14, color: '#64748b' }}>2,000+ </div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Active Partners</div>
              </li>
              <li style={{ minWidth: 160 }}>
                <div style={{ fontSize: 14, color: '#64748b' }}>50+ </div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Cities</div>
              </li>
              <li style={{ minWidth: 160 }}>
                <div style={{ fontSize: 14, color: '#64748b' }}>4.8★ </div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Average Rating</div>
              </li>
            </ul>
          </div>

          <div className="bp-hero-visual" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: 400, height: 300, borderRadius: 20, background: 'linear-gradient(135deg,#fff,#eef2ff)', boxShadow: '0 20px 40px rgba(2,6,23,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="0" y="0" width="220" height="140" rx="18" fill="#fff" />
                <g transform="translate(12,10)">
                  <circle cx="30" cy="50" r="18" fill="#f97316" />
                  <rect x="60" y="30" width="110" height="12" rx="6" fill="#e6eefc" />
                  <rect x="60" y="52" width="80" height="12" rx="6" fill="#e6eefc" />
                </g>
              </svg>
              <div style={{ position: 'absolute', bottom: -18, display: 'flex', gap: 8 }}>
                <div style={{ background: '#fff', padding: 8, borderRadius: 12, boxShadow: '0 6px 18px rgba(2,6,23,0.08)' }}>🔧 Professional</div>
                <div style={{ background: '#fff', padding: 8, borderRadius: 12, boxShadow: '0 6px 18px rgba(2,6,23,0.08)' }}>⭐ 4.8+</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bp-why" style={{ padding: '3rem 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, margin: 0, fontWeight: 800, color: '#0f172a' }}>Why Join ServeGo</h2>
          <p style={{ marginTop: 10, color: '#64748b' }}>Powerful benefits designed to help you grow faster and earn more.</p>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { title: 'Higher Earnings', desc: 'Competitive commissions and premium job matching', accent: '#f97316' },
              { title: 'More Customers', desc: 'High-intent leads across multiple cities', accent: '#2563eb' },
              { title: 'Flexible Working Hours', desc: 'Work when you want, pick the jobs you like', accent: '#06b6d4' },
              { title: 'Secure Payments', desc: 'Fast, transparent payouts with protection', accent: '#10b981' },
              { title: 'Professional Growth', desc: 'Training, upskilling and rating-based rewards', accent: '#8b5cf6' },
              { title: 'Dedicated Support', desc: 'Partner support team and dispute resolution', accent: '#f59e0b' }
            ].map((c) => (
              <div key={c.title} style={{ background: 'linear-gradient(180deg,#fff,#fbfbff)', borderRadius: 14, padding: 18, boxShadow: '0 10px 30px rgba(2,6,23,0.04)', border: '1px solid rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                    {c.title[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{c.title}</div>
                    <div style={{ marginTop: 6, color: '#64748b' }}>{c.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-how" style={{ padding: '3rem 2rem', background: 'linear-gradient(180deg,#fff,#f8fafc)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>How It Works</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>Simple, transparent process so you start earning quickly.</p>

          <ol style={{ listStyle: 'none', display: 'flex', gap: 18, marginTop: 24, padding: 0, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            {[
              { step: '01', title: 'Create Profile', desc: 'Sign up and list your services' },
              { step: '02', title: 'Complete Verification', desc: 'ID & background checks' },
              { step: '03', title: 'Receive Service Requests', desc: 'Get matched with local customers' },
              { step: '04', title: 'Complete Jobs', desc: 'Deliver quality service and earn ratings' },
              { step: '05', title: 'Get Paid', desc: 'Fast payouts and incentives' }
            ].map((s) => (
              <li key={s.step} style={{ flex: '1 1 160px', minWidth: 160 }}>
                <div style={{ background: '#fff', padding: 20, borderRadius: 14, boxShadow: '0 10px 30px rgba(2,6,23,0.04)', border: '1px solid rgba(15,23,42,0.04)', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{s.step}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{s.title}</div>
                      <div style={{ marginTop: 6, color: '#64748b' }}>{s.desc}</div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bp-categories" style={{ padding: '3rem 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Partner Categories</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>Choose the category that matches your expertise.</p>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              'Electrician','Plumber','Carpenter','AC Technician','Cleaner','Painter','Appliance Repair','Pest Control','Water Purifier Service','Home Maintenance'
            ].map((cat) => (
              <div key={cat} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 10px 30px rgba(2,6,23,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#3730a3' }}>
                  {cat.split(' ').map(w => w[0]).slice(0,2).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>{cat}</div>
                  <div style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>High demand in urban areas</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-earnings" style={{ padding: '3rem 2rem', background: 'linear-gradient(180deg,#ffffff,#f8fafc)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>How Much Can You Earn?</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>Estimated monthly earnings based on average bookings and city demand.</p>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { title: 'Electrician', range: '₹25,000 – ₹60,000 / month' },
              { title: 'Plumber', range: '₹20,000 – ₹55,000 / month' },
              { title: 'AC Technician', range: '₹30,000 – ₹70,000 / month' },
              { title: 'Cleaner', range: '₹15,000 – ₹40,000 / month' },
              { title: 'Carpenter', range: '₹25,000 – ₹65,000 / month' }
            ].map((e) => (
              <div key={e.title} style={{ background: 'linear-gradient(180deg,#fff,#fffaf0)', borderRadius: 12, padding: 18, boxShadow: '0 10px 30px rgba(2,6,23,0.04)', border: '1px solid rgba(15,23,42,0.04)' }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{e.title}</div>
                <div style={{ marginTop: 8, color: '#0f172a', fontWeight: 800 }}>{e.range}</div>
                <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>Top partners earn more with high ratings and availability.</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-testimonials" style={{ padding: '3rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Success Stories</h2>
          <p style={{ marginTop: 8, color: '#64748b' }}>Real partners, real growth.</p>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {[
              { name: 'Ravi Kumar', prof: 'Electrician', rating: 5, image: 'https://randomuser.me/api/portraits/men/45.jpg', story: 'I doubled my monthly income within 3 months. ServeGo brings quality leads and on-time payments.' },
              { name: 'Sunita Rao', prof: 'Cleaner', rating: 5, image: 'https://randomuser.me/api/portraits/women/47.jpg', story: 'Flexible hours helped me balance family and work while increasing earnings.' },
              { name: 'Amit Shah', prof: 'AC Technician', rating: 5, image: 'https://randomuser.me/api/portraits/men/46.jpg', story: 'Customer demand is consistent and support helped resolve disputes quickly.' }
            ].map((t) => (
              <figure key={t.name} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 10px 30px rgba(2,6,23,0.04)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <img src={t.image} alt={t.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid #f97316' }} />
                <figcaption>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>{t.name}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{t.prof}</div>
                  </div>
                  <div style={{ marginTop: 8, color: '#f59e0b', fontWeight: 800 }}>{'★'.repeat(t.rating)}</div>
                  <blockquote style={{ marginTop: 10, color: '#475569' }}>{t.story}</blockquote>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-apply" style={{ padding: '3rem 2rem', background: 'linear-gradient(135deg,#eef2ff,#ffffff)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 32, alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Become a ServeGo Partner</h2>
            <p style={{ color: '#64748b', marginTop: 8 }}>Fill out the application and our partner support team will reach out within 24–48 hours.</p>

            <form style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Full Name</span>
                  <input name="name" type="text" required placeholder="Your full name" style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Phone Number</span>
                  <input name="phone" type="tel" required placeholder="+91 98765 43210" style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Email Address</span>
                  <input name="email" type="email" required placeholder="you@example.com" style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Service Category</span>
                  <select name="category" required style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }}>
                    <option>Electrician</option>
                    <option>Plumber</option>
                    <option>Carpenter</option>
                    <option>AC Technician</option>
                    <option>Cleaner</option>
                    <option>Painter</option>
                    <option>Appliance Repair</option>
                    <option>Pest Control</option>
                    <option>Water Purifier Service</option>
                    <option>Home Maintenance</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Experience (years)</span>
                  <input name="experience" type="number" min="0" placeholder="e.g., 3" style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>City</span>
                  <input name="city" type="text" placeholder="City" style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }} />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Address</span>
                <input name="address" type="text" placeholder="Full address" style={{ padding: 12, borderRadius: 8, border: '1px solid #e6eefc' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Upload ID Proof</span>
                  <input name="idProof" type="file" accept=".pdf,.jpg,.png" style={{ padding: 8 }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Upload Profile Photo</span>
                  <input name="profilePhoto" type="file" accept="image/*" style={{ padding: 8 }} />
                </label>
              </div>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input name="agree" type="checkbox" required style={{ width: 18, height: 18 }} />
                <span style={{ color: '#475569' }}>I agree to the terms and conditions and background verification.</span>
              </label>

              <div style={{ marginTop: 12 }}>
                <button type="submit" className="btn-apply" style={{ background: '#111827', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 800, border: 'none', cursor: 'pointer' }}>Apply Now</button>
              </div>
            </form>
          </div>

          <aside style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 10px 30px rgba(2,6,23,0.04)', border: '1px solid rgba(15,23,42,0.04)' }}>
            <div style={{ fontWeight: 800 }}>Need help?</div>
            <p style={{ marginTop: 8, color: '#64748b' }}>Call Partner Support: <strong style={{ color: '#0f172a' }}>+91 12345 67890</strong></p>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Documents to keep ready:</div>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                <li style={{ color: '#475569' }}>Government ID (Aadhaar/Passport/Driver’s License)</li>
                <li style={{ color: '#475569' }}>Address proof</li>
                <li style={{ color: '#475569' }}>Profile photo</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="bp-faq" style={{ padding: '3rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Frequently Asked Questions</h2>
          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            {[
              { q: 'How do I join ServeGo?', a: 'Sign up with your details, upload ID proof and profile photo, complete verification and start receiving service requests.' },
              { q: 'How long does verification take?', a: 'Verification typically completes within 24–72 hours depending on document clarity and background checks.' },
              { q: 'When do I receive payments?', a: 'Payments are processed after job completion and quality checks — typically within 3 business days to your registered payout method.' },
              { q: 'What documents are required?', a: 'A government ID, address proof, and a clear profile photo are required for verification.' },
              { q: 'Can I work part-time?', a: 'Yes — you can choose jobs that fit your schedule and work part-time or full-time.' }
            ].map(item => (
              <details key={item.q} style={{ background: '#fff', padding: 14, borderRadius: 10, boxShadow: '0 6px 18px rgba(2,6,23,0.04)', border: '1px solid rgba(15,23,42,0.04)' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>{item.q}</summary>
                <div style={{ marginTop: 8, color: '#64748b' }}>{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-cta-final" style={{ padding: '3.5rem 2rem', background: 'linear-gradient(135deg,#111827,#0f172a)', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 30, margin: 0, fontWeight: 900 }}>Ready To Grow Your Business?</h2>
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>Join ServeGo today and start receiving customer bookings.</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ background: '#f97316', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
              Become A Partner
            </button>
            <button style={{ background: 'transparent', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, border: '2px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
              Contact Support
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default BecomePartnerPage;
