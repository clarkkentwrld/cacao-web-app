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
// MAKE SURE THIS IP MATCHES YOUR RASPBERRY PI
const PI_IP = "192.168.254.119"; 

// Ports: 5001 for Camera, 5002 for Control/Status API
const BASE_STREAM_URL = `http://${PI_IP}:5001/video_feed`;
const API_URL = `http://${PI_IP}:5002/api/system_status`;
const CONTROL_URL = `http://${PI_IP}:5002/api/control`;

const ControlPanel = () => {
  // --- STATE ---
  // We now store the entire system state from the backend here
  const [systemData, setSystemData] = useState(null);
  const [isOn, setIsOn] = useState(true); // Local power state (UI only for now)
  const [cameraError, setCameraError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);

  // --- 1. POLLING LOOP (Reads Data from RPi) ---
  useEffect(() => {
    // Check for HTTPS blockage
    if (window.location.protocol === 'https:') {
      console.warn("⚠️ WARNING: You are using HTTPS. The camera stream (HTTP) will be blocked.");
    }

    let isMounted = true;
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok && isMounted) {
          const data = await response.json();
          setSystemData(data);
        }
      } catch (error) {
        console.error("Error fetching status:", error);
      }
    };

    // Poll immediately and then every 1 second
    fetchSystemStatus(); 
    const interval = setInterval(fetchSystemStatus, 1000); 

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // --- 2. COMMAND HANDLER (Sends Data to RPi) ---
  const sendCommand = async (action) => {
    try {
      await fetch(CONTROL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: action })
      });
      
      // Optional: Fetch immediately to make UI feel snappier
      const res = await fetch(API_URL);
      const data = await res.json();
      setSystemData(data);
      
    } catch (error) {
      console.error("Command Error:", error);
    }
  };

  // --- HANDLERS ---
  const toggleSort = () => {
    // Sends "TOGGLE" command to server.py
    sendCommand('TOGGLE');
  };

  const handleNewBatch = () => {
    if(window.confirm("Start a new batch? This will reset counters.")) {
      sendCommand('NEW_BATCH');
    }
  };

  const handleContinue = () => {
    sendCommand('CONTINUE');
  };

  const togglePower = () => {
    // Logic for soft power toggle (UI only)
    setIsOn(!isOn);
  };
  
  // Camera Handlers
  const handleCameraError = () => setCameraError(true);
  const retryCamera = () => {
    setCameraError(false);
    setStreamKey(prevKey => prevKey + 1);
  };

  // --- DERIVED VALUES (Fail-safe) ---
  // Access deep properties safely. If systemData is null (loading), use defaults.
  const isSorting = systemData?.status?.is_sorting || false;
  const currentBatchId = systemData?.status?.batch_id || "--";
  
  const stats = systemData?.counts || { 
    total: 0, small: 0, medium: 0, large: 0 
  };

  const cpuPercent = systemData?.cpu?.percent || 0;
  const memPercent = systemData?.memory?.percent || 0;
  const stgPercent = systemData?.storage?.percent || 0;
  const cpuTemp = systemData?.cpu?.temp || 0;

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
                src={`${BASE_STREAM_URL}?t=${streamKey}`}
                alt="Live Feed"
                onError={handleCameraError}
                className="camera-feed"
              />
            ) : (
              <div onClick={retryCamera} className="camera-error">
                <WifiOff size={48} className="error-icon" />
                <span className="error-title">Signal Lost</span>
                <div className="retry-btn">
                    <RefreshCw size={16} /> Tap to Retry
                </div>
              </div>
            )}
            {!cameraError && <div className="camera-overlay">LIVE • 640x480</div>}
          </div>

          {/* 2. STATS SECTION */}
          <div className="stats-container">
            <div className="total-header">
              <span className="label-text">Total Beans (Batch #{currentBatchId})</span>
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
            <button 
              onClick={toggleSort} 
              className={`control-btn ${isSorting ? 'btn-stop' : 'btn-start'}`}
            >
              {isSorting ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              <span>{isSorting ? "STOP" : "START"}</span>
            </button>

            {/* Power Button */}
            <button 
              onClick={togglePower} 
              className={`control-btn ${isOn ? 'btn-active' : 'btn-neutral'}`}
            >
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

          {/* 4. SYSTEM STATUS */}
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