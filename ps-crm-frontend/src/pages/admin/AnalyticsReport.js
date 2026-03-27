import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';
import { Sidebar } from './ComplaintsList';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';

const COLORS = ['#0F2557', '#E8620A', '#1B7A3E', '#1565C0', '#8B5CF6', '#DB2777'];

// ── Heatmap intensity colours (white → deep red) ──────────────────────────
const heatColor = (value, max) => {
  if (!value || !max) return '#F0F4FB';
  const ratio = value / max;
  if (ratio === 0)    return '#F0F4FB';
  if (ratio < 0.2)    return '#FEF3C7';
  if (ratio < 0.4)    return '#FDE68A';
  if (ratio < 0.6)    return '#FCA5A5';
  if (ratio < 0.8)    return '#F87171';
  return '#DC2626';
};

const heatLabel = (ratio) => {
  if (ratio < 0.2) return { text: 'Low',     color: '#D97706' };
  if (ratio < 0.5) return { text: 'Medium',  color: '#EA580C' };
  if (ratio < 0.8) return { text: 'High',    color: '#DC2626' };
  return              { text: 'Critical', color: '#991B1B' };
};

export default function AnalyticsReport() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [exporting, setExporting] = useState(false);
  const [heatView, setHeatView]   = useState('total');   // 'total' | 'category' | 'urgency'
  const [heatCategory, setHeatCategory] = useState('Roads');

  // ── Also fetch all complaints for heatmap cross-analysis ──
  const [allComplaints, setAllComplaints] = useState([]);

  useEffect(() => {
    API.get('/dashboard')
      .then(res => { setStats(res.data.data); setLoading(false); })
      .catch(() => { setError('Failed to load analytics. Make sure backend is running.'); setLoading(false); });

    API.get('/complaints')
      .then(res => setAllComplaints(res.data.data || []))
      .catch(() => {});
  }, []);

  // ── Build heatmap data from byWard + allComplaints ────────────────────────
  const buildHeatData = () => {
    if (!stats?.byWard) return [];

    if (heatView === 'total') {
      return stats.byWard
        .filter(w => w._id)
        .sort((a, b) => b.count - a.count);
    }

    if (heatView === 'category') {
      // Group allComplaints by ward × category
      const wardMap = {};
      allComplaints.forEach(c => {
        const ward = c.location?.ward || 'Unknown';
        if (!wardMap[ward]) wardMap[ward] = {};
        const cat = c.category || 'Other';
        wardMap[ward][cat] = (wardMap[ward][cat] || 0) + 1;
      });
      return Object.entries(wardMap)
        .map(([ward, cats]) => ({ _id: ward, count: cats[heatCategory] || 0 }))
        .filter(w => w._id !== 'Unknown')
        .sort((a, b) => b.count - a.count);
    }

    if (heatView === 'urgency') {
      const wardMap = {};
      allComplaints.forEach(c => {
        const ward = c.location?.ward || 'Unknown';
        if (!wardMap[ward]) wardMap[ward] = { High: 0, Medium: 0, Low: 0 };
        wardMap[ward][c.urgency] = (wardMap[ward][c.urgency] || 0) + 1;
      });
      return Object.entries(wardMap)
        .map(([ward, u]) => ({ _id: ward, count: u.High * 3 + u.Medium * 2 + u.Low, High: u.High, Medium: u.Medium, Low: u.Low }))
        .filter(w => w._id !== 'Unknown')
        .sort((a, b) => b.count - a.count);
    }

    return [];
  };

  const heatData = buildHeatData();
  const heatMax  = Math.max(...heatData.map(w => w.count), 1);

  const resolutionRate = stats
    ? ((stats.overview.resolved / (stats.overview.total || 1)) * 100).toFixed(1)
    : 0;

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const content = `
PS-CRM ANALYTICS REPORT
Generated: ${new Date().toLocaleString('en-IN')}
========================

OVERVIEW
--------
Total Complaints : ${stats?.overview.total}
Pending          : ${stats?.overview.pending}
In Progress      : ${stats?.overview.inProgress}
Resolved         : ${stats?.overview.resolved}
Resolution Rate  : ${resolutionRate}%

BY CATEGORY
-----------
${stats?.byCategory.map(c => `${c._id.padEnd(20)} : ${c.count}`).join('\n')}

BY URGENCY
----------
${stats?.byUrgency.map(u => `${u._id.padEnd(20)} : ${u.count}`).join('\n')}

WARD HEATMAP (Total Complaints)
--------------------------------
${stats?.byWard.map(w => `${(w._id || 'Unknown').padEnd(20)} : ${w.count} complaints`).join('\n')}

DAILY TREND (Last 7 Days)
-------------------------
${stats?.dailyTrend.map(d => `${d._id} : ${d.count} complaints`).join('\n')}
      `.trim();

      const blob = new Blob([content], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `PSCRM_Report_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 1200);
  };

  return (
    <div style={styles.layout}>
      <Sidebar navigate={navigate} logout={logout} user={user} active="analytics" />

      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>📈 Analytics Report</h1>
            <p style={styles.pageSub}>Comprehensive insights and performance metrics</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button style={styles.btnExport} onClick={handleExport} disabled={exporting || !stats}>
              {exporting ? '⏳ Exporting...' : '⬇️ Export Report'}
            </button>
            <div style={styles.adminChip}>
              <div style={styles.chipAvatar}>{user?.name?.charAt(0)}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7FA3', fontSize: 16 }}>⏳ Loading analytics...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <div style={{ color: '#DC2626', fontSize: 16, fontWeight: 600 }}>{error}</div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={styles.kpiRow}>
              {[
                { icon: '📋', label: 'Total Complaints', value: stats.overview.total,      sub: 'All time',        color: '#0F2557', bg: '#EEF2FF' },
                { icon: '✅', label: 'Resolution Rate',  value: `${resolutionRate}%`,       sub: `${stats.overview.resolved} resolved`, color: '#16A34A', bg: '#DCFCE7' },
                { icon: '⏳', label: 'Pending',          value: stats.overview.pending,     sub: 'Awaiting action', color: '#D97706', bg: '#FEF3C7' },
                { icon: '🔄', label: 'In Progress',      value: stats.overview.inProgress,  sub: 'Being resolved',  color: '#2563EB', bg: '#DBEAFE' },
                { icon: '⚡', label: 'Avg Resolution',   value: stats.avgResponse != null ? `${(stats.avgResponse / 24).toFixed(1)}d` : 'N/A', sub: 'Average days',    color: '#8B5CF6', bg: '#F3E8FF' },
                { icon: '📈', label: 'Monthly Growth',  value: stats.monthlyGrowth != null ? `${stats.monthlyGrowth >= 0 ? '+' : ''}${stats.monthlyGrowth}%` : 'N/A', sub: '30-day trend', color: '#1B7A3E', bg: '#DCFCE7' },
                { icon: '⭐', label: 'Citizen Satisfaction', value: stats.citizenSatisfaction != null ? `${stats.citizenSatisfaction}/5` : 'N/A', sub: 'Average Rating', color: '#F59E0B', bg: '#FEF3C7' },
                { icon: '🚨', label: 'Escalated',
                  value: `${stats.escalatedRate || 0}%`, sub: 'SLA breached', color: '#DC2626', bg: '#FEE2E2' },
              ].map((k, i) => (
                <div key={i} style={styles.kpiCard}>
                  <div style={{ ...styles.kpiIcon, background: k.bg }}>{k.icon}</div>
                  <div style={{ ...styles.kpiValue, color: k.color }}>{k.value}</div>
                  <div style={styles.kpiLabel}>{k.label}</div>
                  <div style={styles.kpiSub}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Area Chart */}
            <div style={styles.wideCard}>
              <div style={styles.cardTitle}>📅 Complaint Volume Trend</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.dailyTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0F2557" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0F2557" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="count" stroke="#0F2557" strokeWidth={2}
                    fill="url(#colorCount)" dot={{ fill: '#0F2557', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Charts Row 1 */}
            <div style={styles.chartsRow}>
              <div style={styles.chartCard}>
                <div style={styles.cardTitle}>📊 Complaints by Category</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.byCategory} barSize={28}>
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#6B7FA3' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7FA3' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stats.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <div style={styles.cardTitle}>🎯 Status Breakdown</div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending',     value: stats.overview.pending },
                        { name: 'In Progress', value: stats.overview.inProgress },
                        { name: 'Resolved',    value: stats.overview.resolved },
                      ]}
                      dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {['#D97706', '#2563EB', '#16A34A'].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={styles.chartsRow}>
              <div style={styles.chartCard}>
                <div style={styles.cardTitle}>⚡ Urgency Distribution</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.byUrgency} barSize={40}>
                    <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {stats.byUrgency.map(entry => (
                        <Cell key={entry._id}
                          fill={entry._id === 'High' ? '#DC2626' : entry._id === 'Medium' ? '#D97706' : '#16A34A'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <div style={styles.cardTitle}>📍 Top Wards by Complaints</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.byWard.slice(0, 6)} layout="vertical" barSize={18}>
                    <XAxis type="number"   tick={{ fontSize: 11, fill: '#6B7FA3' }} />
                    <YAxis dataKey="_id" type="category" tick={{ fontSize: 11, fill: '#6B7FA3' }} width={70} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                    <Bar dataKey="count" fill="#1565C0" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                WARD HEATMAP
            ══════════════════════════════════════════════════════════ */}
            <div style={styles.wideCard}>
              {/* Heatmap Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={styles.cardTitle}>🔥 Ward-wise Complaint Heatmap</div>
                  <div style={{ fontSize: 12, color: '#6B7FA3', marginTop: -10 }}>
                    Identify hotspot wards requiring immediate attention
                  </div>
                </div>

                {/* View toggles */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {[
                    { key: 'total',    label: '📊 Total' },
                    { key: 'category', label: '🏷️ By Category' },
                    { key: 'urgency',  label: '⚡ By Urgency' },
                  ].map(v => (
                    <button key={v.key} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                      background: heatView === v.key ? '#0F2557' : '#F0F4FB',
                      color:      heatView === v.key ? '#fff'    : '#6B7FA3',
                      border:     heatView === v.key ? 'none'    : '1.5px solid #E8EEF8',
                    }} onClick={() => setHeatView(v.key)}>{v.label}</button>
                  ))}

                  {heatView === 'category' && (
                    <select style={{ padding: '6px 12px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: '#fff', color: '#0F2557' }}
                      value={heatCategory} onChange={e => setHeatCategory(e.target.value)}>
                      {['Roads', 'Water', 'Electricity', 'Sanitation', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                <span style={{ fontSize: 11, color: '#9EB3CC', marginRight: 4 }}>Intensity:</span>
                {[
                  { bg: '#F0F4FB', label: 'None' },
                  { bg: '#FEF3C7', label: 'Low' },
                  { bg: '#FDE68A', label: 'Moderate' },
                  { bg: '#FCA5A5', label: 'High' },
                  { bg: '#F87171', label: 'Very High' },
                  { bg: '#DC2626', label: 'Critical' },
                ].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: l.bg, border: '1px solid rgba(0,0,0,0.08)' }} />
                    <span style={{ fontSize: 11, color: '#6B7FA3' }}>{l.label}</span>
                    {i < 5 && <div style={{ width: 1, height: 14, background: '#E8EEF8', margin: '0 4px' }} />}
                  </div>
                ))}
              </div>

              {/* Heatmap Grid */}
              {heatData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9EB3CC', fontSize: 13 }}>
                  📭 No ward data available yet
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {heatData.map((ward, i) => {
                    const ratio    = ward.count / heatMax;
                    const bg       = heatColor(ward.count, heatMax);
                    const textDark = ratio > 0.6;
                    const lbl      = heatLabel(ratio);
                    return (
                      <div key={i} style={{
                        background: bg,
                        borderRadius: 10,
                        padding: '14px 16px',
                        border: '1.5px solid rgba(0,0,0,0.06)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        cursor: 'default',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>

                        {/* Ward rank badge */}
                        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, fontWeight: 700, color: textDark ? 'rgba(255,255,255,0.6)' : '#9EB3CC' }}>
                          #{i + 1}
                        </div>

                        {/* Ward name */}
                        <div style={{ fontSize: 15, fontWeight: 800, color: textDark ? '#fff' : '#0F2557', marginBottom: 4, lineHeight: 1.2 }}>
                          {ward._id || 'Unknown'}
                        </div>

                        {/* Count */}
                        <div style={{ fontSize: 22, fontWeight: 900, color: textDark ? '#fff' : '#0F2557', marginBottom: 6 }}>
                          {ward.count}
                        </div>

                        {/* Sub label */}
                        <div style={{ fontSize: 10, color: textDark ? 'rgba(255,255,255,0.8)' : '#6B7FA3', marginBottom: 8 }}>
                          {heatView === 'total'    ? 'complaints' :
                           heatView === 'category' ? heatCategory :
                           'urgency score'}
                        </div>

                        {/* Urgency breakdown (urgency view only) */}
                        {heatView === 'urgency' && ward.High !== undefined && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[['H', ward.High, '#DC2626'], ['M', ward.Medium, '#D97706'], ['L', ward.Low, '#16A34A']].map(([key, val, color]) => (
                              <div key={key} style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.3)', borderRadius: 4, padding: '2px 0' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: textDark ? '#fff' : color }}>{key}</div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: textDark ? '#fff' : '#0F2557' }}>{val}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Heat intensity label */}
                        <div style={{ marginTop: 6, display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                          background: textDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                          color: textDark ? '#fff' : lbl.color }}>
                          {lbl.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary bar below heatmap */}
              {heatData.length > 0 && (
                <div style={{ marginTop: 20, padding: '14px 18px', background: '#F8FAFC', borderRadius: 10, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#9EB3CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Wards</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F2557' }}>{heatData.length}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#9EB3CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Hotspot Ward</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>{heatData[0]?._id || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#9EB3CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Max Complaints</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>{heatMax}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#9EB3CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Critical Wards</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626' }}>
                      {heatData.filter(w => w.count / heatMax >= 0.8).length}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#9EB3CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Low Activity</span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>
                      {heatData.filter(w => w.count / heatMax < 0.2).length}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Table */}
            <div style={styles.wideCard}>
              <div style={{ ...styles.cardTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏆 Category Performance Summary</span>
                <button style={styles.btnExport} onClick={handleExport} disabled={exporting}>{exporting ? '⏳' : '⬇️ Export'}</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Category', 'Total', 'Share', 'Performance'].map(h => <th key={h} style={styles.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {stats.byCategory.map((c, i) => {
                    const pct = ((c.count / stats.overview.total) * 100).toFixed(1);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F0F4FB' }}>
                        <td style={styles.td}><span style={{ fontWeight: 700, color: '#0F2557' }}>{c._id}</span></td>
                        <td style={styles.td}><strong>{c.count}</strong></td>
                        <td style={styles.td}>{pct}%</td>
                        <td style={{ ...styles.td, width: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: '#F0F4FB', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 12, color: '#6B7FA3', minWidth: 36 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  layout:      { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" },
  main:        { marginLeft: 260, flex: 1, padding: '32px', background: '#F4F6FB', minHeight: '100vh' },
  topbar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E8EEF8' },
  pageTitle:   { fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557' },
  pageSub:     { color: '#6B7FA3', fontSize: 13, marginTop: 4 },
  adminChip:   { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.08)' },
  chipAvatar:  { width: 28, height: 28, borderRadius: '50%', background: '#0F2557', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  btnExport:   { padding: '9px 18px', background: '#0F2557', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  kpiRow:      { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 16, marginBottom: 24 },
  kpiCard:     { background: '#fff', borderRadius: 12, padding: '20px 16px', boxShadow: '0 2px 8px rgba(15,37,87,0.06)', textAlign: 'center' },
  kpiIcon:     { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 10px' },
  kpiValue:    { fontSize: 26, fontWeight: 700, marginBottom: 4 },
  kpiLabel:    { fontSize: 12, color: '#0F2557', fontWeight: 600, marginBottom: 2 },
  kpiSub:      { fontSize: 11, color: '#6B7FA3' },
  wideCard:    { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', marginBottom: 24 },
  chartsRow:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard:   { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  cardTitle:   { fontSize: 15, fontWeight: 700, color: '#0F2557', marginBottom: 16 },
  th:          { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7FA3', textTransform: 'uppercase', letterSpacing: 0.5 },
  td:          { padding: '14px 16px', fontSize: 14, color: '#3A4E70' },
};