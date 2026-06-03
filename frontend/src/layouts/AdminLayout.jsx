import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import SidebarMenu from '../components/Sidebar/SidebarMenu';
import ScrollToTop from '../components/ScrollToTop';
import { adminSidebarItems } from '../data/navigation';

const AdminLayout = () => (
  <div className="app-root page-layout">
    <ScrollToTop />
    <Navbar />
    <main className="dashboard-shell compact-dashboard ultra-compact">
      <aside className="dashboard-sidebar">
        <SidebarMenu title="Admin Panel" items={adminSidebarItems} />
      </aside>
      <section className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Operational overview</p>
            <h2>Admin workspace</h2>
          </div>
          <Link to="/analytics" className="button-primary">
            View analytics
          </Link>
        </div>
        <Outlet />
      </section>
    </main>
    <Footer />
  </div>
);

export default AdminLayout;
