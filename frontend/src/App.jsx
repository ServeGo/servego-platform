import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import BecomePartner from './pages/BecomePartner';
import './App.css';

const Layout = () => (
  <div className="app-root">
    <Navbar />
    <main>
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/become-partner" element={<BecomePartner />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
