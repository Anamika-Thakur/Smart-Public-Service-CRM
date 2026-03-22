import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang, tx } from '../../context/LanguageContext';
import API from '../../api';

// ── Feedback Section ─────────────────────────────────────────────────────────
function FeedbackSection({ complaintId, lang }) {
  const [feedback, setFeedback] = useState(null);
  useEffect(() => {
    API.get(`/feedback/${complaintId}`)
      .then(res => setFeedback(res.data.data?.[0] || null))
      .catch(() => {});
  }, [complaintId]);

  if (!feedback) return (
    <div style={{ marginTop: 12, padding: '12px 16px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>⭐ {lang === 'hi' ? 'नागरिक की प्रतिक्रिया' : 'CITIZEN FEEDBACK'}</div>
      <div style={{ fontSize: 13, color: '#9EB3CC' }}>{lang === 'hi' ? 'अभी तक कोई प्रतिक्रिया नहीं' : 'No feedback submitted yet'}</div>
    </div>
  );

  return (
    <div style={{ marginTop: 12, padding: '12px 16px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 8 }}>⭐ {lang === 'hi' ? 'नागरिक की प्रतिक्रिया' : 'CITIZEN FEEDBACK'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 20, color: s <= feedback.rating ? '#F59E0B' : '#E5E7EB' }}>★</span>)}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F2557' }}>{feedback.rating}/5</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700,
          background: feedback.sentiment === 'Positive' ? '#DCFCE7' : feedback.sentiment === 'Negative' ? '#FEE2E2' : '#EEF2FF',
          color: feedback.sentiment === 'Positive' ? '#16A34A' : feedback.sentiment === 'Negative' ? '#DC2626' : '#2563EB' }}>
          {feedback.sentiment}
        </span>
      </div>
      {feedback.aspects?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {feedback.aspects.map((a, i) => <span key={i} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#EEF2FF', color: '#0F2557', fontWeight: 600 }}>{a}</span>)}
        </div>
      )}
      {feedback.comment && <div style={{ fontSize: 13, color: '#3A4E70', fontStyle: 'italic' }}>"{feedback.comment}"</div>}
    </div>
  );
}

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const T = (key) => tx(key, lang);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [updating, setUpdating] = useState(null);

  // Resolve modal
  const [selected, setSelected]     = useState(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving]   = useState(false);
  const [afterImgs, setAfterImgs]   = useState([]);
  const afterInputRef = useRef(null);

  // View Details modal
  const [viewModal, setViewModal]     = useState(null);
  const [viewData, setViewData]       = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [lightbox, setLightbox]       = useState(null);

  const complaintsRef = useRef(null);

  useEffect(() => {
    API.get('/complaints/assigned')
      .then(res => { setComplaints(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? complaints : complaints.filter(c => c.status === filter);
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await API.put(`/complaints/${id}`, { status });
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status } : c));
    } catch { alert(lang === 'hi' ? 'स्थिति अपडेट नहीं हो सकी' : 'Failed to update status'); }
    setUpdating(null);
  };

  const handleImgPick = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setAfterImgs(prev => [...prev, { data: ev.target.result, name: file.name, type: file.type, preview: ev.target.result }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };
  const removeAfterImg = (idx) => setAfterImgs(prev => prev.filter((_, i) => i !== idx));
  const imgUrl = (img) => { if (!img) return ''; if (typeof img === 'string') return img; return img?.data || ''; };

  const openModal = (c) => { setSelected(c); setResolution(''); setAfterImgs([]); };
  const handleResolve = async () => {
    if (!resolution.trim()) return;
    setResolving(true);
    try {
      await API.put(`/complaints/${selected._id}`, { status: 'Resolved', resolution, afterImages: afterImgs.map(img => ({ data: img.data, name: img.name, type: img.type })) });
      setComplaints(prev => prev.map(c => c._id === selected._id ? { ...c, status: 'Resolved', resolution } : c));
      setSelected(null); setResolution(''); setAfterImgs([]);
    } catch { alert(lang === 'hi' ? 'शिकायत हल नहीं हो सकी' : 'Failed to resolve complaint'); }
    setResolving(false);
  };

  const openView = async (c) => {
    setViewModal(c); setViewData(null); setViewLoading(true);
    try { const res = await API.get(`/complaints/${c._id}`); setViewData(res.data.data); }
    catch { setViewData(c); }
    setViewLoading(false);
  };

  const vd = viewData || viewModal;
  const vBeforeImgs = vd?.images || [];
  const vAfterImgs  = vd?.afterImages || [];

  const statusSteps = [
    { key: 'Pending', label: 'Submitted', icon: '📝' },
    { key: 'In Progress', label: 'In Progress', icon: '🔧' },
    { key: 'Resolved', label: 'Resolved', icon: '✅' },
    { key: 'Escalated', label: 'Escalated', icon: '🚨' },
  ];
  const stepIndex = (s) => s === 'Escalated' ? 3 : ['Pending', 'In Progress', 'Resolved'].indexOf(s);
  const currentStep = vd ? stepIndex(vd.status) : 0;

  const statusColor = { Pending: { bg: '#FEF3C7', color: '#D97706' }, 'In Progress': { bg: '#DBEAFE', color: '#2563EB' }, Resolved: { bg: '#DCFCE7', color: '#16A34A' }, Escalated: { bg: '#FEE2E2', color: '#DC2626' } };
  const urgencyColor = { High: { bg: '#FEE2E2', color: '#DC2626' }, Medium: { bg: '#FEF3C7', color: '#D97706' }, Low: { bg: '#DCFCE7', color: '#16A34A' } };
  const citizenImgs = selected?.images || [];

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo} onClick={() => navigate('/')}>
          <div style={styles.emblem}>🏛️</div>
          <div><div style={styles.logoText}>PS-CRM</div><div style={styles.logoSub}>{T('Officer Portal')}</div></div>
        </div>
        <div style={styles.userCard}>
          <div style={styles.userAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <div style={styles.userName}>{user?.name}</div>
          <div style={styles.userEmail}>{user?.email}</div>
          <div style={styles.officerBadge}>🧑‍💼 {T('Field Officer')}</div>
        </div>
        <nav style={styles.nav}>
          <div style={styles.navLabel}>{T('MY WORK')}</div>
          {[
            { icon: '📊', label: 'My Dashboard', path: '/officer/dashboard', active: true },
            { icon: '📋', label: 'All Cases', path: null, action: () => { setFilter('All'); complaintsRef.current?.scrollIntoView({ behavior: 'smooth' }); } },
            { icon: '🔔', label: 'Notifications', path: '/notifications' },
            { icon: '🌐', label: 'Public Dashboard', path: '/public' },
          ].map((l, i) => (
            <div key={i} onClick={() => l.action ? l.action() : navigate(l.path)}
              style={{ ...styles.navLink, ...(l.active ? styles.navLinkActive : {}) }}>
              <span style={{ fontSize: 18 }}>{l.icon}</span><span>{T(l.label)}</span>
            </div>
          ))}
        </nav>
        <div style={styles.slaBox}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>{T('SLA GUIDELINES')}</div>
          {[{ u: 'High', t: '24h', c: '#DC2626' }, { u: 'Medium', t: '72h', c: '#D97706' }, { u: 'Low', t: '7 days', c: '#16A34A' }].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{T(s.u)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.c }}>{s.t}</span>
            </div>
          ))}
        </div>
        <div style={styles.sidebarBottom}>
          <div style={{ ...styles.navLink, color: 'rgba(255,255,255,0.4)' }} onClick={logout}>
            <span style={{ fontSize: 18 }}>🚪</span><span>{T('Logout')}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>{T('Officer Dashboard 🧑‍💼')}</h1>
            <p style={styles.pageSub}>{new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={styles.adminChip}>
            <div style={styles.chipAvatar}>{user?.name?.charAt(0)}</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { icon: '📋', label: 'Total Assigned', value: stats.total, color: '#0F2557', bg: '#EEF2FF' },
            { icon: '⏳', label: 'Pending', value: stats.pending, color: '#D97706', bg: '#FEF3C7' },
            { icon: '🔄', label: 'In Progress', value: stats.inProgress, color: '#2563EB', bg: '#DBEAFE' },
            { icon: '✅', label: 'Resolved', value: stats.resolved, color: '#16A34A', bg: '#DCFCE7' },
          ].map((s, i) => (
            <div key={i} style={styles.statCard}>
              <div style={{ ...styles.statIcon, background: s.bg }}>{s.icon}</div>
              <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
              <div style={styles.statLabel}>{T(s.label)}</div>
            </div>
          ))}
        </div>

        {/* Performance Bar */}
        <div style={styles.perfCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: '#0F2557', fontSize: 15 }}>{T('📈 My Resolution Rate')}</span>
            <span style={{ fontWeight: 700, color: '#16A34A', fontSize: 20 }}>{stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%</span>
          </div>
          <div style={styles.perfBg}><div style={{ ...styles.perfFill, width: `${stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%` }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#6B7FA3' }}>0%</span>
            <span style={{ fontSize: 12, color: '#6B7FA3' }}>{T('Target: 90%')}</span>
            <span style={{ fontSize: 12, color: '#6B7FA3' }}>100%</span>
          </div>
        </div>

        {/* Complaints Table */}
        <div style={styles.tableCard} ref={complaintsRef}>
          <div style={styles.tableHeader}>
            <span style={styles.cardTitle}>{T('📋 Assigned Complaints')}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['All', 'Pending', 'In Progress', 'Resolved', 'Escalated'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}>{T(f)}</button>
              ))}
            </div>
          </div>

          {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>⏳ {T('Loading...')}</div>
          : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 600 }}>{T('No cases found')}</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['#', 'Title & Description', 'Citizen', 'Urgency', 'Status', 'SLA Deadline', 'Actions'].map(h => <th key={h} style={styles.th}>{T(h)}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const deadline = new Date(c.sla?.deadline);
                  const isOverdue = deadline < new Date() && c.status !== 'Resolved';
                  return (
                    <tr key={c._id} style={{ borderBottom: '1px solid #F0F4FB' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={styles.td}><span style={styles.idBadge}>#{String(i + 1).padStart(3, '0')}</span></td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 700, color: '#0F2557', fontSize: 14 }}>{c.title}</div>
                        <div style={{ fontSize: 11, color: '#6B7FA3', marginTop: 2 }}>{c.description?.slice(0, 60)}...</div>
                        <span style={{ fontSize: 11, background: '#EEF2FF', color: '#0F2557', padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>{T(c.category)}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.citizen?.name}</div>
                        <div style={{ fontSize: 11, color: '#6B7FA3' }}>{c.citizen?.phone || 'N/A'}</div>
                      </td>
                      <td style={styles.td}><span style={{ ...styles.badge, background: urgencyColor[c.urgency]?.bg, color: urgencyColor[c.urgency]?.color }}>{T(c.urgency)}</span></td>
                      <td style={styles.td}><span style={{ ...styles.badge, background: statusColor[c.status]?.bg, color: statusColor[c.status]?.color }}>{T(c.status)}</span></td>
                      <td style={styles.td}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? '#DC2626' : '#0F2557' }}>
                          {isOverdue ? '🚨 ' : '⏱️ '}{deadline.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
                        </div>
                        {isOverdue && <div style={{ fontSize: 11, color: '#DC2626' }}>{T('OVERDUE')}</div>}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button style={styles.btnView} onClick={() => openView(c)}>🔍 {T('Details')}</button>
                          {c.status !== 'Resolved' && (
                            <>
                              <button style={styles.btnInProgress} disabled={updating === c._id || c.status === 'In Progress'} onClick={() => updateStatus(c._id, 'In Progress')}>🔄 {T('Start')}</button>
                              <button style={styles.btnResolve} disabled={updating === c._id} onClick={() => openModal(c)}>✅ {T('Resolve')}</button>
                            </>
                          )}
                          {c.status === 'Resolved' && <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✅ {T('Done')}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══ VIEW DETAILS MODAL ══ */}
      {viewModal && (
        <div style={mStyles.overlay} onClick={() => setViewModal(null)}>
          <div style={mStyles.box} onClick={e => e.stopPropagation()}>
            <div style={mStyles.header}>
              <div><h2 style={mStyles.title}>🔍 {T('Complaint Details')}</h2><p style={mStyles.sub}>{vd?.title}</p></div>
              <button style={mStyles.closeBtn} onClick={() => setViewModal(null)}>✕</button>
            </div>
            {viewLoading ? <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>⏳ {T('Loading...')}</div> : (
              <div style={mStyles.body}>

                {/* Progress Timeline */}
                <div style={mStyles.section}>
                  <div style={mStyles.sectionTitle}>📍 {T('Progress')}</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {statusSteps.map((step, idx) => {
                      const isEscalated = vd?.status === 'Escalated';
                      const showStep = isEscalated ? idx === 3 || idx < 1 : idx < 3;
                      if (!showStep && isEscalated) return null;
                      const done = isEscalated ? idx === 0 || idx === 3 : idx <= currentStep;
                      const active = isEscalated ? idx === 3 : idx === currentStep;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 1 : 'none' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, margin: '0 auto 6px', background: done ? (active && isEscalated ? '#FEE2E2' : '#DCFCE7') : '#F0F4FB', border: active ? `2px solid ${isEscalated ? '#DC2626' : '#16A34A'}` : '2px solid #E8EEF8', boxShadow: active ? `0 0 0 4px ${isEscalated ? '#FEE2E2' : '#DCFCE7'}` : 'none' }}>
                              {done ? (active && isEscalated ? '🚨' : '✅') : step.icon}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: done ? 700 : 400, color: done ? '#0F2557' : '#9EB3CC', whiteSpace: 'nowrap' }}>{T(step.label)}</div>
                          </div>
                          {idx < (isEscalated ? 0 : 2) && <div style={{ flex: 1, height: 2, background: idx < currentStep ? '#16A34A' : '#E8EEF8', margin: '0 8px', marginBottom: 20 }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Info Grid */}
                <div style={mStyles.section}>
                  <div style={mStyles.sectionTitle}>📄 {T('Complaint Info')}</div>
                  <div style={mStyles.grid}>
                    {[
                      { label: 'Complaint ID', value: vd?._id?.slice(-8).toUpperCase() },
                      { label: 'Filed On',     value: new Date(vd?.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN') },
                      { label: 'Category',     value: T(vd?.category) },
                      { label: 'Urgency',      value: T(vd?.urgency) },
                      { label: 'Ward',         value: vd?.location?.ward || 'N/A' },
                      { label: 'Address',      value: vd?.location?.address || 'N/A' },
                      { label: 'Citizen',      value: vd?.citizen?.name },
                      { label: 'Phone',        value: vd?.citizen?.phone || 'N/A' },
                      { label: 'SLA Deadline', value: vd?.sla?.deadline ? new Date(vd.sla.deadline).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN') : 'N/A' },
                      { label: 'Status',       value: T(vd?.status) },
                    ].map((item, i) => (
                      <div key={i} style={mStyles.gridItem}>
                        <div style={mStyles.gridLabel}>{T(item.label)}</div>
                        <div style={mStyles.gridValue}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  {vd?.description && (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E8EEF8' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7FA3', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>📝 {T('Description')}</div>
                      <div style={{ fontSize: 13, color: '#3A4E70', lineHeight: 1.6 }}>{vd.description}</div>
                    </div>
                  )}

                  {/* Resolution Note */}
                  {vd?.resolution && (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#F0FDF4', borderRadius: 8, borderLeft: '3px solid #16A34A' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', marginBottom: 4 }}>✅ {T('Resolution Note')}</div>
                      <div style={{ fontSize: 13, color: '#1A3A2A' }}>{vd.resolution}</div>
                    </div>
                  )}

                  {/* Citizen Feedback */}
                  {vd?.status === 'Resolved' && vd?._id && <FeedbackSection complaintId={vd._id} lang={lang} />}
                </div>

                {/* Before & After Photos */}
                <div style={mStyles.section}>
                  <div style={mStyles.sectionTitle}>📸 {T('Before & After Photos')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={mStyles.photoHeader}>
                        <span style={{ ...mStyles.photoBadge, background: '#FEE2E2', color: '#DC2626' }}>🔴 {T('Before')}</span>
                        <span style={mStyles.photoCount}>{vBeforeImgs.length} {T('photo(s)')} · {lang === 'hi' ? 'नागरिक द्वारा' : 'by citizen'}</span>
                      </div>
                      {vBeforeImgs.length === 0 ? <div style={mStyles.emptyPhotos}>📷 {lang === 'hi' ? 'नागरिक ने कोई फ़ोटो नहीं लगाई' : 'No photos uploaded by citizen'}</div> : (
                        <div style={mStyles.photoGrid}>
                          {vBeforeImgs.map((img, i) => <img key={i} src={imgUrl(img)} alt={`b${i}`} style={mStyles.photoThumb} onClick={() => setLightbox(imgUrl(img))} onError={e => e.target.style.display = 'none'} />)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={mStyles.photoHeader}>
                        <span style={{ ...mStyles.photoBadge, background: '#DCFCE7', color: '#16A34A' }}>🟢 {T('After')}</span>
                        <span style={mStyles.photoCount}>{vAfterImgs.length} {T('photo(s)')} · {lang === 'hi' ? 'अधिकारी द्वारा' : 'by officer'}</span>
                      </div>
                      {vAfterImgs.length === 0 ? (
                        <div style={mStyles.emptyPhotos}>{vd?.status === 'Resolved' ? (lang === 'hi' ? 'अधिकारी ने बाद की फ़ोटो नहीं लगाई' : 'Officer did not upload after photos') : (lang === 'hi' ? '⏳ शिकायत अभी हल नहीं हुई' : '⏳ Not yet resolved')}</div>
                      ) : (
                        <div style={mStyles.photoGrid}>
                          {vAfterImgs.map((img, i) => <img key={i} src={imgUrl(img)} alt={`a${i}`} style={mStyles.photoThumb} onClick={() => setLightbox(imgUrl(img))} onError={e => e.target.style.display = 'none'} />)}
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

      {/* ══ RESOLVE MODAL ══ */}
      {selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>✅ {T('Resolve Complaint')}</h2>
              <button style={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={styles.modalInfo}>
              <div style={{ fontWeight: 700, color: '#0F2557', fontSize: 15, marginBottom: 4 }}>{selected.title}</div>
              <div style={{ fontSize: 13, color: '#6B7FA3' }}>{selected.description}</div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{T('Resolution Note')} *</label>
              <textarea style={{ ...styles.input, height: 100, resize: 'vertical' }}
                placeholder={lang === 'hi' ? 'बताएं कि शिकायत कैसे हल की गई...' : 'Describe how the complaint was resolved, steps taken, and outcome...'}
                value={resolution} onChange={e => setResolution(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>📸 {T('Before & After Photos')}</label>
              <div style={imgStyles.twoCol}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#3A4E70' }}>🔴 {T('Before')} <span style={{ fontSize: 11, color: '#9EB3CC', fontWeight: 400 }}>({lang === 'hi' ? 'नागरिक द्वारा' : 'by citizen'})</span></span>
                    <span style={{ fontSize: 11, color: '#9EB3CC' }}>{citizenImgs.length} {T('photo(s)')}</span>
                  </div>
                  {citizenImgs.length === 0 ? (
                    <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '18px 0', textAlign: 'center', color: '#9EB3CC', fontSize: 13 }}>📷 {lang === 'hi' ? 'नागरिक ने कोई फ़ोटो नहीं लगाई' : 'No photos uploaded by citizen'}</div>
                  ) : (
                    <div style={imgStyles.thumbRow}>
                      {citizenImgs.map((img, i) => <div key={i} style={imgStyles.thumbWrap}><img src={imgUrl(img)} alt={`b${i}`} style={imgStyles.thumb} onError={e => e.target.style.display = 'none'} /></div>)}
                    </div>
                  )}
                </div>
                <div style={imgStyles.divider} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#3A4E70' }}>🟢 {T('After')} <span style={{ fontSize: 11, color: '#9EB3CC', fontWeight: 400 }}>({lang === 'hi' ? 'आपके द्वारा' : 'upload by you'})</span></span>
                    <span style={{ fontSize: 11, color: '#9EB3CC' }}>{afterImgs.length} {T('photo(s)')}</span>
                  </div>
                  {afterImgs.length > 0 && (
                    <div style={imgStyles.thumbRow}>
                      {afterImgs.map((img, i) => <div key={i} style={imgStyles.thumbWrap}><img src={img.preview} alt={`a${i}`} style={imgStyles.thumb} /><button style={imgStyles.removeBtn} onClick={() => removeAfterImg(i)}>✕</button></div>)}
                    </div>
                  )}
                  <button style={{ ...imgStyles.uploadBtn, borderColor: '#16A34A', color: '#16A34A', background: '#DCFCE7' }} onClick={() => afterInputRef.current.click()}>📷 {T('Add Photos')}</button>
                  <input ref={afterInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImgPick} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9EB3CC', marginTop: 8 }}>💡 {lang === 'hi' ? 'नागरिक इन फ़ोटो को अपने ट्रैक पेज पर देख सकेगा' : 'Citizen will see these photos on their complaint tracking page'}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button style={{ ...styles.btnResolve, flex: 1, padding: 12, fontSize: 15, opacity: (!resolution.trim() || resolving) ? 0.6 : 1 }} onClick={handleResolve} disabled={resolving || !resolution.trim()}>
                {resolving ? `⏳ ${T('Resolving...')}` : `✅ ${T('Mark as Resolved')}`}
              </button>
              <button style={{ ...styles.btnCancel, flex: 1 }} onClick={() => setSelected(null)}>{T('Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} />
          <button style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer' }} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

const mStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,37,87,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(15,37,87,0.25)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 16px', borderBottom: '1px solid #E8EEF8', position: 'sticky', top: 0, background: '#fff', zIndex: 10 },
  title: { fontFamily: "'Noto Serif',serif", fontSize: 20, fontWeight: 700, color: '#0F2557', margin: 0 },
  sub: { fontSize: 13, color: '#6B7FA3', marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E8EEF8', background: '#F8FAFC', color: '#6B7FA3', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { padding: '20px 28px 28px' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#6B7FA3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  gridItem: { background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' },
  gridLabel: { fontSize: 11, color: '#9EB3CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  gridValue: { fontSize: 13, fontWeight: 600, color: '#0F2557' },
  photoHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  photoBadge: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  photoCount: { fontSize: 11, color: '#9EB3CC' },
  photoGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 90, height: 90, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #E8EEF8' },
  emptyPhotos: { background: '#F8FAFC', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#9EB3CC', fontSize: 13 },
};
const imgStyles = {
  twoCol: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  divider: { width: 1, background: '#E8EEF8', alignSelf: 'stretch', flexShrink: 0 },
  thumbRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  thumbWrap: { position: 'relative', width: 64, height: 64 },
  thumb: { width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '2px solid #E8EEF8' },
  removeBtn: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#DC2626', color: '#fff', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 },
  uploadBtn: { width: '100%', padding: '9px 0', borderRadius: 8, border: '1.5px dashed', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' },
};
const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" },
  sidebar: { width: 260, background: 'linear-gradient(180deg,#0F2557 0%,#16304F 100%)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100, overflowY: 'auto' },
  sidebarLogo: { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
  emblem: { width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  logoText: { fontFamily: "'Noto Serif',serif", fontSize: 17, fontWeight: 700, color: '#fff' },
  logoSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  userCard: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' },
  userAvatar: { width: 56, height: 56, borderRadius: '50%', background: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, margin: '0 auto 10px' },
  userName: { color: '#fff', fontWeight: 700, fontSize: 15 },
  userEmail: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 },
  officerBadge: { display: 'inline-block', marginTop: 8, padding: '3px 12px', background: 'rgba(21,101,192,0.25)', borderRadius: 20, fontSize: 11, color: '#60A5FA', fontWeight: 600 },
  nav: { padding: '20px 12px', flex: 1 },
  navLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: '0 12px', marginBottom: 8 },
  navLink: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', borderRadius: 8, marginBottom: 4, fontSize: 14 },
  navLinkActive: { color: '#fff', background: 'rgba(232,98,10,0.2)', borderLeft: '3px solid #E8620A' },
  slaBox: { margin: '0 12px', padding: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 12 },
  sidebarBottom: { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  main: { marginLeft: 260, flex: 1, padding: '32px', background: '#F4F6FB', minHeight: '100vh' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E8EEF8' },
  pageTitle: { fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557' },
  pageSub: { color: '#6B7FA3', fontSize: 13, marginTop: 4 },
  adminChip: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.08)' },
  chipAvatar: { width: 28, height: 28, borderRadius: '50%', background: '#1565C0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 },
  statCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  statIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 },
  statValue: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6B7FA3' },
  perfCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', marginBottom: 20 },
  perfBg: { height: 10, background: '#F0F4FB', borderRadius: 5, overflow: 'hidden' },
  perfFill: { height: '100%', background: 'linear-gradient(90deg,#1565C0,#16A34A)', borderRadius: 5, transition: 'width 0.8s' },
  tableCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', overflowX: 'auto' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F0F4FB', flexWrap: 'wrap', gap: 12 },
  cardTitle: { fontWeight: 700, fontSize: 16, color: '#0F2557' },
  filterBtn: { padding: '6px 12px', borderRadius: 20, border: '1.5px solid #D8E2F0', background: 'transparent', color: '#6B7FA3', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  filterBtnActive: { background: '#0F2557', color: '#fff', border: '1.5px solid #0F2557' },
  th: { padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7FA3', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td: { padding: '14px', fontSize: 13, color: '#3A4E70', verticalAlign: 'middle' },
  idBadge: { padding: '3px 8px', background: '#F0F4FB', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#6B7FA3' },
  badge: { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  btnView: { padding: '6px 12px', border: '1.5px solid #0F2557', borderRadius: 7, background: '#EEF2FF', color: '#0F2557', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnInProgress: { padding: '6px 12px', border: '1.5px solid #2563EB', borderRadius: 7, background: '#DBEAFE', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnResolve: { padding: '6px 12px', border: 'none', borderRadius: 7, background: '#16A34A', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,37,87,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(15,37,87,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: "'Noto Serif',serif", fontSize: 20, fontWeight: 700, color: '#0F2557' },
  closeBtn: { width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F0F4FB', color: '#6B7FA3', fontSize: 14, cursor: 'pointer', fontWeight: 700 },
  modalInfo: { background: '#F8FAFC', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #E8EEF8' },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#3A4E70', marginBottom: 6 },
  input: { width: '100%', padding: '10px 13px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box' },
  btnCancel: { padding: '12px', border: '1.5px solid #D8E2F0', borderRadius: 9, background: 'transparent', color: '#6B7FA3', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};