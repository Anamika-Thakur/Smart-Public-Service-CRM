import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useLang, tx } from '../../context/LanguageContext';
import LanguageToggle from '../../components/layout/LanguageToggle';

const COLORS = ['#0F2557', '#E8620A', '#1B7A3E', '#1565C0', '#8B5CF6', '#DB2777'];
const ALL_WARDS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

// ── Heatmap Cell ─────────────────────────────────────────────────────────────
function HeatCell({ ward, count, max }) {
  const intensity = max > 0 ? count / max : 0;
  const getColor = (i) => {
    if (i === 0)       return { bg: '#F0F4FB', text: '#9EB3CC' };
    if (i < 0.2)       return { bg: '#DBEAFE', text: '#1565C0' };
    if (i < 0.4)       return { bg: '#93C5FD', text: '#1D4ED8' };
    if (i < 0.6)       return { bg: '#F59E0B', text: '#fff' };
    if (i < 0.8)       return { bg: '#EF4444', text: '#fff' };
    return               { bg: '#7F1D1D', text: '#fff' };
  };
  const { bg, text } = getColor(intensity);
  return (
    <div style={{
      width: 64, height: 64, borderRadius: 10, background: bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      cursor: count > 0 ? 'pointer' : 'default',
      boxShadow: count > 0 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
      transition: 'transform 0.15s',
      position: 'relative',
    }}
      title={`Ward ${ward}: ${count} complaints`}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: text }}>W-{ward}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: text, marginTop: 2 }}>{count}</div>
    </div>
  );
}

