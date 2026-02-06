import { Routes, Route, Navigate } from 'react-router-dom';

// Layout wrapper
import MobileLayout from '../components/layout/MobileLayout'; 

// Updated Feature Imports
import ControlPanelTab from '../features/control-panel/ControlPanelTab';
import AnalyticsTab from '../features/analytics/AnalyticsTab';

// NEW IMPORT: Make sure you create this file in your features folder first!
import NotificationTab from '../features/notification/NotificationTab';

const AppRoutes = () => {
  return (
    <Routes>
      {/* The MobileLayout wraps these routes */}
      <Route path="/" element={<MobileLayout />}>
        
        {/* CHANGED: Redirect empty path "/" directly to "/control-panel" */}
        <Route index element={<Navigate to="/control-panel" replace />} />
        
        {/* Your 3 Actual screens */}
        <Route path="control-panel" element={<ControlPanelTab />} />
        <Route path="analytics" element={<AnalyticsTab />} />
        
        {/* NEW ROUTE */}
        <Route path="notification" element={<NotificationTab />} />
        
      </Route>
    </Routes>
  );
};

export default AppRoutes;