import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import SidebarMenu from '../components/Sidebar/SidebarMenu';
import ScrollToTop from '../components/ScrollToTop';
import { providerSidebarItems } from '../data/navigation';

const ProviderLayout = () => (
  <div className="app-root page-layout">
    <ScrollToTop />
    <Navbar />
    <main className="dashboard-shell compact-dashboard ultra-compact">
      <aside className="dashboard-sidebar">
        <SidebarMenu title="Provider Panel" items={providerSidebarItems} />
      </aside>
      <section className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Ready to grow?</p>
            <h2>Provider workspace</h2>
          </div>
          <Link to="/available-jobs" className="button-primary">
            Discover work
          </Link>
        </div>
        <Outlet />
      </section>
    </main>
    <Footer />
  </div>
);

export default ProviderLayout;
