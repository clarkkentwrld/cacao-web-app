import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
// Updated icons: Removed Camera/Cog, added Bell
import { FaSlidersH, FaChartBar, FaBell } from 'react-icons/fa';

// Define the navigation configuration here
const NAV_ITEMS = [
  { 
    id: 'control-panel', 
    label: 'Control Panel', 
    path: '/control-panel', 
    icon: <FaSlidersH size={20} /> 
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    path: '/analytics', 
    icon: <FaChartBar size={20} /> 
  },
  { 
    id: 'notification', 
    label: 'Notification', 
    path: '/notification', 
    icon: <FaBell size={20} /> 
  }
];

const MobileLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px', backgroundColor: '#f1f5f9' }}>
        <Outlet />
      </main>

      {/* Navigation Bar - We pass the items as a prop */}
      <BottomNav items={NAV_ITEMS} />
      
    </div>
  );
};

export default MobileLayout;