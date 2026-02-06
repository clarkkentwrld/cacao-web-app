import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; 
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { FaHistory, FaArrowLeft, FaCalendarAlt, FaChevronRight, FaPen, FaDatabase } from 'react-icons/fa';
import './AnalyticsTab.css'; 

const COLORS = { large: '#7D8A8F', medium: '#B09B82', small: '#253237', good: '#B09B82', bad: '#253237' };

// Helper to safely parse SQLite dates (YYYY-MM-DD HH:MM:SS) -> JS Date
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  // Replace space with T to make it ISO 8601 compliant (fixes Safari/Firefox issues)
  const safeDateStr = dateStr.replace(' ', 'T');
  const d = new Date(safeDateStr);
  return isNaN(d.getTime()) ? null : d;
};

const BatchRow = ({ batch, isSelected, onClick, formatDate }) => {
  return (
    <div 
      className={`batch-row ${isSelected ? 'active-row' : ''}`}
      onClick={() => onClick(batch.id)} 
    >
      <div className="col-1">#{batch.batch_number || '?'}</div> 
      <div className="col-2">{formatDate(batch.timestamp)}</div>
      <div className="col-3">{batch.total}</div>
    </div>
  );
};

export default function AnalyticsTab() {
  const location = useLocation();
  const [dbData, setDbData] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [viewMode, setViewMode] = useState('current');
  const [archiveYear, setArchiveYear] = useState(null);
  const [archiveMonth, setArchiveMonth] = useState(null);
  
  // Dynamic current date to prevent stale state
  const currentDate = useMemo(() => new Date(), []);

  useEffect(() => {
    // ⚠️ Ensure your phone/device is on same Wi-Fi as Raspberry Pi
    const API_URL = `http://${window.location.hostname}:5000/api/batches`;
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        console.log("DB Data Received:", data); 
        setDbData(data);
      })
      .catch(err => console.error("DB Error:", err));
  }, []);

  useEffect(() => {
    if (!location?.pathname) return;
    requestAnimationFrame(() => {
      setViewMode('current');
      setArchiveYear(null);
      setArchiveMonth(null);
      setSelectedBatchId(null);
    });
  }, [location.pathname]);

  const filteredBatches = useMemo(() => {
    let targetYear = viewMode === 'current' ? currentDate.getFullYear() : archiveYear;
    let targetMonth = viewMode === 'current' ? currentDate.getMonth() : archiveMonth;

    if (viewMode === 'archive-menu') return [];

    return dbData.filter(batch => {
      const d = parseDate(batch.timestamp);
      // If date is invalid, exclude it (or include it for debugging if you prefer)
      if (!d) return false; 
      
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    }).sort((a, b) => b.id - a.id);
  }, [viewMode, archiveYear, archiveMonth, dbData, currentDate]);

  const activeBatch = useMemo(() => {
    if (filteredBatches.length === 0) return {};
    return filteredBatches.find(b => b.id === selectedBatchId) || filteredBatches[0];
  }, [filteredBatches, selectedBatchId]);

  const availableYears = useMemo(() => {
    const years = new Set(dbData.map(b => {
      const d = parseDate(b.timestamp);
      return d ? d.getFullYear() : null;
    }).filter(y => y !== null));
    return Array.from(years).sort((a, b) => b - a);
  }, [dbData]);

  const getMonthsForYear = (year) => {
    const months = new Set(
      dbData
      .filter(b => {
        const d = parseDate(b.timestamp);
        return d && d.getFullYear() === year;
      })
      .map(b => parseDate(b.timestamp).getMonth())
    );
    return Array.from(months).sort((a, b) => b - a);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Chart Data Preparation
  const pieData = [
    { name: 'Large', value: activeBatch.large || 0, color: COLORS.large },
    { name: 'Medium', value: activeBatch.medium || 0, color: COLORS.medium },
    { name: 'Small', value: activeBatch.small || 0, color: COLORS.small },
  ];
  
  const qualityData = [{ name: 'Quality', good: activeBatch.quality_good || 0, bad: activeBatch.quality_bad || 0 }];
  
  const formatDate = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return "--:--";
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getPercent = (val) => {
    const total = activeBatch.total || 1;
    return Math.round((val / total) * 100);
  };

  return (
    <div className="analytics-container">
      <div className="analytics-content">
        <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <h1 className="page-title" style={{ margin: 0, textAlign: 'left', fontSize: '1.5rem' }}>
              {viewMode === 'current' ? 'Analytics' : 'Archive'}
            </h1>
            {/* Debug helper: Shows if DB is connected but empty */}
            <span style={{fontSize: '0.7rem', color: '#94a3b8'}}>
              {dbData.length} records found in DB
            </span>
          </div>
          
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', background: '#e2e8f0', padding: '6px 10px', borderRadius: '20px' }}>
            {viewMode === 'current' 
              ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` 
              : (viewMode === 'archive-view' ? `${monthNames[archiveMonth]} ${archiveYear}` : 'Select Date')}
          </span>
        </div>

        {filteredBatches.length > 0 ? (
          <div className="card chart-card">
            <div className="chart-wrapper pie-wrapper" style={{ marginBottom: '2rem' }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', width: '100%' }}>
                {pieData.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: item.color, borderRadius: '50%', marginRight: '8px' }}></span>
                      <strong>{item.name}</strong>
                    </div>
                    <span>{item.value} <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>({getPercent(item.value)}%)</span></span>
                  </div>
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }} />

            <div className="chart-wrapper bar-wrapper">
              <div className="bar-labels" style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{display:'flex', alignItems:'center'}}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: COLORS.good, borderRadius: '2px', marginRight: '8px' }}></span>
                      <span style={{color: '#334155', fontWeight:'bold', fontSize:'0.9rem'}}>Good Quality</span>
                  </div>
                  <span style={{fontWeight:'bold', fontSize:'1rem', color:'#334155'}}>{activeBatch.quality_good || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{display:'flex', alignItems:'center'}}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: COLORS.bad, borderRadius: '2px', marginRight: '8px' }}></span>
                      <span style={{color: '#334155', fontWeight:'bold', fontSize:'0.9rem'}}>Bad Quality</span>
                  </div>
                  <span style={{fontWeight:'bold', fontSize:'1rem', color:'#334155'}}>{activeBatch.quality_bad || 0}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={30}>
                <BarChart layout="vertical" data={qualityData} barSize={30}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Bar dataKey="bad" fill={COLORS.bad} stackId="a" radius={[6, 0, 0, 6]} />
                  <Bar dataKey="good" fill={COLORS.good} stackId="a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          viewMode !== 'archive-menu' && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <FaCalendarAlt size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p>No logs found for this period.</p>
              {dbData.length === 0 && (
                <p style={{fontSize: '0.8rem', color: '#ef4444', marginTop: '10px'}}>
                  (Database is empty or connection failed)
                </p>
              )}
            </div>
          )
        )}

        <div className="card table-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {viewMode !== 'archive-menu' && (
            <>
              <div className="list-container" style={{ flex: 1 }}>
                <div className="list-header">
                  <div className="col-1">BATCH</div>
                  <div className="col-2">DATE/TIME</div>
                  <div className="col-3">TOTAL</div>
                </div>
                <div className="list-body">
                  {filteredBatches.map((batch) => (
                    <BatchRow 
                      key={batch.id} 
                      batch={batch}
                      isSelected={selectedBatchId === batch.id}
                      onClick={setSelectedBatchId}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
              <div className="archive-trigger" style={{ borderTop: '1px solid #f1f5f9', padding: '1rem' }}>
                {viewMode === 'current' ? (
                  <button onClick={() => setViewMode('archive-menu')} style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <FaHistory style={{ marginRight: '8px' }} /> View Past Logs
                  </button>
                ) : (
                  <button onClick={() => { setViewMode('current'); setArchiveYear(null); setArchiveMonth(null); }} style={{ width: '100%', padding: '12px', background: '#1e293b', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <FaArrowLeft style={{ marginRight: '8px' }} /> Back to Live Data
                  </button>
                )}
              </div>
            </>
          )}

          {viewMode === 'archive-menu' && (
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button onClick={() => setViewMode('current')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}><FaArrowLeft /></button>
                <h3 style={{ margin: '0 0 0 10px', fontSize: '1.1rem' }}>Select Archive Date</h3>
              </div>
              {/* Year Selection */}
              {!archiveYear ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {availableYears.length > 0 ? availableYears.map(year => (
                    <button key={year} onClick={() => setArchiveYear(year)} style={{ padding: '15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {year} <FaChevronRight size={12} color="#cbd5e1"/>
                    </button>
                  )) : <div style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>No history available</div>}
                </div>
              ) : (
                /* Month Selection */
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ marginBottom: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#1e40af' }}>
                      <FaCalendarAlt style={{ marginRight: '8px' }} />
                      <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Filtering: {archiveYear}</span>
                    </div>
                    <button onClick={() => setArchiveYear(null)} style={{ background: 'white', border: 'none', borderRadius: '20px', padding: '5px 12px', fontSize: '0.75rem', fontWeight: '600', color: '#2563eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      Change <FaPen size={10} style={{ marginLeft: '4px' }} />
                    </button>
                  </div>
                  {getMonthsForYear(archiveYear).map(monthIndex => (
                    <button key={monthIndex} onClick={() => { setArchiveMonth(monthIndex); setViewMode('archive-view'); }} style={{ padding: '15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', fontWeight: '500', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {monthNames[monthIndex]} <FaChevronRight size={12} color="#cbd5e1"/>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div> 
    </div>
  );
}