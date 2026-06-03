import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import SidebarMenu from '../components/Sidebar/SidebarMenu';
import ScrollToTop from '../components/ScrollToTop';
import { customerSidebarItems } from '../data/navigation';

const CustomerLayout = () => (
  <div className="app-root page-layout">
    <ScrollToTop />
    <Navbar />
    <main className="dashboard-shell compact-dashboard ultra-compact">
      <aside className="dashboard-sidebar">
        <SidebarMenu title="Customer Panel" items={customerSidebarItems} />
      </aside>
      <section className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Customer workspace</h2>
          </div>
          <Link to="/book-service" className="button-primary">
            Book a service
          </Link>
        </div>
        <Outlet />
      </section>
    </main>
    <Footer />
  </div>
);

export default CustomerLayout;
