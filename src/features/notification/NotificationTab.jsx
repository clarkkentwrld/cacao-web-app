import React, { useState, useEffect } from 'react';
import { FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaBell } from 'react-icons/fa';
import './Notification.css'; 

// Configuration
const PI_IP = "192.168.254.119"; 
const API_URL = `http://${PI_IP}:5000/api/notifications`;

const NotificationTab = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications from your Python backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
            const data = await response.json();
            setNotifications(data);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    // Poll every 5 seconds to get new alerts automatically
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <FaExclamationTriangle className="icon warning" />;
      case 'success': return <FaCheckCircle className="icon success" />;
      default: return <FaInfoCircle className="icon info" />;
    }
  };

  return (
    <div className="notification-container">
      <header className="page-header">
        <h1>Notifications</h1>
        <span className="badge">{notifications.length} New</span>
      </header>

      {loading ? (
        <p>Loading alerts...</p>
      ) : (
        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <FaBell size={40} color="#cbd5e1" />
              <p>No new notifications</p>
            </div>
          ) : (
            notifications.map((note) => (
              <div key={note.id} className={`notification-card ${note.type}`}>
                <div className="icon-wrapper">
                  {getIcon(note.type)}
                </div>
                <div className="content">
                  <h3>{note.title}</h3>
                  <p>{note.message}</p>
                  <span className="timestamp">{note.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationTab;