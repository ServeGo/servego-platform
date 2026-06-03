import React from 'react';
import './scaffold.css';
import { Link } from 'react-router-dom';

export default function ScaffoldLayout({ children }){
  return (
    <div className="scaffold-root">
      <header className="scaffold-header">
        <h1>Design Scaffold — ServeGo</h1>
        <div>
          <Link to="/" style={{color:'#64748b', marginRight:12}}>Home</Link>
          <Link to="/scaffold" style={{color:'#2563eb', fontWeight:700}}>Scaffold</Link>
        </div>
      </header>

      <div className="scaffold-container">
        {children}
      </div>

      <div className="scaffold-footer">This scaffold contains placeholder pages to iterate UI quickly. Replace placeholders with full implementations as you go.</div>
    </div>
  );
}
