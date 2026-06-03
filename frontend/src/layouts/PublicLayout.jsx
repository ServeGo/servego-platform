import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import ScrollToTop from '../components/ScrollToTop';

const PublicLayout = () => (
  <div className="app-root page-layout">
    <ScrollToTop />
    <Navbar />
    <main className="content-area">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default PublicLayout;
