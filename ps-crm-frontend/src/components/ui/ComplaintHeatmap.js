// ps-crm-frontend/src/components/ui/ComplaintHeatmap.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API      = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';

const DELHI_CENTER = { lat: 28.6517, lng: 77.2219 };

const DELHI_BOUNDS = {
  north: 28.8830, south: 28.4043,
  east:  77.5490, west:  76.8378,
};

const URGENCY_CONFIG = {
  Critical: { color: '#dc2626', bg: '#fef2f2' },
  High:     { color: '#ea580c', bg: '#fff7ed' },
  Medium:   { color: '#d97706', bg: '#fffbeb' },
  Low:      { color: '#16a34a', bg: '#f0fdf4' },
};

const CAT_ICON = {
  Roads: '', Water: '', Electricity: '', Sanitation: '', Other: '',
};

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.visualization) { resolve(); return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) { existing.onload = resolve; existing.onerror = reject; return; }
    const script    = document.createElement('script');
    script.id       = 'gmaps-script';
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
    script.async    = true;
    script.defer    = true;
    script.onload   = resolve;
    script.onerror  = reject;
    document.head.appendChild(script);
  });
}

export default function ComplaintHeatmap() {
  const mapDivRef    = useRef(null);
  const googleMapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersRef   = useRef([]);
  const infoWinRef   = useRef(null);

  const [heatmapData,   setHeatmapData]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [mapReady,      setMapReady]      = useState(false);
  const [selectedWard,  setSelectedWard]  = useState(null);
  const [showMarkers,   setShowMarkers]   = useState(true);
  const [sortBy,        setSortBy]        = useState('total');
  const [filterUrgency, setFilterUrgency] = useState('All');

  // ── 1. Fetch data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/heatmap/data`);
      setHeatmapData(data);
      setError(null);
    } catch {
      setError('Failed to load heatmap data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── 2. Init Google Map — locked strictly to Delhi ─────────────────────────
  useEffect(() => {
    if (!MAPS_KEY) {
      setError('Google Maps API key not configured. Add REACT_APP_GOOGLE_MAPS_KEY to your .env file.');
      return;
    }
    loadGoogleMaps(MAPS_KEY)
      .then(() => {
        if (!mapDivRef.current || googleMapRef.current) return;

        const bounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(DELHI_BOUNDS.south, DELHI_BOUNDS.west),
          new window.google.maps.LatLng(DELHI_BOUNDS.north, DELHI_BOUNDS.east)
        );

        const map = new window.google.maps.Map(mapDivRef.current, {
          center:  DELHI_CENTER,
          zoom:    11,
          minZoom: 10,
          maxZoom: 16,
          restriction: { latLngBounds: bounds, strictBounds: true },
          mapTypeId:        'roadmap',
          disableDefaultUI: false,
          zoomControl:      true,
          mapTypeControl:   false,
          streetViewControl:false,
          fullscreenControl:true,
          rotateControl:    false,
          styles: [
            { featureType:'poi',             stylers:[{ visibility:'off' }] },
            { featureType:'transit.station', stylers:[{ visibility:'off' }] },
            { featureType:'road', elementType:'labels.icon', stylers:[{ visibility:'off' }] },
            { featureType:'water',        elementType:'geometry', stylers:[{ color:'#b3d9f5' }] },
            { featureType:'landscape',    elementType:'geometry', stylers:[{ color:'#f2f2ef' }] },
            { featureType:'road',         elementType:'geometry', stylers:[{ color:'#ffffff' }] },
            { featureType:'road.arterial',elementType:'geometry', stylers:[{ color:'#ebebeb' }] },
            { featureType:'road.highway', elementType:'geometry', stylers:[{ color:'#ffd966' }] },
            { featureType:'administrative', elementType:'geometry.stroke',
              stylers:[{ color:'#aaaaaa' }, { weight:1.5 }] },
            { featureType:'administrative.locality', elementType:'labels.text.fill',
              stylers:[{ color:'#444444' }] },
            // Grey out everything outside Delhi boundary
            { featureType:'administrative.country', elementType:'geometry.fill',
              stylers:[{ color:'#e8e8e8' }] },
          ],
        });

        infoWinRef.current   = new window.google.maps.InfoWindow();
        googleMapRef.current = map;
        setMapReady(true);
      })
      .catch(() => setError('Failed to load Google Maps. Check your API key.'));
  }, []);

  // ── 3. Draw heatmap layer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !heatmapData || !window.google?.maps?.visualization) return;
    if (heatLayerRef.current) heatLayerRef.current.setMap(null);
    if (!heatmapData.heatmapPoints.length) return;

    const points = heatmapData.heatmapPoints.map(p => ({
      location: new window.google.maps.LatLng(p.lat, p.lng),
      weight:   p.weight,
    }));

    heatLayerRef.current = new window.google.maps.visualization.HeatmapLayer({
      data:    points,
      map:     googleMapRef.current,
      radius:  55,
      opacity: 0.82,
      gradient: [
        'rgba(0,   255,  0,   0)',
        'rgba(0,   255,  0,   1)',
        'rgba(173, 255,  47,  1)',
        'rgba(255, 255,  0,   1)',
        'rgba(255, 165,  0,   1)',
        'rgba(255, 69,   0,   1)',
        'rgba(220, 38,   38,  1)',
      ],
    });
  }, [mapReady, heatmapData]);

  // ── 4. Draw ward markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !heatmapData || !window.google) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (!showMarkers) return;

    heatmapData.wardDetails.forEach(ward => {
      const cfg   = URGENCY_CONFIG[ward.urgencyLevel] || URGENCY_CONFIG.Low;
      const scale = Math.max(13, Math.min(26, 11 + ward.total * 1.5));

      const marker = new window.google.maps.Marker({
        position: { lat: ward.lat, lng: ward.lng },
        map:      googleMapRef.current,
        title:    `${ward.ward} — ${ward.total} complaints`,
        icon: {
          path:         window.google.maps.SymbolPath.CIRCLE,
          scale,
          fillColor:    cfg.color,
          fillOpacity:  0.92,
          strokeColor:  '#ffffff',
          strokeWeight: 2.5,
        },
        // Show complaint count on the marker bubble
        label: {
          text:      String(ward.total),
          color:     '#ffffff',
          fontSize:  '11px',
          fontWeight:'700',
        },
        zIndex: ward.total,
      });

      marker.addListener('click', () => {
        setSelectedWard(ward);
        infoWinRef.current.setContent(buildInfoHTML(ward));
        infoWinRef.current.open(googleMapRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [mapReady, heatmapData, showMarkers]);

  // ── InfoWindow HTML ───────────────────────────────────────────────────────
  const buildInfoHTML = (ward) => {
    const cfg = URGENCY_CONFIG[ward.urgencyLevel] || URGENCY_CONFIG.Low;
    return `
      <div style="font-family:'Segoe UI',sans-serif;padding:6px 2px;min-width:210px;max-width:240px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <strong style="font-size:14px;color:#0f172a;">${ward.ward}</strong>
          <span style="background:${cfg.color};color:#fff;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;">${ward.urgencyLevel}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:12px;margin-bottom:10px;">
          <div style="background:#f8fafc;border-radius:8px;padding:6px 8px;">
            <div style="color:#94a3b8;font-size:10px;">TOTAL</div>
            <div style="font-weight:700;font-size:17px;color:#1a56db;">${ward.total}</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:6px 8px;">
            <div style="color:#94a3b8;font-size:10px;">RESOLVED</div>
            <div style="font-weight:700;font-size:17px;color:#16a34a;">${ward.resolved}</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:6px 8px;">
            <div style="color:#94a3b8;font-size:10px;">PENDING</div>
            <div style="font-weight:700;font-size:17px;color:#d97706;">${ward.pending}</div>
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:6px 8px;">
            <div style="color:#94a3b8;font-size:10px;">ESCALATED</div>
            <div style="font-weight:700;font-size:17px;color:#dc2626;">${ward.escalated}</div>
          </div>
        </div>
        <div style="font-size:11px;color:#475569;border-top:1px solid #f1f5f9;padding-top:8px;display:flex;justify-content:space-between;">
          <span>${CAT_ICON[ward.topCategory] || ''} ${ward.topCategory}</span>
          <span style="color:#16a34a;font-weight:600;">${ward.resolutionRate}% resolved</span>
        </div>
      </div>`;
  };

  const flyToWard = (ward) => {
    if (!googleMapRef.current) return;
    googleMapRef.current.panTo({ lat: ward.lat, lng: ward.lng });
    googleMapRef.current.setZoom(14);
    setSelectedWard(ward);
  };

  const sortedWards = heatmapData
    ? [...heatmapData.wardDetails]
        .filter(w => filterUrgency === 'All' || w.urgencyLevel === filterUrgency)
        .sort((a, b) =>
          sortBy === 'total'      ? b.total - a.total :
          sortBy === 'urgency'    ? b.weightedScore - a.weightedScore :
          b.resolutionRate - a.resolutionRate)
    : [];

  return (
    <div style={S.root}>
      <style>{`
        @keyframes hmSpin { to { transform:rotate(360deg); } }
        .wcard:hover { border-color:#1a56db !important; box-shadow:0 2px 12px rgba(26,86,219,0.13) !important; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Complaint Heatmap — Delhi</h2>
          <p style={S.subtitle}>Locality-wise complaint density and urgency</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
          <label style={S.toggleLabel}>
            <input type="checkbox" checked={showMarkers}
              onChange={e => setShowMarkers(e.target.checked)}
              style={{ marginRight:'6px', accentColor:'#1a56db' }} />
            Show markers
          </label>
          <button onClick={fetchData} style={S.refreshBtn}> Refresh</button>
        </div>
      </div>

      {/* Summary pills */}
      {heatmapData && (
        <div style={S.pills}>
          {[
            { label:'Total Complaints', value: heatmapData.summary.totalComplaints, color:'#1a56db' },
            { label:'Resolved',         value: heatmapData.summary.totalResolved,   color:'#16a34a' },
            { label:'Escalated',        value: heatmapData.summary.totalEscalated,  color:'#dc2626' },
            { label:'Active Areas',     value: heatmapData.summary.activeWards,     color:'#7c3aed' },
            { label:'Resolution Rate',  value:`${heatmapData.summary.resolutionRate}%`, color:'#0891b2' },
          ].map(p => (
            <div key={p.label} style={S.pill}>
              <span style={{ fontSize:'22px', fontWeight:700, color:p.color, lineHeight:1 }}>{p.value}</span>
              <span style={{ fontSize:'11px', color:'#94a3b8', fontWeight:500, marginTop:'3px' }}>{p.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map + Sidebar */}
      <div style={S.body}>

        {/* Map */}
        <div style={S.mapWrapper}>
          {loading && (
            <div style={S.overlay}>
              <div style={S.spinner} />
              <p style={{ color:'#64748b', fontSize:'14px', marginTop:'14px' }}>Loading Delhi heatmap…</p>
            </div>
          )}
          {error && (
            <div style={S.overlay}>
              <div style={{ fontSize:'36px', marginBottom:'12px' }}></div>
              <p style={{ color:'#dc2626', fontSize:'13.5px', textAlign:'center', maxWidth:'300px', lineHeight:1.5 }}>{error}</p>
              <button onClick={fetchData} style={{ ...S.refreshBtn, marginTop:'14px' }}>Retry</button>
            </div>
          )}
          {!loading && !error && heatmapData?.wardDetails.length === 0 && (
            <div style={{ ...S.overlay, background:'rgba(248,250,252,0.88)' }}>
              <div style={{ fontSize:'36px', marginBottom:'10px' }}></div>
              <p style={{ color:'#475569', fontSize:'13px', textAlign:'center', maxWidth:'280px', lineHeight:1.6 }}>
                No complaints with location data found yet.<br/>
                Complaints will appear here as they are filed.
              </p>
            </div>
          )}

          <div ref={mapDivRef} style={{ width:'100%', height:'100%', borderRadius:'16px' }} />

          {/* Legend */}
          <div style={S.legend}>
            <div style={S.legendTitle}>COMPLAINT DENSITY</div>
            <div style={S.legendBar} />
            <div style={S.legendLabels}><span>Low</span><span>High</span></div>
            <div style={{ marginTop:'10px', paddingTop:'8px', borderTop:'1px solid #e2e8f0' }}>
              {Object.entries(URGENCY_CONFIG).map(([level, cfg]) => (
                <div key={level} style={{ display:'flex', alignItems:'center', gap:'7px', marginTop:'5px' }}>
                  <span style={{ width:'9px', height:'9px', borderRadius:'50%', background:cfg.color, flexShrink:0, display:'inline-block' }} />
                  <span style={{ fontSize:'11.5px', color:'#374151' }}>{level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={S.sidebar}>
          <div style={{ display:'flex', flexDirection:'column', gap:'7px', flexShrink:0 }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={S.select}>
              <option value="total">Sort: Most Complaints</option>
              <option value="urgency">Sort: Highest Urgency</option>
              <option value="resolution">Sort: Best Resolution</option>
            </select>
            <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} style={S.select}>
              <option value="All">All Urgency Levels</option>
              <option value="Critical"> Critical</option>
              <option value="High"> High</option>
              <option value="Medium"> Medium</option>
              <option value="Low"> Low</option>
            </select>
          </div>

          <div style={S.wardList}>
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px 16px', color:'#94a3b8', fontSize:'13px' }}>Loading…</div>
            ) : sortedWards.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 16px', color:'#94a3b8', fontSize:'13px', lineHeight:1.6 }}>
                {filterUrgency !== 'All' ? `No ${filterUrgency} urgency areas.` : 'No data yet.'}
              </div>
            ) : sortedWards.map(ward => {
              const cfg        = URGENCY_CONFIG[ward.urgencyLevel] || URGENCY_CONFIG.Low;
              const isSelected = selectedWard?.ward === ward.ward;
              return (
                <div key={ward.ward} className="wcard" onClick={() => flyToWard(ward)}
                  style={{
                    background:   isSelected ? cfg.bg : '#fff',
                    border:       `1.5px solid ${isSelected ? cfg.color : '#e2e8f0'}`,
                    borderRadius: '12px', padding:'11px 13px',
                    cursor:'pointer', transition:'all 0.15s',
                    boxShadow: isSelected ? `0 0 0 3px ${cfg.color}22` : 'none',
                  }}>
                  {/* Top row */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'7px' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'13.5px', color:'#0f172a' }}>{ward.ward}</div>
                      <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>
                        {ward.highUrgency > 0 && <span style={{ color:'#dc2626', marginRight:'6px' }}> {ward.highUrgency} High</span>}
                        {ward.medUrgency  > 0 && <span style={{ color:'#d97706', marginRight:'6px' }}> {ward.medUrgency} Med</span>}
                        {ward.lowUrgency  > 0 && <span style={{ color:'#16a34a' }}> {ward.lowUrgency} Low</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ background:cfg.color, color:'#fff', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'99px', display:'inline-block' }}>
                        {ward.urgencyLevel}
                      </span>
                      <div style={{ fontSize:'20px', fontWeight:800, color:cfg.color, lineHeight:1.1, marginTop:'2px' }}>
                        {ward.total}
                      </div>
                    </div>
                  </div>

                  {/* Status chips */}
                  <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'8px' }}>
                    <span style={S.chip}> {ward.pending}</span>
                    <span style={S.chip}> {ward.inProgress}</span>
                    <span style={{ ...S.chip, color:'#16a34a' }}> {ward.resolved}</span>
                    {ward.escalated > 0 && <span style={{ ...S.chip, color:'#dc2626' }}> {ward.escalated}</span>}
                  </div>

                  {/* Resolution bar */}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10.5px', color:'#94a3b8', marginBottom:'3px' }}>
                    <span>{CAT_ICON[ward.topCategory] || ''} {ward.topCategory}</span>
                    <span>{ward.resolutionRate}% resolved</span>
                  </div>
                  <div style={{ height:'4px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden' }}>
                    <div style={{ width:`${ward.resolutionRate}%`, height:'100%', background:cfg.color, borderRadius:'99px', transition:'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  root:        { fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#f8fafc', borderRadius:'20px', padding:'24px', display:'flex', flexDirection:'column', gap:'18px' },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' },
  title:       { margin:0, fontSize:'21px', fontWeight:700, color:'#0f172a', letterSpacing:'-0.3px' },
  subtitle:    { margin:'3px 0 0', fontSize:'13px', color:'#64748b' },
  refreshBtn:  { padding:'7px 14px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit' },
  toggleLabel: { display:'flex', alignItems:'center', fontSize:'13px', color:'#374151', cursor:'pointer', userSelect:'none' },
  pills:       { display:'flex', gap:'10px', flexWrap:'wrap' },
  pill:        { background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'12px 16px', display:'flex', flexDirection:'column', flex:'1', minWidth:'90px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' },
  body:        { display:'flex', gap:'16px', minHeight:'540px' },
  mapWrapper:  { flex:1, position:'relative', borderRadius:'16px', overflow:'hidden', border:'1px solid #e2e8f0', background:'#e5e7eb', minHeight:'540px' },
  overlay:     { position:'absolute', inset:0, zIndex:10, background:'rgba(248,250,252,0.93)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', borderRadius:'16px' },
  spinner:     { width:'36px', height:'36px', borderRadius:'50%', border:'3px solid #e2e8f0', borderTopColor:'#1a56db', animation:'hmSpin 0.8s linear infinite' },
  legend:      { position:'absolute', bottom:'20px', left:'14px', zIndex:5, background:'#fff', borderRadius:'12px', padding:'12px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.13)', minWidth:'138px', border:'1px solid #e2e8f0' },
  legendTitle: { fontSize:'10px', fontWeight:700, color:'#374151', marginBottom:'7px', letterSpacing:'0.7px' },
  legendBar:   { height:'8px', borderRadius:'99px', background:'linear-gradient(to right,rgba(0,255,0,0.9),rgba(255,255,0,1),rgba(255,165,0,1),rgba(220,38,38,1))', marginBottom:'4px' },
  legendLabels:{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#94a3b8' },
  sidebar:     { width:'295px', flexShrink:0, display:'flex', flexDirection:'column', gap:'10px' },
  select:      { width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1.5px solid #e2e8f0', background:'#fff', fontSize:'12.5px', color:'#374151', cursor:'pointer', fontFamily:'inherit', outline:'none' },
  wardList:    { flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'7px', paddingRight:'2px' },
  chip:        { fontSize:'11px', color:'#475569', background:'#f1f5f9', padding:'2px 7px', borderRadius:'99px' },
};