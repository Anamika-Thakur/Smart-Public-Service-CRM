import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang, tx } from '../../context/LanguageContext';
import API from '../../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Sidebar } from './ComplaintsList';

const COLORS = ['#0F2557', '#E8620A', '#1B7A3E', '#1565C0', '#8B5CF6'];

// ── Feedback Section ─────────────────────────────────────────────────────────
function FeedbackSection({ complaintId }) {
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    API.get(`/feedback/${complaintId}`)
      .then(res => setFeedback(res.data.data?.[0] || null))
      .catch(() => {});
  }, [complaintId]);

  if (!feedback) return (
    <div style={{ marginTop: 12, padding: '12px 16px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>⭐ CITIZEN FEEDBACK</div>
      <div style={{ fontSize: 13, color: '#9EB3CC' }}>No feedback submitted yet</div>
    </div>
  );

  return (
    <div style={{ marginTop: 12, padding: '12px 16px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 8 }}>⭐ CITIZEN FEEDBACK</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{ fontSize: 20, color: s <= feedback.rating ? '#F59E0B' : '#E5E7EB' }}>★</span>
        ))}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F2557' }}>{feedback.rating}/5</span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700,
          background: feedback.sentiment === 'Positive' ? '#DCFCE7' : feedback.sentiment === 'Negative' ? '#FEE2E2' : '#EEF2FF',
          color:      feedback.sentiment === 'Positive' ? '#16A34A' : feedback.sentiment === 'Negative' ? '#DC2626' : '#2563EB',
        }}>
          {feedback.sentiment}
        </span>
      </div>
      {feedback.aspects?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {feedback.aspects.map((a, i) => (
            <span key={i} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#EEF2FF', color: '#0F2557', fontWeight: 600 }}>{a}</span>
          ))}
        </div>
      )}
      {feedback.comment && (
        <div style={{ fontSize: 13, color: '#3A4E70', fontStyle: 'italic' }}>"{feedback.comment}"</div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Track modal ──
  const [trackModal, setTrackModal] = useState(null);
  const [trackData, setTrackData]   = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    API.get('/dashboard')
      .then(res => { setStats(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openTrack = async (c) => {
    setTrackModal(c);
    setTrackData(null);
    setTrackLoading(true);
    try {
      const res = await API.get(`/complaints/${c._id}`);
      setTrackData(res.data.data);
    } catch { setTrackData(c); }
    setTrackLoading(false);
  };

  const imgSrc = (img) => {
    if (!img) return '';
    if (typeof img === 'string') return img;
    return img.data || '';
  };

  const statusSteps = [
    { key: 'Pending',     label: 'Submitted',   icon: '📝' },
    { key: 'In Progress', label: 'In Progress', icon: '🔧' },
    { key: 'Resolved',    label: 'Resolved',    icon: '✅' },
    { key: 'Escalated',   label: 'Escalated',   icon: '🚨' },
  ];

  const stepIndex = (status) => {
    if (status === 'Escalated') return 3;
    return ['Pending', 'In Progress', 'Resolved'].indexOf(status);
  };

  const d = trackData || trackModal;
  const beforeImgs  = d?.images      || [];
  const afterImgs   = d?.afterImages || [];
  const currentStep = d ? stepIndex(d.status) : 0;

  return (
    <div style={styles.layout}>
      <Sidebar navigate={navigate} logout={logout} user={user} active="dashboard" />

      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>{tx('Dashboard Overview', lang)}</h1>
            <p style={styles.pageSub}>
              {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button style={styles.btnRefresh} onClick={() => window.location.reload()}>
              {tx('🔄 Refresh', lang)}
            </button>
            <div style={styles.adminChip}>
              <div style={styles.chipAvatar}>{user?.name?.charAt(0)}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6B7FA3', fontSize: 16 }}>
            ⏳ {tx('Loading...', lang)}
          </div>
        ) : stats ? (
          <>
            {/* Overview Cards */}
            <div style={styles.cards}>
              {[
                { label: 'Total Complaints', value: stats.overview.total,      icon: '📋', color: '#0F2557', bg: '#EEF2FF' },
                { label: 'Pending',          value: stats.overview.pending,    icon: '⏳', color: '#D97706', bg: '#FEF3C7' },
                { label: 'In Progress',      value: stats.overview.inProgress, icon: '🔄', color: '#2563EB', bg: '#DBEAFE' },
                { label: 'Resolved',         value: stats.overview.resolved,   icon: '✅', color: '#16A34A', bg: '#DCFCE7' },
              ].map((c, i) => (
                <div key={i} style={styles.card}>
                  <div style={{ ...styles.cardIcon, background: c.bg, color: c.color }}>{c.icon}</div>
                  <div style={{ ...styles.cardValue, color: c.color }}>{c.value}</div>
                  <div style={styles.cardLabel}>{tx(c.label, lang)}</div>
                  <div style={{ ...styles.cardBar, background: c.bg }}>
                    <div style={{ height: '100%', width: `${(c.value / (stats.overview.total || 1)) * 100}%`, background: c.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div style={styles.chartsRow}>
              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>{tx('📊 Complaints by Category', lang)}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.byCategory} barSize={32}>
                    <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill="#0F2557" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>{tx('🎯 Complaints by Urgency', lang)}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats.byUrgency} dataKey="count" nameKey="_id"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                      label={({ _id, percent }) => `${tx(_id, lang)} ${(percent * 100).toFixed(0)}%`}>
                      {stats.byUrgency.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={styles.chartsRow}>
              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>{tx('📈 Daily Trend (Last 7 Days)', lang)}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.dailyTrend}>
                    <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="count" stroke="#E8620A" strokeWidth={2} dot={{ fill: '#E8620A', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>{tx('📍 Complaints by Ward', lang)}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.byWard} layout="vertical" barSize={20}>
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7FA3' }} />
                    <YAxis dataKey="_id" type="category" tick={{ fontSize: 12, fill: '#6B7FA3' }} width={60} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none' }} />
                    <Bar dataKey="count" fill="#1565C0" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Complaints Table */}
            <div style={styles.tableCard}>
              <div style={{ ...styles.chartTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{tx('🕐 Recent Complaints', lang)}</span>
                <button style={styles.viewAllBtn} onClick={() => navigate('/admin/complaints')}>
                  {tx('View All →', lang)}
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Title', 'Category', 'Urgency', 'Status', 'Citizen', 'Date', 'Track'].map(h => (
                      <th key={h} style={styles.th}>{tx(h, lang)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats.recentComplaints || []).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F0F4FB' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={styles.td}><span style={{ fontWeight: 600, color: '#0F2557' }}>{c.title}</span></td>
                      <td style={styles.td}>{tx(c.category, lang)}</td>
                      <td style={styles.td}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.urgency === 'High' ? '#FEE2E2' : c.urgency === 'Medium' ? '#FEF3C7' : '#DCFCE7', color: c.urgency === 'High' ? '#DC2626' : c.urgency === 'Medium' ? '#D97706' : '#16A34A' }}>
                          {tx(c.urgency, lang)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.status === 'Resolved' ? '#DCFCE7' : c.status === 'Pending' ? '#FEF3C7' : '#DBEAFE', color: c.status === 'Resolved' ? '#16A34A' : c.status === 'Pending' ? '#D97706' : '#2563EB' }}>
                          {tx(c.status, lang)}
                        </span>
                      </td>
                      <td style={styles.td}>{c.citizen?.name}</td>
                      <td style={styles.td}>{new Date(c.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}</td>
                      <td style={styles.td}>
                        <button style={styles.btnTrack} onClick={() => openTrack(c)}>🔍 Track</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6B7FA3' }}>
            {tx('Failed to load dashboard data. Make sure backend is running.', lang)}
          </div>
        )}
      </div>

      {/* ══════════════ TRACK MODAL ══════════════ */}
      {trackModal && (
        <div style={modal.overlay} onClick={() => setTrackModal(null)}>
          <div style={modal.box} onClick={e => e.stopPropagation()}>

            <div style={modal.header}>
              <div>
                <h2 style={modal.title}>🔍 Complaint Details</h2>
                <p style={modal.sub}>{d?.title}</p>
              </div>
              <button style={modal.closeBtn} onClick={() => setTrackModal(null)}>✕</button>
            </div>

            {trackLoading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>⏳ Loading details...</div>
            ) : (
              <div style={modal.body}>

                {/* Progress Timeline */}
                <div style={modal.section}>
                  <div style={modal.sectionTitle}>📍 Progress</div>
                  <div style={modal.timeline}>
                    {statusSteps.map((step, idx) => {
                      const isEscalated = d?.status === 'Escalated';
                      const showStep = isEscalated ? idx === 3 || idx < 1 : idx < 3;
                      if (!showStep && isEscalated) return null;
                      const done   = isEscalated ? idx === 0 || idx === 3 : idx <= currentStep;
                      const active = isEscalated ? idx === 3 : idx === currentStep;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 1 : 'none' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 18, margin: '0 auto 6px',
                              background: done ? (active && isEscalated ? '#FEE2E2' : '#DCFCE7') : '#F0F4FB',
                              border: active ? `2px solid ${isEscalated ? '#DC2626' : '#16A34A'}` : '2px solid #E8EEF8',
                              boxShadow: active ? `0 0 0 4px ${isEscalated ? '#FEE2E2' : '#DCFCE7'}` : 'none',
                            }}>
                              {done ? (active && isEscalated ? '🚨' : '✅') : step.icon}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: done ? 700 : 400, color: done ? '#0F2557' : '#9EB3CC', whiteSpace: 'nowrap' }}>
                              {step.label}
                            </div>
                          </div>
                          {idx < (isEscalated ? 0 : 2) && (
                            <div style={{ flex: 1, height: 2, background: idx < currentStep ? '#16A34A' : '#E8EEF8', margin: '0 8px', marginBottom: 20 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Info Grid */}
                <div style={modal.section}>
                  <div style={modal.sectionTitle}>📄 Complaint Info</div>
                  <div style={modal.grid}>
                    {[
                      { label: 'Complaint ID', value: d?._id?.slice(-8).toUpperCase() },
                      { label: 'Filed On',     value: new Date(d?.createdAt).toLocaleDateString('en-IN') },
                      { label: 'Category',     value: d?.category },
                      { label: 'Urgency',      value: d?.urgency },
                      { label: 'Ward',         value: d?.location?.ward || 'N/A' },
                      { label: 'Address',      value: d?.location?.address || 'N/A' },
                      { label: 'Citizen',      value: d?.citizen?.name },
                      { label: 'Phone',        value: d?.citizen?.phone || 'N/A' },
                      { label: 'SLA Deadline', value: d?.sla?.deadline ? new Date(d.sla.deadline).toLocaleDateString('en-IN') : 'N/A' },
                      { label: 'Status',       value: d?.status },
                    ].map((item, i) => (
                      <div key={i} style={modal.gridItem}>
                        <div style={modal.gridLabel}>{item.label}</div>
                        <div style={modal.gridValue}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  {d?.description && (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E8EEF8' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7FA3', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>📝 Description</div>
                      <div style={{ fontSize: 13, color: '#3A4E70', lineHeight: 1.6 }}>{d.description}</div>
                    </div>
                  )}

                  {/* Resolution Note */}
                  {d?.resolution && (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#F0FDF4', borderRadius: 8, borderLeft: '3px solid #16A34A' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', marginBottom: 4 }}>✅ Resolution Note</div>
                      <div style={{ fontSize: 13, color: '#1A3A2A' }}>{d.resolution}</div>
                    </div>
                  )}

                  {/* Citizen Feedback */}
                  {d?.status === 'Resolved' && d?._id && (
                    <FeedbackSection complaintId={d._id} />
                  )}
                </div>

                {/* Before & After Photos */}
                <div style={modal.section}>
                  <div style={modal.sectionTitle}>📸 Before & After Photos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                    <div>
                      <div style={modal.photoHeader}>
                        <span style={{ ...modal.photoBadge, background: '#FEE2E2', color: '#DC2626' }}>🔴 Before</span>
                        <span style={modal.photoCount}>{beforeImgs.length} photo(s) · by citizen</span>
                      </div>
                      {beforeImgs.length === 0 ? (
                        <div style={modal.emptyPhotos}>📷 No photos uploaded by citizen</div>
                      ) : (
                        <div style={modal.photoGrid}>
                          {beforeImgs.map((img, i) => (
                            <img key={i} src={imgSrc(img)} alt={`before-${i}`}
                              style={modal.photoThumb}
                              onClick={() => setLightbox(imgSrc(img))}
                              onError={e => e.target.style.display = 'none'} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={modal.photoHeader}>
                        <span style={{ ...modal.photoBadge, background: '#DCFCE7', color: '#16A34A' }}>🟢 After</span>
                        <span style={modal.photoCount}>{afterImgs.length} photo(s) · by officer</span>
                      </div>
                      {afterImgs.length === 0 ? (
                        <div style={modal.emptyPhotos}>
                          {d?.status === 'Resolved' ? '📷 Officer did not upload after photos' : '⏳ Complaint not yet resolved'}
                        </div>
                      ) : (
                        <div style={modal.photoGrid}>
                          {afterImgs.map((img, i) => (
                            <img key={i} src={imgSrc(img)} alt={`after-${i}`}
                              style={modal.photoThumb}
                              onClick={() => setLightbox(imgSrc(img))}
                              onError={e => e.target.style.display = 'none'} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />
          <button style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer' }}
            onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

const modal = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(15,37,87,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box:          { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(15,37,87,0.25)' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 16px', borderBottom: '1px solid #E8EEF8', position: 'sticky', top: 0, background: '#fff', zIndex: 10 },
  title:        { fontFamily: "'Noto Serif',serif", fontSize: 20, fontWeight: 700, color: '#0F2557', margin: 0 },
  sub:          { fontSize: 13, color: '#6B7FA3', marginTop: 4 },
  closeBtn:     { width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8EEF8', background: '#F8FAFC', color: '#6B7FA3', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body:         { padding: '20px 28px 28px' },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#6B7FA3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  timeline:     { display: 'flex', alignItems: 'center' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  gridItem:     { background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' },
  gridLabel:    { fontSize: 11, color: '#9EB3CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  gridValue:    { fontSize: 13, fontWeight: 600, color: '#0F2557' },
  photoHeader:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  photoBadge:   { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  photoCount:   { fontSize: 11, color: '#9EB3CC' },
  photoGrid:    { display: 'flex', flexWrap: 'wrap', gap: 8 },
  photoThumb:   { width: 90, height: 90, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #E8EEF8' },
  emptyPhotos:  { background: '#F8FAFC', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#9EB3CC', fontSize: 13 },
};

const styles = {
  layout:      { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" },
  main:        { marginLeft: 260, flex: 1, padding: '32px', background: '#F4F6FB', minHeight: '100vh' },
  topbar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8EEF8' },
  pageTitle:   { fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557' },
  pageSub:     { color: '#6B7FA3', fontSize: 13, marginTop: 4 },
  btnRefresh:  { padding: '8px 16px', border: '1.5px solid #D8E2F0', borderRadius: 8, background: '#fff', color: '#0F2557', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  adminChip:   { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.08)' },
  chipAvatar:  { width: 28, height: 28, borderRadius: '50%', background: '#0F2557', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  cards:       { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 24 },
  card:        { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  cardIcon:    { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 },
  cardValue:   { fontSize: 32, fontWeight: 700, marginBottom: 4 },
  cardLabel:   { fontSize: 13, color: '#6B7FA3', marginBottom: 12 },
  cardBar:     { height: 6, borderRadius: 4, overflow: 'hidden' },
  chartsRow:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard:   { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  chartTitle:  { fontSize: 15, fontWeight: 700, color: '#0F2557', marginBottom: 16 },
  tableCard:   { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  th:          { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7FA3', textTransform: 'uppercase', letterSpacing: 0.5 },
  td:          { padding: '12px 16px', fontSize: 14, color: '#3A4E70' },
  viewAllBtn:  { padding: '6px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, background: 'transparent', color: '#0F2557', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnTrack:    { padding: '6px 14px', border: '1.5px solid #0F2557', borderRadius: 6, background: '#EEF2FF', color: '#0F2557', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
};