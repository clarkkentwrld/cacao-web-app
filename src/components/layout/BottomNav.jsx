import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css'; 

const BottomNav = ({ items }) => {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) => 
            isActive ? "nav-item active" : "nav-item"
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;