export default function PublicDashboard() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sortWard, setSortWard] = useState('count'); // 'count' | 'alpha'

  useEffect(() => {
    let intervalId;

    const fetchStats = () => {
      setLoading(true);
      fetch('http://localhost:5000/api/dashboard/public')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStats(data.data);
            setLastUpdated(new Date());
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    };

    fetchStats();
    intervalId = setInterval(fetchStats, 30000); // refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const resolutionRate = stats ? ((stats.resolved / (stats.total || 1)) * 100).toFixed(1) : 0;

  // Build full ward map — all 26 wards, 0 if no data
  const wardMap = {};
  ALL_WARDS.forEach(w => { wardMap[`Ward ${w}`] = 0; });
  stats?.byWard?.filter(w => w._id).forEach(w => { wardMap[w._id] = w.count; });

  const wardData = Object.entries(wardMap)
    .map(([ward, complaints]) => ({ ward, complaints }))
    .sort((a, b) => sortWard === 'count' ? b.complaints - a.complaints : a.ward.localeCompare(b.ward));

  const activeWards  = wardData.filter(w => w.complaints > 0);
  const maxCount     = Math.max(...wardData.map(w => w.complaints), 1);
  const totalWardComplaints = wardData.reduce((s, w) => s + w.complaints, 0);

  const trendData = stats?.dailyTrend
    ? stats.dailyTrend.map(d => ({
        month: d._id?.slice(5),
        complaints: d.count,
        resolved: Math.round(d.count * (parseFloat(resolutionRate) / 100)),
      }))
    : [];

  const tabKeys   = ['overview', 'categories', 'wards', 'trends'];
  const tabLabels = ['Overview', 'Categories', 'Wards', 'Trends'];

  return (
    <div style={styles.page}>
      {/* Top Bar */}
      <div style={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {['#FF9933', '#FFF', '#138808'].map(c => (
              <div key={c} style={{ width: 4, height: 14, borderRadius: 1, background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
            {tx('Government of Delhi · Public Transparency Dashboard', lang)}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {tx('Last updated', lang)}: {lastUpdated ? lastUpdated.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN') : tx('Loading...', lang)}
        </span>
      </div>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand} onClick={() => navigate('/')}>
          <div style={styles.emblem}>🏛️</div>
          <div>
            <div style={styles.brandMain}>{tx('PS-CRM Public Dashboard', lang)}</div>
            <div style={styles.brandSub}>{tx('Transparency & Accountability Portal', lang)}</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {tabKeys.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ ...styles.tabBtn, ...(activeTab === t ? styles.tabBtnActive : {}) }}>
              {tx(tabLabels[i], lang)}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <button style={styles.btnOutline} onClick={() => window.history.back()}>{'<'} {tx('Back', lang)}</button>
          <LanguageToggle style={{ border: '1.5px solid #0F2557', background: 'rgba(15,37,87,0.08)', color: '#0F2557' }} />
          <button style={styles.btnOutline} onClick={() => navigate('/citizen/track')}>🔍 {tx('Track', lang)}</button>
          <button style={styles.btnOutline} onClick={() => navigate('/')}>🏠 {tx('Home', lang)}</button>
        </div>
      </header>

      {/* Hero Banner */}
      <div style={styles.heroBanner}>
        <div style={styles.heroInner}>
          <div>
            <div style={styles.liveChip}>
              <span style={styles.liveDot} />
              {tx('LIVE DATA', lang)}
            </div>
            <h1 style={styles.heroTitle}>{tx('Public Grievance Transparency Report', lang)}</h1>
            <p style={styles.heroSub}>
              {tx('Real-time complaint statistics for citizen accountability and government transparency', lang)}
            </p>
          </div>
          <div style={styles.platformPanel}>
            <div style={styles.platformHeader}>
              <span style={styles.platformDot} />
              {tx('PLATFORM STATISTICS · LIVE', lang)}
            </div>
            {loading ? (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '20px 0' }}>⏳ {tx('Loading...', lang)}</div>
            ) : stats ? (
              <>
                <div style={styles.platformGrid}>
                  {[
                    { n: (stats.total || 0).toLocaleString(), l: tx('Complaints Tracked', lang) },
                    { n: `${resolutionRate}%`,                 l: tx('Resolution Rate', lang) },
                    { n: stats.resolved || 0,                  l: tx('Resolved', lang) },
                    { n: stats.pending  || 0,                  l: tx('Pending', lang) },
                  ].map((s, i) => (
                    <div key={i} style={styles.platformStat}>
                      <div style={styles.platformStatN}>{s.n}</div>
                      <div style={styles.platformStatL}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={styles.platformChannelsLabel}>{tx('SUBMISSION CHANNELS', lang)}</div>
                <div style={styles.platformChannels}>
                  {[{ icon: '🌐', label: tx('Web', lang) }, { icon: '📱', label: tx('App', lang) }, { icon: '💬', label: 'WhatsApp' }, { icon: '📩', label: 'SMS' }].map((ch, i) => (
                    <div key={i} style={styles.channelChip}>
                      <span style={{ fontSize: 20 }}>{ch.icon}</span>
                      <span style={styles.channelLabel}>{ch.label}</span>
                    </div>
                  ))}
                </div>
                <div style={styles.otpNote}>{tx('🔒 OTP-verified login to file & manage complaints', lang)}</div>
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, padding: '20px 0' }}>
                ⚠️ {lang === 'hi' ? 'डेटा लोड नहीं हो सका' : 'Could not load data'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.container}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7FA3' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{tx('Loading...', lang)}</div>
          </div>
        ) : !stats ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#6B7FA3' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {lang === 'hi' ? 'बैकएंड से डेटा नहीं मिला।' : 'Could not fetch data. Make sure backend is running.'}
            </div>
          </div>
        ) : (
          <>
            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && (
              <>
                <div style={styles.cardsRow}>
                  {[
                    { icon: '📋', label: tx('Total Complaints', lang), value: stats.total,      color: '#0F2557', bg: '#EEF2FF', pct: 100 },
                    { icon: '⏳', label: tx('Pending', lang),           value: stats.pending,    color: '#D97706', bg: '#FEF3C7', pct: stats.total ? ((stats.pending    / stats.total) * 100).toFixed(0) : 0 },
                    { icon: '🔄', label: tx('In Progress', lang),       value: stats.inProgress, color: '#2563EB', bg: '#DBEAFE', pct: stats.total ? ((stats.inProgress / stats.total) * 100).toFixed(0) : 0 },
                    { icon: '✅', label: tx('Resolved', lang),           value: stats.resolved,   color: '#16A34A', bg: '#DCFCE7', pct: stats.total ? ((stats.resolved   / stats.total) * 100).toFixed(0) : 0 },
                  ].map((c, i) => (
                    <div key={i} style={styles.statCard}>
                      <div style={{ ...styles.statIcon, background: c.bg }}>{c.icon}</div>
                      <div style={{ ...styles.statValue, color: c.color }}>{c.value}</div>
                      <div style={styles.statLabel}>{c.label}</div>
                      <div style={{ fontSize: 12, color: c.color, fontWeight: 700, marginTop: 4 }}>{c.pct}% {tx('of total', lang)}</div>
                      <div style={{ height: 4, background: c.bg, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={styles.chartsRow}>
                  <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>{tx('📊 Complaints by Category', lang)}</div>
                    {stats.byCategory?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stats.byCategory} barSize={30}>
                          <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {stats.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 40, color: '#6B7FA3' }}>No data yet</div>
                    )}
                  </div>
                  <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>{tx('🎯 Resolution Status', lang)}</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={[
                          { name: tx('Resolved', lang),    value: stats.resolved   || 0 },
                          { name: tx('In Progress', lang), value: stats.inProgress || 0 },
                          { name: tx('Pending', lang),     value: stats.pending    || 0 },
                        ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55}
                          label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}>
                          {['#16A34A', '#2563EB', '#D97706'].map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={styles.accountCard}>
                  <h2 style={styles.accountTitle}>{tx('🏛️ Government Accountability Metrics', lang)}</h2>
                  <div style={styles.accountGrid}>
                    {[
                      { icon: '⚡', label: tx('Avg Resolution Time', lang), value: stats.avgResponse != null ? `${((stats.avgResponse || 0) / 24).toFixed(1)} days` : 'N/A', good: (stats.avgResponse || 0) / 24 <= 3 },
                      { icon: '✅', label: tx('SLA Compliance', lang),       value: `${resolutionRate}%`, good: parseFloat(resolutionRate) > 80 },
                      { icon: '🔄', label: tx('Active Cases', lang),         value: stats.inProgress || 0, good: true },
                      { icon: '📈', label: tx('Monthly Growth', lang),       value: stats.monthlyGrowth != null ? `${stats.monthlyGrowth >= 0 ? '+' : ''}${stats.monthlyGrowth}%` : '0%', good: (stats.monthlyGrowth || 0) >= 0 },
                      { icon: '⭐', label: tx('Citizen Satisfaction', lang), value: stats.citizenSatisfaction != null ? `${stats.citizenSatisfaction.toFixed(1)}/5` : 'N/A', good: (stats.citizenSatisfaction || 0) >= 3.5 },
                      { icon: '🚨', label: tx('Escalation Rate', lang),      value: stats.escalatedRate != null ? `${stats.escalatedRate}%` : '0%', good: false },
                    ].map((m, i) => (
                      <div key={i} style={styles.metricCard}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: m.good ? '#16A34A' : '#DC2626' }}>{m.value}</div>
                        <div style={{ fontSize: 12, color: '#6B7FA3', marginTop: 4 }}>{m.label}</div>
                        <div style={{ marginTop: 8, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.good ? '#DCFCE7' : '#FEE2E2', color: m.good ? '#16A34A' : '#DC2626', display: 'inline-block' }}>
                          {m.good ? tx('✅ Good', lang) : tx('⚠️ Monitor', lang)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Categories Tab ── */}
            {activeTab === 'categories' && (
              <div>
                <div style={styles.chartCardWide}>
                  <div style={styles.chartTitle}>{tx('📊 Category-wise Breakdown', lang)}</div>
                  {stats.byCategory?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.byCategory} barSize={40}>
                        <XAxis dataKey="_id" tick={{ fontSize: 13, fill: '#6B7FA3' }} />
                        <YAxis tick={{ fontSize: 13, fill: '#6B7FA3' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {stats.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: '#6B7FA3' }}>No category data yet</div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 20 }}>
                  {stats.byCategory?.map((c, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}>
                      <div style={{ fontWeight: 700, color: '#0F2557', fontSize: 16, marginBottom: 8 }}>{tx(c._id, lang)}</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{c.count}</div>
                      <div style={{ fontSize: 13, color: '#6B7FA3', marginTop: 4 }}>
                        {stats.total ? ((c.count / stats.total) * 100).toFixed(1) : 0}% {tx('of total', lang)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Wards Tab ── */}
            {activeTab === 'wards' && (
              <div>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { icon: '🗺️', label: 'Total Wards',      value: 26,                                                                       color: '#0F2557', bg: '#EEF2FF' },
                    { icon: '🔴', label: 'Active Wards',     value: activeWards.length,                                                       color: '#DC2626', bg: '#FEE2E2' },
                    { icon: '📍', label: 'Highest Complaints', value: activeWards[0]?.ward || 'N/A',                                          color: '#D97706', bg: '#FEF3C7' },
                    { icon: '✅', label: 'Total Ward Cases',  value: totalWardComplaints,                                                      color: '#16A34A', bg: '#DCFCE7' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 }}>{s.icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: '#6B7FA3' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Heatmap */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={styles.chartTitle}>🔥 Ward Complaint Heatmap</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6B7FA3' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {['#F0F4FB','#DBEAFE','#93C5FD','#F59E0B','#EF4444','#7F1D1D'].map((c, i) => (
                          <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: c }} />
                        ))}
                      </div>
                      <span>Low → High</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 8 }}>
                    {ALL_WARDS.map(w => (
                      <HeatCell
                        key={w}
                        ward={w}
                        count={wardMap[`Ward ${w}`] || 0}
                        max={maxCount}
                      />
                    ))}
                  </div>
                  <div style={{ marginTop: 16, fontSize: 12, color: '#9EB3CC', textAlign: 'center' }}>
                    Click any ward cell to see details · Darker color = more complaints
                  </div>
                </div>

                {/* Bar Chart */}
                <div style={styles.chartCardWide}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={styles.chartTitle}>📍 Ward-wise Complaint Distribution</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[['count', '🔢 By Count'], ['alpha', '🔤 A-Z']].map(([key, label]) => (
                        <button key={key} onClick={() => setSortWard(key)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #D8E2F0', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: sortWard === key ? '#0F2557' : '#fff', color: sortWard === key ? '#fff' : '#6B7FA3' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {activeWards.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(300, activeWards.length * 40)}>
                      <BarChart data={wardData.filter(w => w.complaints > 0)} layout="vertical" barSize={20}>
                        <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                        <YAxis dataKey="ward" type="category" tick={{ fontSize: 12, fill: '#6B7FA3' }} width={80} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} formatter={(v) => [`${v} complaints`, 'Count']} />
                        <Bar dataKey="complaints" radius={[0, 6, 6, 0]}>
                          {wardData.filter(w => w.complaints > 0).map((w, i) => {
                            const intensity = w.complaints / maxCount;
                            const color = intensity > 0.8 ? '#7F1D1D' : intensity > 0.6 ? '#EF4444' : intensity > 0.4 ? '#F59E0B' : intensity > 0.2 ? '#1565C0' : '#0F2557';
                            return <Cell key={i} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>No ward data yet</div>
                      <div style={{ fontSize: 13 }}>Submit complaints with a Ward selected to see data here</div>
                    </div>
                  )}
                </div>

                {/* Ward Cards Grid */}
                {activeWards.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={styles.chartTitle}>📋 Ward Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginTop: 12 }}>
                      {wardData.filter(w => w.complaints > 0).map((w, i) => {
                        const intensity = w.complaints / maxCount;
                        const color = intensity > 0.8 ? '#7F1D1D' : intensity > 0.6 ? '#EF4444' : intensity > 0.4 ? '#F59E0B' : '#0F2557';
                        return (
                          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', borderTop: `4px solid ${color}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ fontWeight: 700, color: '#0F2557', fontSize: 15 }}>{w.ward}</div>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: intensity > 0.6 ? '#FEE2E2' : intensity > 0.3 ? '#FEF3C7' : '#EEF2FF', color }}>
                                {intensity > 0.6 ? '🔴 High' : intensity > 0.3 ? '🟡 Med' : '🟢 Low'}
                              </span>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{w.complaints}</div>
                            <div style={{ fontSize: 12, color: '#6B7FA3', marginBottom: 8 }}>complaints</div>
                            <div style={{ fontSize: 12, color: '#9EB3CC' }}>
                              {totalWardComplaints ? ((w.complaints / totalWardComplaints) * 100).toFixed(1) : 0}% of total
                            </div>
                            <div style={{ marginTop: 10, height: 5, background: '#F0F4FB', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(w.complaints / maxCount) * 100}%`, background: color, borderRadius: 3 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Wards Table */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', marginTop: 24 }}>
                  <div style={styles.chartTitle}>📊 All Wards Summary Table</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['Ward', 'Complaints', 'Share %', 'Activity Level', 'Progress'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7FA3', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {wardData.map((w, i) => {
                        const intensity = w.complaints / maxCount;
                        const color = intensity > 0.6 ? '#EF4444' : intensity > 0.3 ? '#F59E0B' : w.complaints > 0 ? '#0F2557' : '#D1D5DB';
                        const level = intensity > 0.6 ? '🔴 High' : intensity > 0.3 ? '🟡 Medium' : w.complaints > 0 ? '🟢 Low' : '⚪ None';
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #F0F4FB' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F2557', fontSize: 13 }}>{w.ward}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color, fontSize: 15 }}>{w.complaints}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#6B7FA3' }}>
                              {totalWardComplaints ? ((w.complaints / totalWardComplaints) * 100).toFixed(1) : 0}%
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600 }}>{level}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ height: 6, background: '#F0F4FB', borderRadius: 3, width: 120, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(w.complaints / maxCount) * 100}%`, background: color, borderRadius: 3 }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Trends Tab ── */}
            {activeTab === 'trends' && (
              <div>
                <div style={styles.chartCardWide}>
                  <div style={styles.chartTitle}>{tx('📈 Complaint Volume Trend', lang)}</div>
                  {trendData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#0F2557" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#0F2557" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                          <Area type="monotone" dataKey="complaints" stroke="#0F2557" strokeWidth={2} fill="url(#grad)" name={tx('Total Complaints', lang)} />
                          <Area type="monotone" dataKey="resolved"   stroke="#16A34A" strokeWidth={2} fill="none" strokeDasharray="5 5" name={tx('Resolved', lang)} />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 16, height: 3, background: '#0F2557', borderRadius: 2 }} />
                          <span style={{ fontSize: 12, color: '#6B7FA3' }}>{tx('Total Complaints', lang)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 16, height: 3, background: '#16A34A', borderRadius: 2 }} />
                          <span style={{ fontSize: 12, color: '#6B7FA3' }}>{tx('Resolved', lang)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>
                      {lang === 'hi' ? 'पिछले 7 दिनों में कोई डेटा नहीं है।' : 'No complaint data in the last 7 days.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Banner */}
      <div style={styles.ctaBanner}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Noto Serif',serif", fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              {tx('Have a grievance? File it now — no login needed to track.', lang)}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              {tx('Join thousands of citizens who resolved their complaints through PS-CRM', lang)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button style={styles.ctaBtn}    onClick={() => navigate('/citizen/submit')}>{tx('📝 File a Complaint →', lang)}</button>
            <button style={styles.ctaBtnSec} onClick={() => navigate('/citizen/track')} >{tx('🔍 Track Complaint', lang)}</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40, marginBottom: 32 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0F2557', fontSize: 16, marginBottom: 10 }}>🏛️ {tx('PS-CRM Gov Portal', lang)}</div>
              <div style={{ fontSize: 13, color: '#6B7FA3', lineHeight: 1.7, marginBottom: 14 }}>
                {tx('Smart Public Service CRM for centralized citizen grievance management powered by AI.', lang)}
              </div>

            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0F2557', marginBottom: 14 }}>{tx('Quick Links', lang)}</div>
              {[
                { label: `🏠 ${tx('Home', lang)}`,                            path: '/' },
                { label: `📝 ${tx('File a Complaint', lang)}`,                path: '/citizen/submit' },
                { label: `🔍 ${tx('Track Your Complaint', lang)}`,            path: '/citizen/track' },
                { label: `📊 ${tx('Public Dashboard', lang)}`,                path: '/public' },
                { label: `🔐 ${tx('Login', lang)} / ${tx('Register', lang)}`, path: '/login' },
              ].map(l => (
                <div key={l.path} style={{ fontSize: 13, color: '#6B7FA3', marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate(l.path)}>
                  {l.label}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0F2557', marginBottom: 14 }}>{tx('Track Without Login', lang)}</div>
              <div style={{ fontSize: 13, color: '#6B7FA3', lineHeight: 1.7, marginBottom: 16 }}>
                {tx('Enter your complaint ID to see real-time status, photos, and progress report', lang)}
              </div>
              <button style={{ padding: '10px 20px', background: '#0F2557', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}
                onClick={() => navigate('/citizen/track')}>
                {tx('🔍 Track a Complaint Now', lang)}
              </button>
              <div style={{ fontSize: 13, color: '#6B7FA3', lineHeight: 1.8, marginTop: 16 }}>
                📧 gov.grievance.system@gmail.com<br />
                📞 9594231594
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #D8E2F0', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#6B7FA3' }}>{tx('© 2025 PS-CRM · Public Transparency Dashboard · Government of Delhi', lang)}</div>
            <div style={{ fontSize: 12, color: '#6B7FA3' }}>{tx('Privacy Policy · Terms of Use · Accessibility', lang)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  page:                { fontFamily: "'DM Sans',sans-serif", background: '#F4F6FB', minHeight: '100vh' },
  topbar:              { background: '#0F2557', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: '3px solid #E8620A' },
  header:              { background: '#fff', borderBottom: '1px solid #D8E2F0', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', boxShadow: '0 2px 12px rgba(15,37,87,0.08)', position: 'sticky', top: 0, zIndex: 200 },
  brand:               { display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' },
  emblem:              { width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#0F2557,#1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  brandMain:           { fontFamily: "'Noto Serif',serif", fontSize: 16, fontWeight: 700, color: '#0F2557' },
  brandSub:            { fontSize: 11, color: '#6B7FA3', marginTop: 1 },
  tabBtn:              { padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'transparent', color: '#6B7FA3' },
  tabBtnActive:        { background: '#EEF2FF', color: '#0F2557' },
  btnOutline:          { padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #0F2557', color: '#0F2557', background: 'transparent' },
  btnPrimary:          { padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#E8620A', color: '#fff' },
  heroBanner:          { background: 'linear-gradient(135deg,#0F2557 0%,#1A3A6E 50%,#1E5096 100%)', padding: '48px 40px' },
  heroInner:           { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 40, flexWrap: 'wrap' },
  liveChip:            { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: 100, fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: 1, marginBottom: 14 },
  liveDot:             { width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' },
  heroTitle:           { fontFamily: "'Noto Serif',serif", fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 12 },
  heroSub:             { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 },
  platformPanel:       { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 20, padding: '24px 22px', minWidth: 320, maxWidth: 380 },
  platformHeader:      { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.55)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 7 },
  platformDot:         { width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' },
  platformGrid:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  platformStat:        { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '16px 14px' },
  platformStatN:       { fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 },
  platformStatL:       { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontWeight: 500, letterSpacing: 0.2 },
  platformChannelsLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 12 },
  platformChannels:    { display: 'flex', gap: 10, marginBottom: 14 },
  channelChip:         { flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 },
  channelLabel:        { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 },
  otpNote:             { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '11px 14px', fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', fontWeight: 500 },
  container:           { maxWidth: 1100, margin: '0 auto', padding: '40px' },
  cardsRow:            { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 24 },
  statCard:            { background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  statIcon:            { width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 10 },
  statValue:           { fontSize: 30, fontWeight: 700, marginBottom: 4 },
  statLabel:           { fontSize: 13, color: '#6B7FA3' },
  chartsRow:           { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard:           { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  chartCardWide:       { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', marginBottom: 20 },
  chartTitle:          { fontSize: 15, fontWeight: 700, color: '#0F2557', marginBottom: 16 },
  accountCard:         { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  accountTitle:        { fontFamily: "'Noto Serif',serif", fontSize: 20, fontWeight: 700, color: '#0F2557', marginBottom: 24 },
  accountGrid:         { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 },
  metricCard:          { background: '#F8FAFC', borderRadius: 10, padding: 20, textAlign: 'center' },
  ctaBanner:           { background: 'linear-gradient(135deg,#0F2557,#1565C0)', padding: '40px 40px' },
  ctaBtn:              { padding: '12px 24px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#E8620A', color: '#fff' },
  ctaBtnSec:           { padding: '12px 24px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)' },
  footer:              { background: '#fff', borderTop: '1px solid #D8E2F0', padding: '40px 40px 24px' },
};