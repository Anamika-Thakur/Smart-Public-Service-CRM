import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api';

// ── Feedback Section Component ───────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function ComplaintsList() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [updating, setUpdating] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [assigning, setAssigning] = useState(null);

  // Track modal
  const [trackModal, setTrackModal] = useState(null);
  const [trackData, setTrackData]   = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => { fetchComplaints(); fetchOfficers(); }, []);

  useEffect(() => {
    let data = [...complaints];
    if (search)                data = data.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.citizen?.name?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter   !== 'All') data = data.filter(c => c.status   === statusFilter);
    if (urgencyFilter  !== 'All') data = data.filter(c => c.urgency  === urgencyFilter);
    if (categoryFilter !== 'All') data = data.filter(c => c.category === categoryFilter);
    setFiltered(data);
  }, [search, statusFilter, urgencyFilter, categoryFilter, complaints]);

  const fetchComplaints = async () => {
    try {
      const res = await API.get('/complaints');
      setComplaints(res.data.data);
      setFiltered(res.data.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchOfficers = async () => {
    try {
      const res = await API.get('/auth/officers');
      setOfficers(res.data.data);
    } catch { console.error('Failed to load officers'); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await API.put(`/complaints/${id}`, { status });
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, status } : c));
    } catch { alert('Failed to update status'); }
    setUpdating(null);
  };

  const assignOfficer = async (complaintId, officerId) => {
    setAssigning(complaintId);
    try {
      await API.put(`/complaints/${complaintId}`, { assignedTo: officerId, status: 'In Progress' });
      setComplaints(prev => prev.map(c => c._id === complaintId ? { ...c, assignedTo: officerId, status: 'In Progress' } : c));
    } catch { alert('Failed to assign officer'); }
    setAssigning(null);
  };

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

  const getComplaintSummary = (complaint) => {
    const text = complaint?.description?.trim();

    if (text) {
      return text;
    }

    const title = complaint?.title?.trim() || 'public service issue';
    const category = complaint?.category?.toLowerCase() || 'public service';
    const urgency = complaint?.urgency ? `${complaint.urgency.toLowerCase()} priority` : 'priority';
    const ward = complaint?.location?.ward || 'the concerned ward';
    const locality = complaint?.location?.locality?.trim();
    const locationText = locality ? `${locality}, ${ward}` : ward;

    return `This complaint appears to concern ${title.toLowerCase()} under the ${category} category at ${locationText} and has been marked as ${urgency}. The field officer should inspect the site, verify the cause of the issue, and take the necessary corrective action on the ground.`;
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

  const d = trackData || trackModal;
  const beforeImgs = d?.images      || [];
  const afterImgs  = d?.afterImages || [];
  const currentStep = d ? stepIndex(d.status) : 0;

  return (
    <div style={styles.layout}>
      <Sidebar navigate={navigate} logout={logout} user={user} active="complaints" />

      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>📋 All Complaints</h1>
            <p style={styles.pageSub}>Manage, assign and update all citizen complaints</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={styles.btnRefresh} onClick={fetchComplaints}>🔄 Refresh</button>
            <div style={styles.adminChip}>
              <div style={styles.chipAvatar}>{user?.name?.charAt(0)}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersRow}>
            <div style={{ flex: 2 }}>
              <input style={styles.searchInput}
                placeholder="🔍 Search by title or citizen name..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {[
              { label: 'Status',   value: statusFilter,   setter: setStatusFilter,   options: ['All', 'Pending', 'In Progress', 'Resolved', 'Escalated'] },
              { label: 'Urgency',  value: urgencyFilter,  setter: setUrgencyFilter,  options: ['All', 'High', 'Medium', 'Low'] },
              { label: 'Category', value: categoryFilter, setter: setCategoryFilter, options: ['All', 'Roads', 'Water', 'Electricity', 'Sanitation', 'Other'] },
            ].map((f, i) => (
              <select key={i} style={styles.filterSelect} value={f.value} onChange={e => f.setter(e.target.value)}>
                {f.options.map(o => <option key={o}>{o === 'All' ? `All ${f.label}s` : o}</option>)}
              </select>
            ))}
            <button style={styles.btnClear}
              onClick={() => { setSearch(''); setStatusFilter('All'); setUrgencyFilter('All'); setCategoryFilter('All'); }}>
              ✕ Clear
            </button>
          </div>
          <div style={styles.filterStats}>
            <span style={{ fontSize: 13, color: '#6B7FA3' }}>
              Showing <strong style={{ color: '#0F2557' }}>{filtered.length}</strong> of <strong style={{ color: '#0F2557' }}>{complaints.length}</strong> complaints
            </span>
          </div>
        </div>

        {/* Table */}
        <div style={styles.tableCard}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>⏳ Loading complaints...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No complaints found</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['#', 'Title', 'Citizen', 'Category', 'Urgency', 'Status', 'Assign Officer', 'Ward', 'Date', 'Track', 'Change Status'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c._id}
                    style={{ borderBottom: '1px solid #F0F4FB', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    <td style={styles.td}><span style={styles.idBadge}>#{String(i + 1).padStart(3, '0')}</span></td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: '#0F2557', maxWidth: 220, lineHeight: 1.4 }}>{c.title}</div>
                      <div style={styles.descriptionPreview}>{getComplaintSummary(c)}</div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.citizen?.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7FA3' }}>{c.citizen?.email}</div>
                    </td>

                    <td style={styles.td}><span style={styles.catBadge}>{c.category}</span></td>

                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: urgencyColor[c.urgency]?.bg, color: urgencyColor[c.urgency]?.color }}>
                        {c.urgency}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: statusColor[c.status]?.bg, color: statusColor[c.status]?.color }}>
                        {c.status}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <select style={{ ...styles.actionSelect, borderColor: c.assignedTo ? '#16A34A' : '#D8E2F0', color: c.assignedTo ? '#16A34A' : '#6B7FA3', opacity: assigning === c._id ? 0.5 : 1, minWidth: 140 }}
                        value={c.assignedTo || ''} disabled={assigning === c._id}
                        onChange={e => assignOfficer(c._id, e.target.value)}>
                        <option value=''>— Unassigned —</option>
                        {officers.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                      </select>
                    </td>

                    <td style={styles.td}>{c.location?.ward || 'N/A'}</td>
                    <td style={styles.td}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>

                    <td style={styles.td}>
                      <button style={styles.btnTrack} onClick={() => openTrack(c)}>🔍 Track</button>
                    </td>

                    <td style={styles.td}>
                      <select style={{ ...styles.actionSelect, opacity: updating === c._id ? 0.5 : 1 }}
                        value={c.status} disabled={updating === c._id}
                        onChange={e => updateStatus(c._id, e.target.value)}>
                        {['Pending', 'In Progress', 'Resolved', 'Escalated'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══════════════ TRACK MODAL ══════════════ */}
      {trackModal && (
        <div style={modal.overlay} onClick={() => setTrackModal(null)}>
          <div style={modal.box} onClick={e => e.stopPropagation()}>

            {/* Header */}
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

                {/* ── Progress Timeline ── */}
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

                {/* ── Info Grid ── */}
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

                  {/* ── Description ── */}
                  <div style={{ marginTop: 12, padding: '12px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E8EEF8' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7FA3', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>📝 Description</div>
                    <div style={{ fontSize: 13, color: '#3A4E70', lineHeight: 1.6 }}>{getComplaintSummary(d)}</div>
                  </div>

                  {/* ── Resolution Note ── */}
                  {d?.resolution && (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#F0FDF4', borderRadius: 8, borderLeft: '3px solid #16A34A' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', marginBottom: 4 }}>✅ Resolution Note</div>
                      <div style={{ fontSize: 13, color: '#1A3A2A' }}>{d.resolution}</div>
                    </div>
                  )}

                  {/* ── Citizen Feedback ── */}
                  {d?.status === 'Resolved' && d?._id && (
                    <FeedbackSection complaintId={d._id} />
                  )}
                </div>

                {/* ── Before & After Photos ── */}
                <div style={modal.section}>
                  <div style={modal.sectionTitle}>📸 Before & After Photos</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                    {/* BEFORE */}
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

                    {/* AFTER */}
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

      {/* ── Lightbox ── */}
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

// ── Shared Admin Sidebar ─────────────────────────────────────────────────────
export function Sidebar({ navigate, logout, user, active }) {
  const links = [
    { icon: '📊', label: 'Dashboard',        path: '/admin/dashboard',  key: 'dashboard' },
    { icon: '📋', label: 'All Complaints',   path: '/admin/complaints', key: 'complaints' },
    { icon: '🧑‍💼', label: 'Officers',       path: '/admin/officers',   key: 'officers' },
    { icon: '📈', label: 'Analytics',        path: '/admin/analytics',  key: 'analytics' },
    { icon: '🌐', label: 'Public Dashboard', path: '/public',           key: 'public' },
    { icon: '🔔', label: 'Notifications',    path: '/notifications',    key: 'notifications' },
  ];

  return (
    <div style={sidebarStyles.sidebar}>
      <div style={sidebarStyles.logo} onClick={() => navigate('/')}>
        <div style={sidebarStyles.emblem}>🏛️</div>
        <div>
          <div style={sidebarStyles.logoText}>PS-CRM</div>
          <div style={sidebarStyles.logoSub}>Admin Portal</div>
        </div>
      </div>
      <div style={sidebarStyles.userInfo}>
        <div style={sidebarStyles.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
        <div>
          <div style={sidebarStyles.userName}>{user?.name}</div>
          <div style={sidebarStyles.userRole}>Administrator</div>
        </div>
      </div>
      <nav style={sidebarStyles.nav}>
        <div style={sidebarStyles.navLabel}>MAIN MENU</div>
        {links.map((l, i) => (
          <div key={i} onClick={() => navigate(l.path)}
            style={{ ...sidebarStyles.navLink, ...(active === l.key ? sidebarStyles.navLinkActive : {}) }}>
            <span style={{ fontSize: 18 }}>{l.icon}</span>
            <span>{l.label}</span>
          </div>
        ))}
      </nav>
      <div style={sidebarStyles.bottom}>
        <div style={{ ...sidebarStyles.navLink, color: 'rgba(255,255,255,0.4)' }} onClick={logout}>
          <span style={{ fontSize: 18 }}>🚪</span><span>Logout</span>
        </div>
      </div>
    </div>
  );
}

const sidebarStyles = {
  sidebar:       { width: 260, background: 'linear-gradient(180deg,#0F2557 0%,#16304F 100%)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100, overflowY: 'auto' },
  logo:          { padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
  emblem:        { width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 },
  logoText:      { fontFamily: "'Noto Serif',serif", fontSize: 17, fontWeight: 700, color: '#fff' },
  logoSub:       { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  userInfo:      { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 },
  avatar:        { width: 38, height: 38, borderRadius: '50%', background: '#E8620A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 },
  userName:      { color: '#fff', fontWeight: 600, fontSize: 14 },
  userRole:      { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
  nav:           { padding: '20px 12px', flex: 1 },
  navLabel:      { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: '0 12px', marginBottom: 8 },
  navLink:       { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', borderRadius: 8, marginBottom: 4, fontSize: 14 },
  navLinkActive: { color: '#fff', background: 'rgba(232,98,10,0.2)', borderLeft: '3px solid #E8620A' },
  bottom:        { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' },
};

const styles = {
  layout:       { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" },
  main:         { marginLeft: 260, flex: 1, padding: '32px', background: '#F4F6FB', minHeight: '100vh' },
  topbar:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E8EEF8' },
  pageTitle:    { fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557' },
  pageSub:      { color: '#6B7FA3', fontSize: 13, marginTop: 4 },
  btnRefresh:   { padding: '8px 16px', border: '1.5px solid #D8E2F0', borderRadius: 8, background: '#fff', color: '#0F2557', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  adminChip:    { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.08)' },
  chipAvatar:   { width: 28, height: 28, borderRadius: '50%', background: '#0F2557', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  filtersCard:  { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(15,37,87,0.06)', marginBottom: 20 },
  filtersRow:   { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  searchInput:  { width: '100%', padding: '10px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none' },
  filterSelect: { padding: '10px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: '#fff', color: '#3A4E70', cursor: 'pointer' },
  btnClear:     { padding: '10px 16px', border: '1.5px solid #FEE2E2', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  filterStats:  { marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F4FB' },
  tableCard:    { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', overflowX: 'auto' },
  th:           { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7FA3', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td:           { padding: '14px 16px', fontSize: 13, color: '#3A4E70', verticalAlign: 'middle' },
  idBadge:      { padding: '3px 8px', background: '#F0F4FB', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#6B7FA3' },
  badge:        { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  catBadge:     { padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#EEF2FF', color: '#0F2557' },
  actionSelect: { padding: '6px 10px', border: '1.5px solid #D8E2F0', borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: '#fff', color: '#0F2557' },
  btnTrack:     { padding: '6px 14px', border: '1.5px solid #0F2557', borderRadius: 6, background: '#EEF2FF', color: '#0F2557', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  descriptionPreview: {
    fontSize: 11,
    color: '#6B7FA3',
    marginTop: 4,
    maxWidth: 220,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
};

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
  photoThumb:   { width: 90, height: 90, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #E8EEF8', transition: 'transform 0.15s' },
  emptyPhotos:  { background: '#F8FAFC', borderRadius: 8, padding: '20px', textAlign: 'center', color: '#9EB3CC', fontSize: 13 },
};
