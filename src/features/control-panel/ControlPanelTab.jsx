import React, { useState, useEffect } from 'react';
import { 
  Power, 
  Play, 
  Pause, 
  PlusSquare, 
  ArrowRightCircle, 
  WifiOff,
  RefreshCw 
} from 'lucide-react';
import './ControlPanel.css'; 

// Configuration
const PI_IP = "192.168.254.119"; 
// Note: We use ports 5001 for Camera and 5002 for System Stats
const BASE_STREAM_URL = `http://${PI_IP}:5001/video_feed`;
const API_URL = `http://${PI_IP}:5002/api/system_status`;

const ControlPanel = () => {
  // --- STATE ---
  const [isOn, setIsOn] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
  // Stream key forces React to re-request the image when we retry
  const [streamKey, setStreamKey] = useState(0);
  
  // Stats Data
  const [stats] = useState({
    total: 1234,
    small: 246,
    medium: 370,
    large: 617
  });

  // System Health Data
  const [systemHealth, setSystemHealth] = useState({
    cpu: { percent: 0, temp: 0 },
    memory: { percent: 0, used: 0, total: 0 },
    storage: { percent: 0, used: 0, total: 0 }
  });

  // --- API POLL ---
  useEffect(() => {
    // Safety Check: Warn if using HTTPS (blocks camera)
    if (window.location.protocol === 'https:') {
      console.warn("⚠️ WARNING: You are using HTTPS. The camera stream (HTTP) will be blocked. Please use 'http://' instead.");
    }

    let isMounted = true; 
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok && isMounted) {
          const data = await response.json();
          if (data) setSystemHealth(data);
        }
      } catch (error) {
        // Silent fail for stats is okay, we just keep old values
        console.error("Error fetching status:", error);
      }
    };

    fetchSystemStatus(); 
    const interval = setInterval(fetchSystemStatus, 2000); 

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // --- HANDLERS ---
  const togglePower = () => setIsOn(!isOn);
  
  const toggleSort = () => {
    console.log(isSorting ? "Command: PAUSE" : "Command: START");
    setIsSorting(!isSorting);
  };

  const handleNewBatch = () => console.log("Command: NEW BATCH");
  const handleContinue = () => console.log("Command: CONTINUE");
  
  // Camera Handlers
  const handleCameraError = () => {
    setCameraError(true);
  };

  const retryCamera = () => {
    console.log("Retrying camera connection...");
    setCameraError(false);
    // Increment the counter to force React to reload the image tag
    setStreamKey(prevKey => prevKey + 1);
  };

  // --- SAFE VALUE HELPERS ---
  const cpuPercent = systemHealth?.cpu?.percent || 0;
  const memPercent = systemHealth?.memory?.percent || 0;
  const stgPercent = systemHealth?.storage?.percent || 0;
  const cpuTemp = systemHealth?.cpu?.temp || 0;

  return (
    <div className="control-container">
      
      {/* SCROLLABLE CONTENT AREA */}
      <div className="scroll-content">
        <h1 className="page-title">Control Panel</h1>

        {/* MAIN DASHBOARD CARD */}
        <div className="dashboard-card">

          {/* 1. CAMERA FEED */}
          <div className="camera-wrapper">
            {!cameraError ? (
              <img 
                // We append streamKey to force the browser to ignore cache
                src={`${BASE_STREAM_URL}?t=${streamKey}`}
                alt="Live Feed"
                onError={handleCameraError}
                className="camera-feed"
              />
            ) : (
              // UPDATED: Now uses CSS classes instead of inline styles
              <div onClick={retryCamera} className="camera-error">
                <WifiOff size={48} className="error-icon" />
                <span className="error-title">Signal Lost</span>
                <div className="retry-btn">
                    <RefreshCw size={16} /> Tap to Retry
                </div>
              </div>
            )}
            
            {/* Overlay only shows when camera is working or we want it to persist */}
            {!cameraError && <div className="camera-overlay">LIVE • 640x480</div>}
          </div>

          {/* 2. STATS SECTION */}
          <div className="stats-container">
            <div className="total-header">
              <span className="label-text">Total Beans</span>
              <span className="total-value">{stats.total}</span>
            </div>
            
            <div className="sub-stats-row">
              <div className="stat-card">
                <span className="stat-label">Small</span>
                <span className="stat-val text-blue">{stats.small}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Medium</span>
                <span className="stat-val text-green">{stats.medium}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Large</span>
                <span className="stat-val text-orange">{stats.large}</span>
              </div>
            </div>
          </div>

          {/* 3. CONTROLS GRID */}
          <div className="controls-grid">
            {/* Start/Stop Button */}
            <button onClick={toggleSort} className={`control-btn ${isSorting ? 'btn-stop' : 'btn-start'}`}>
              {isSorting ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              <span>{isSorting ? "STOP" : "START"}</span>
            </button>

            {/* Power Button */}
            <button onClick={togglePower} className={`control-btn ${isOn ? 'btn-active' : 'btn-neutral'}`}>
              <Power size={28} />
              <span>POWER</span>
            </button>

            {/* New Batch Button */}
            <button onClick={handleNewBatch} className="control-btn btn-neutral">
              <PlusSquare size={26} strokeWidth={1.5} />
              <span>NEW BATCH</span>
            </button>

            {/* Continue Button */}
            <button onClick={handleContinue} className="control-btn btn-neutral">
              <ArrowRightCircle size={26} strokeWidth={1.5} />
              <span>CONTINUE</span>
            </button>
          </div>

          {/* 4. SYSTEM STATUS (Detailed) */}
          <div className="system-section">
             <div className="system-title">SYSTEM STATUS</div>

             {/* CPU */}
             <div className="status-row">
                <span className="status-text">
                  CPU ({cpuPercent.toFixed(1)}%)
                </span>
                <div className="track">
                  <div className="fill fill-cpu" style={{ width: `${Math.min(cpuPercent, 100)}%` }}></div>
                </div>
             </div>

             {/* Memory */}
             <div className="status-row">
                <span className="status-text">
                  Memory ({memPercent.toFixed(1)}%)
                </span>
                <div className="track">
                  <div className="fill fill-mem" style={{ width: `${Math.min(memPercent, 100)}%` }}></div>
                </div>
             </div>

             {/* Storage */}
             <div className="status-row">
                <span className="status-text">
                  Storage ({stgPercent.toFixed(1)}%)
                </span>
                <div className="track">
                  <div className="fill fill-stg" style={{ width: `${Math.min(stgPercent, 100)}%` }}></div>
                </div>
             </div>

             {/* Temperature */}
             <div className="status-row">
                <span className="status-text">
                  Temp ({cpuTemp.toFixed(1)}°C)
                </span>
                <div className="track">
                  <div 
                    className="fill fill-temp" 
                    style={{ 
                        width: `${Math.min(cpuTemp, 100)}%`,
                        // Dynamic color override for high temps
                        backgroundColor: cpuTemp > 80 ? '#ff3b30' : undefined 
                    }}
                  ></div>
                </div>
             </div>
          </div>

        </div> 
      </div>
    </div>
  );
};

export default ControlPanel;