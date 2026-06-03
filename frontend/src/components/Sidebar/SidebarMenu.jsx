import React from 'react';
import { NavLink } from 'react-router-dom';

const SidebarMenu = ({ title, items }) => (
  <aside className="sidebar-card sidebar-menu">
    <div className="sidebar-title">{title}</div>
    <nav className="sidebar-links">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <span className="sidebar-dot" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default SidebarMenu;
