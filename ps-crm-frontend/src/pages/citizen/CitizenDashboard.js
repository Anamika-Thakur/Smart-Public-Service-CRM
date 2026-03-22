import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang, tx } from '../../context/LanguageContext';
import API from '../../api';

// ─── Complaint Detail Modal ───────────────────────────────────────────────────
function ComplaintModal({ complaint: c, lang, onClose }) {
  const T = (key) => tx(key, lang);
  const [lightbox, setLightbox] = useState(null);

  if (!c) return null;

  const statusColor = {
    Pending:       { bg: '#FEF3C7', color: '#D97706' },
    'In Progress': { bg: '#DBEAFE', color: '#2563EB' },
    Resolved:      { bg: '#DCFCE7', color: '#16A34A' },
    Escalated:     { bg: '#FEE2E2', color: '#DC2626' },
  };

  const timeline = [
    { key: 'Submitted',   icon: '📝', done: true,                                                      date: c.createdAt },
    { key: 'Assigned',    icon: '👮', done: !!c.assignedOfficer,                                       date: c.assignedAt },
    { key: 'In Progress', icon: '🔄', done: ['In Progress','Resolved','Escalated'].includes(c.status), date: c.inProgressAt },
    { key: 'Resolved',    icon: '✅', done: c.status === 'Resolved',                                   date: c.resolvedAt },
  ];

  const beforeImgs = c.images      || [];
  const afterImgs  = c.afterImages || [];

  // Images are stored as base64 data URLs in the `data` field
  const imgUrl = (img) => {
    if (typeof img === 'string') return img;   // already a URL or base64
    return img?.data || '';                     // base64 data URL from MongoDB
  };

  return (
    <>
      <div style={mStyles.backdrop} onClick={onClose} />
      <div style={mStyles.modal}>

        {/* Header */}
        <div style={mStyles.header}>
          <div>
            <div style={mStyles.headerTitle}>{c.title}</div>
            <div style={mStyles.headerMeta}>
              <span style={mStyles.catTag}>{T(c.category)}</span>
              <span style={{
                ...mStyles.urgTag,
                background: c.urgency === 'High' ? '#FEE2E2' : c.urgency === 'Medium' ? '#FEF3C7' : '#DCFCE7',
                color:      c.urgency === 'High' ? '#DC2626' : c.urgency === 'Medium' ? '#D97706' : '#16A34A',
              }}>{T(c.urgency)}</span>
              <span style={{ ...mStyles.statusBadge, background: statusColor[c.status]?.bg, color: statusColor[c.status]?.color }}>
                {T(c.status)}
              </span>
            </div>
          </div>
          <button style={mStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={mStyles.body}>

          {/* ── Progress Timeline ── */}
          <div style={mStyles.section}>
            <div style={mStyles.sectionTitle}>📍 {T('Complaint Progress')}</div>
            <div style={mStyles.timeline}>
              {timeline.map((step, i) => (
                <div key={i} style={mStyles.timelineStep}>
                  {i < timeline.length - 1 && (
                    <div style={{ ...mStyles.connector, background: timeline[i + 1].done ? '#16A34A' : '#D8E2F0' }} />
                  )}
                  <div style={{ ...mStyles.timelineDot, background: step.done ? '#16A34A' : '#D8E2F0', color: step.done ? '#fff' : '#9EB3CC' }}>
                    {step.done ? '✓' : (i + 1)}
                  </div>
                  <div style={mStyles.timelineContent}>
                    <div style={{ ...mStyles.timelineLabel, color: step.done ? '#0F2557' : '#9EB3CC' }}>
                      {step.icon} {T(step.key)}
                    </div>
                    {step.done && step.date && (
                      <div style={mStyles.timelineDate}>
                        {new Date(step.date).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Details ── */}
          <div style={mStyles.section}>
            <div style={mStyles.sectionTitle}>📋 {T('Complaint Details')}</div>
            <div style={mStyles.detailGrid}>
              <div style={mStyles.detailItem}>
                <div style={mStyles.detailLabel}>{T('Complaint ID')}</div>
                <div style={mStyles.detailValue}>{c._id?.slice(-8).toUpperCase()}</div>
              </div>
              <div style={mStyles.detailItem}>
                <div style={mStyles.detailLabel}>{T('Filed On')}</div>
                <div style={mStyles.detailValue}>{new Date(c.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}</div>
              </div>
              <div style={mStyles.detailItem}>
                <div style={mStyles.detailLabel}>{T('Location')}</div>
                <div style={mStyles.detailValue}>📍 {c.location?.ward || 'N/A'}</div>
              </div>
              <div style={mStyles.detailItem}>
                <div style={mStyles.detailLabel}>{T('SLA Deadline')}</div>
                <div style={mStyles.detailValue}>⏱️ {c.sla?.deadline ? new Date(c.sla.deadline).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN') : 'N/A'}</div>
              </div>
              {c.assignedOfficer && (
                <div style={mStyles.detailItem}>
                  <div style={mStyles.detailLabel}>{T('Assigned Officer')}</div>
                  <div style={mStyles.detailValue}>👮 {c.assignedOfficer?.name || c.assignedOfficer}</div>
                </div>
              )}
              {c.resolutionNote && (
                <div style={{ ...mStyles.detailItem, gridColumn: '1/-1' }}>
                  <div style={mStyles.detailLabel}>{T('Resolution Note')}</div>
                  <div style={{ ...mStyles.detailValue, color: '#16A34A' }}>{c.resolutionNote}</div>
                </div>
              )}
            </div>
            <div style={mStyles.descBox}>
              <div style={mStyles.detailLabel}>{T('Description')}</div>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginTop: 6 }}>{c.description}</div>
            </div>
          </div>

          {/* ── Before / After Images ── */}
          {c.status === 'Resolved' && (
            <div style={mStyles.section}>
              <div style={mStyles.sectionTitle}>📸 {T('Before & After')}</div>
              {beforeImgs.length === 0 && afterImgs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#9EB3CC', fontSize: 14 }}>
                  📷 {lang === 'hi' ? 'अधिकारी ने अभी तक फ़ोटो अपलोड नहीं की है' : 'Officer has not uploaded resolution photos yet'}
                </div>
              ) : (
                <div style={mStyles.beforeAfterGrid}>
                  {/* Before */}
                  <div style={mStyles.imgCol}>
                    <div style={mStyles.imgColHeader}>
                      <div style={{ ...mStyles.imgColBadge, background: '#FEE2E2', color: '#DC2626' }}>🔴 {T('Before')}</div>
                      <span style={mStyles.imgCount}>{beforeImgs.length} {T('photo(s)')}</span>
                    </div>
                    {beforeImgs.length === 0
                      ? <div style={mStyles.noImg}>📷 {T('No before photos')}</div>
                      : <div style={mStyles.imgGrid}>
                          {beforeImgs.map((img, i) => (
                            <img key={i} src={imgUrl(img)} alt={`before-${i}`} style={mStyles.thumb}
                              onClick={() => setLightbox(imgUrl(img))}
                              onError={e => { e.target.style.display = 'none'; }} />
                          ))}
                        </div>
                    }
                  </div>

                  <div style={mStyles.arrowDivider}>➜</div>

                  {/* After */}
                  <div style={mStyles.imgCol}>
                    <div style={mStyles.imgColHeader}>
                      <div style={{ ...mStyles.imgColBadge, background: '#DCFCE7', color: '#16A34A' }}>🟢 {T('After')}</div>
                      <span style={mStyles.imgCount}>{afterImgs.length} {T('photo(s)')}</span>
                    </div>
                    {afterImgs.length === 0
                      ? <div style={mStyles.noImg}>📷 {T('No after photos')}</div>
                      : <div style={mStyles.imgGrid}>
                          {afterImgs.map((img, i) => (
                            <img key={i} src={imgUrl(img)} alt={`after-${i}`} style={mStyles.thumb}
                              onClick={() => setLightbox(imgUrl(img))}
                              onError={e => { e.target.style.display = 'none'; }} />
                          ))}
                        </div>
                    }
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={mStyles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="fullsize" style={mStyles.lightboxImg} />
          <div style={mStyles.lightboxClose}>✕</div>
        </div>
      )}
    </>
  );
}

const mStyles = {
  backdrop:        { position: 'fixed', inset: 0, background: 'rgba(15,37,87,0.45)', zIndex: 900, backdropFilter: 'blur(3px)' },
  modal:           { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '90%', maxWidth: 760, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 18, zIndex: 901, boxShadow: '0 20px 60px rgba(15,37,87,0.25)' },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '22px 26px 18px', borderBottom: '1px solid #EEF2F8', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '18px 18px 0 0' },
  headerTitle:     { fontFamily: "'Noto Serif',serif", fontSize: 18, fontWeight: 700, color: '#0F2557', marginBottom: 10 },
  headerMeta:      { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  closeBtn:        { width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#F0F4FB', color: '#6B7FA3', fontSize: 16, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  catTag:          { padding: '3px 10px', borderRadius: 6, background: '#EEF2FF', color: '#0F2557', fontSize: 12, fontWeight: 600 },
  urgTag:          { padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 },
  statusBadge:     { padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  body:            { padding: '22px 26px 28px' },
  section:         { marginBottom: 28 },
  sectionTitle:    { fontSize: 14, fontWeight: 700, color: '#0F2557', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #F0F4FB' },
  timeline:        { display: 'flex', alignItems: 'flex-start' },
  timelineStep:    { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' },
  connector:       { position: 'absolute', top: 18, left: '50%', width: '100%', height: 3, zIndex: 0 },
  timelineDot:     { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, zIndex: 1, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  timelineContent: { textAlign: 'center' },
  timelineLabel:   { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  timelineDate:    { fontSize: 11, color: '#6B7FA3' },
  detailGrid:      { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 },
  detailItem:      { background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' },
  detailLabel:     { fontSize: 11, color: '#9EB3CC', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:     { fontSize: 13, color: '#0F2557', fontWeight: 600 },
  descBox:         { background: '#F8FAFC', borderRadius: 10, padding: '14px 16px' },
  beforeAfterGrid: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  imgCol:          { flex: 1, background: '#F8FAFC', borderRadius: 12, padding: 16 },
  imgColHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  imgColBadge:     { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  imgCount:        { fontSize: 11, color: '#9EB3CC' },
  imgGrid:         { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 },
  thumb:           { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  noImg:           { textAlign: 'center', padding: '24px 0', color: '#9EB3CC', fontSize: 13 },
  arrowDivider:    { fontSize: 24, color: '#C4D4EC', alignSelf: 'center', flexShrink: 0, padding: '0 4px' },
  lightbox:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' },
  lightboxImg:     { maxWidth: '90vw', maxHeight: '88vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' },
  lightboxClose:   { position: 'absolute', top: 20, right: 24, color: '#fff', fontSize: 24, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const T = (key) => tx(key, lang);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  useEffect(() => {
    API.get('/complaints/my')
      .then(res => {
        const data = res.data.data || [];
        console.log(`[CitizenDashboard] Loaded ${data.length} complaints:`);
        data.forEach((c, i) => {
          console.log(`  [${i}] ${c.complaintNumber || c._id} - Title: "${c.title}" - Description: "${c.description?.substring(0, 50) || 'EMPTY'}"`);
        });
        setComplaints(data); 
        setLoading(false); 
      })
      .catch(err => { 
        console.error('[CitizenDashboard] Error fetching complaints:', err);
        setLoading(false); 
      });
  }, []);

  const filtered = filter === 'All' ? complaints : complaints.filter(c => c.status === filter);

  const stats = {
    total:      complaints.length,
    pending:    complaints.filter(c => c.status === 'Pending').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved:   complaints.filter(c => c.status === 'Resolved').length,
  };

  const statusColor = {
    Pending:       { bg: '#FEF3C7', color: '#D97706' },
    'In Progress': { bg: '#DBEAFE', color: '#2563EB' },
    Resolved:      { bg: '#DCFCE7', color: '#16A34A' },
    Escalated:     { bg: '#FEE2E2', color: '#DC2626' },
  };

  const urgencyColor = {
    High:   { bg: '#FEE2E2', color: '#DC2626' },
    Medium: { bg: '#FEF3C7', color: '#D97706' },
    Low:    { bg: '#DCFCE7', color: '#16A34A' },
  };

  // Fetch full complaint details then open modal
  const handleTrack = (complaint) => {
    API.get(`/complaints/${complaint._id}`)
      .then(res => setSelectedComplaint(res.data.data || res.data))
      .catch(() => setSelectedComplaint(complaint));
  };

  return (
    <div style={styles.page}>

      {selectedComplaint && (
        <ComplaintModal
          complaint={selectedComplaint}
          lang={lang}
          onClose={() => setSelectedComplaint(null)}
        />
      )}

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo} onClick={() => navigate('/')}>
          <div style={styles.emblem}>🏛️</div>
          <div>
            <div style={styles.logoText}>PS-CRM</div>
            <div style={styles.logoSub}>{T('Citizen Portal')}</div>
          </div>
        </div>

        <div style={styles.userCard}>
          <div style={styles.userAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <div style={styles.userName}>{user?.name}</div>
          <div style={styles.userEmail}>{user?.email}</div>
          <div style={styles.citizenBadge}>👤 {T('Citizen')}</div>
        </div>

        <nav style={styles.nav}>
          <div style={styles.navLabel}>{T('MY ACCOUNT')}</div>
          {[
            { icon: '📊', label: 'My Dashboard',     path: '/citizen/dashboard', active: true },
            { icon: '📝', label: 'File Complaint',   path: '/citizen/submit' },
            { icon: '🔍', label: 'Track Complaint',  path: '/citizen/track' },
            { icon: '🌐', label: 'Public Dashboard', path: '/public' },
            { icon: '🔔', label: 'Notifications',    path: '/notifications' },
          ].map((l, i) => (
            <div key={i} onClick={() => navigate(l.path)}
              style={{ ...styles.navLink, ...(l.active ? styles.navLinkActive : {}) }}>
              <span style={{ fontSize: 18 }}>{l.icon}</span>
              <span>{T(l.label)}</span>
            </div>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={{ ...styles.navLink, color: 'rgba(255,255,255,0.4)' }} onClick={logout}>
            <span style={{ fontSize: 18 }}>🚪</span>
            <span>{T('Logout')}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>
              {lang === 'hi'
                ? `वापस आपका स्वागत है, ${user?.name?.split(' ')[0]}! 👋`
                : `Welcome back, ${user?.name?.split(' ')[0]}! 👋`}
            </h1>
            <p style={styles.pageSub}>
              {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
          <button style={styles.btnNew} onClick={() => navigate('/citizen/submit')}>
            ➕ {T('New Complaint')}
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { icon: '📋', label: 'Total Filed', value: stats.total,      color: '#0F2557', bg: '#EEF2FF' },
            { icon: '⏳', label: 'Pending',     value: stats.pending,    color: '#D97706', bg: '#FEF3C7' },
            { icon: '🔄', label: 'In Progress', value: stats.inProgress, color: '#2563EB', bg: '#DBEAFE' },
            { icon: '✅', label: 'Resolved',    value: stats.resolved,   color: '#16A34A', bg: '#DCFCE7' },
          ].map((s, i) => (
            <div key={i} style={styles.statCard}
              onClick={() => setFilter(s.label === 'Total Filed' ? 'All' : s.label)}>
              <div style={{ ...styles.statIcon, background: s.bg }}>{s.icon}</div>
              <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
              <div style={styles.statLabel}>{T(s.label)}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          {[
            { icon: '📝', label: 'File a Complaint', sub: 'Report a new issue',       path: '/citizen/submit',    color: '#E8620A' },
            { icon: '🔍', label: 'Track Status',     sub: 'Check complaint status',   path: '/citizen/track',     color: '#0F2557' },
            { icon: '⭐', label: 'Give Feedback',    sub: 'Rate resolved complaints', path: '/citizen/dashboard', color: '#1B7A3E' },
            { icon: '🌐', label: 'Public Report',    sub: 'View transparency data',   path: '/public',            color: '#1565C0' },
          ].map((a, i) => (
            <div key={i} style={styles.actionCard} onClick={() => navigate(a.path)}>
              <div style={{ ...styles.actionIcon, background: `${a.color}15`, color: a.color }}>{a.icon}</div>
              <div style={styles.actionLabel}>{T(a.label)}</div>
              <div style={styles.actionSub}>{T(a.sub)}</div>
            </div>
          ))}
        </div>

        {/* Complaints List */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <span style={styles.cardTitle}>📋 {T('My Complaints')}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['All', 'Pending', 'In Progress', 'Resolved'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}>
                  {T(f)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>⏳ {T('Loading...')}</div>
          ) : filtered.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📭</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0F2557', marginBottom: 8 }}>
                {complaints.length === 0 ? T('No complaints yet') : `${T('No')} ${T(filter)} ${T('complaints')}`}
              </div>
              <p style={{ color: '#6B7FA3', fontSize: 14, marginBottom: 20 }}>
                {complaints.length === 0
                  ? T('File your first complaint to get started')
                  : (lang === 'hi' ? 'अलग फ़िल्टर आज़माएं' : 'Try a different filter')}
              </p>
              {complaints.length === 0 && (
                <button style={styles.btnNew} onClick={() => navigate('/citizen/submit')}>
                  📝 {T('File First Complaint')}
                </button>
              )}
            </div>
          ) : (
            <div style={styles.complaintsList}>
              {filtered.map((c, i) => (
                <div key={i} style={styles.complaintRow}>
                  <div style={styles.complaintLeft}>
                    <div style={styles.complaintTitle}>{c.title}</div>
                    <div style={styles.complaintMeta}>
                      <span style={styles.catTag}>{T(c.category)}</span>
                      <span style={{ ...styles.urgTag, background: urgencyColor[c.urgency]?.bg, color: urgencyColor[c.urgency]?.color }}>
                        {T(c.urgency)}
                      </span>
                      <span style={styles.metaDot}>·</span>
                      <span style={styles.metaText}>📍 {c.location?.ward || 'N/A'}</span>
                      <span style={styles.metaDot}>·</span>
                      <span style={styles.metaText}>
                        📅 {new Date(c.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
                      </span>
                    </div>
                    <div style={styles.complaintDesc}>
                      {c.description?.trim() 
                        ? c.description.slice(0, 120) + (c.description.length > 120 ? '...' : '')
                        : ''
                      }
                    </div>
                  </div>
                  <div style={styles.complaintRight}>
                    <span style={{ ...styles.statusBadge, background: statusColor[c.status]?.bg, color: statusColor[c.status]?.color }}>
                      {T(c.status)}
                    </span>
                    <div style={styles.complaintActions}>
                      <button style={styles.btnTrack} onClick={() => handleTrack(c)}>
                        🔍 {T('Track')}
                      </button>
                      {c.status === 'Resolved' && (
                        <button style={styles.btnFeedback}
                          onClick={() => navigate(`/citizen/feedback/${c._id}`)}>
                          ⭐ {T('Feedback')}
                        </button>
                      )}
                    </div>
                    <div style={styles.slaInfo}>
                      ⏱️ {T('SLA:')} {new Date(c.sla?.deadline).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:            { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" },
  sidebar:         { width: 260, background: 'linear-gradient(180deg,#0F2557 0%,#16304F 100%)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100, overflowY: 'auto' },
  sidebarLogo:     { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
  emblem:          { width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  logoText:        { fontFamily: "'Noto Serif',serif", fontSize: 17, fontWeight: 700, color: '#fff' },
  logoSub:         { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  userCard:        { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' },
  userAvatar:      { width: 56, height: 56, borderRadius: '50%', background: '#E8620A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, margin: '0 auto 10px' },
  userName:        { color: '#fff', fontWeight: 700, fontSize: 15 },
  userEmail:       { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 },
  citizenBadge:    { display: 'inline-block', marginTop: 8, padding: '3px 12px', background: 'rgba(232,98,10,0.2)', borderRadius: 20, fontSize: 11, color: '#F47B20', fontWeight: 600 },
  nav:             { padding: '20px 12px', flex: 1 },
  navLabel:        { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: '0 12px', marginBottom: 8 },
  navLink:         { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', borderRadius: 8, marginBottom: 4, fontSize: 14 },
  navLinkActive:   { color: '#fff', background: 'rgba(232,98,10,0.2)', borderLeft: '3px solid #E8620A' },
  sidebarBottom:   { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  main:            { marginLeft: 260, flex: 1, padding: '32px', background: '#F4F6FB', minHeight: '100vh' },
  topbar:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E8EEF8' },
  pageTitle:       { fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557' },
  pageSub:         { color: '#6B7FA3', fontSize: 13, marginTop: 4 },
  btnNew:          { padding: '10px 20px', background: '#E8620A', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  statsRow:        { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 },
  statCard:        { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', cursor: 'pointer' },
  statIcon:        { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 },
  statValue:       { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  statLabel:       { fontSize: 12, color: '#6B7FA3' },
  quickActions:    { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 },
  actionCard:      { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', cursor: 'pointer', textAlign: 'center' },
  actionIcon:      { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px' },
  actionLabel:     { fontWeight: 700, fontSize: 14, color: '#0F2557', marginBottom: 4 },
  actionSub:       { fontSize: 12, color: '#6B7FA3' },
  listCard:        { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  listHeader:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F0F4FB' },
  cardTitle:       { fontWeight: 700, fontSize: 16, color: '#0F2557' },
  filterBtn:       { padding: '6px 14px', borderRadius: 20, border: '1.5px solid #D8E2F0', background: 'transparent', color: '#6B7FA3', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  filterBtnActive: { background: '#0F2557', color: '#fff', border: '1.5px solid #0F2557' },
  emptyState:      { textAlign: 'center', padding: '60px 20px' },
  complaintsList:  { display: 'flex', flexDirection: 'column', gap: 14 },
  complaintRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #EEF2F8' },
  complaintLeft:   { flex: 1, paddingRight: 20 },
  complaintTitle:  { fontWeight: 700, fontSize: 15, color: '#0F2557', marginBottom: 8 },
  complaintMeta:   { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  catTag:          { padding: '2px 10px', borderRadius: 6, background: '#EEF2FF', color: '#0F2557', fontSize: 11, fontWeight: 600 },
  urgTag:          { padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  metaDot:         { color: '#C4D4EC' },
  metaText:        { fontSize: 12, color: '#6B7FA3' },
  complaintDesc:   { fontSize: 13, color: '#6B7FA3', lineHeight: 1.6 },
  complaintRight:  { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 },
  statusBadge:     { padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  complaintActions:{ display: 'flex', gap: 8 },
  btnTrack:        { padding: '6px 12px', border: '1.5px solid #0F2557', borderRadius: 7, background: 'transparent', color: '#0F2557', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnFeedback:     { padding: '6px 12px', border: 'none', borderRadius: 7, background: '#FEF3C7', color: '#D97706', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  slaInfo:         { fontSize: 11, color: '#9EB3CC' },
};