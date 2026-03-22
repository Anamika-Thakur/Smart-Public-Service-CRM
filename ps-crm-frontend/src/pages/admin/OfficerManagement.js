import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang, tx } from '../../context/LanguageContext';
import API from '../../api';
import { Sidebar } from './ComplaintsList';

export default function OfficerManagement() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const [officers, setOfficers] = useState([]);
  const [pendingOfficers, setPendingOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', department: 'PWD Department' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [assignEmail, setAssignEmail] = useState('');
  const [assignRole, setAssignRole] = useState('officer');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const departments = ['PWD Department', 'Jal Board', 'Electricity Board', 'Municipal Corp', 'Health Department', 'Education Dept', 'Revenue Dept', 'Other'];

  const fetchOfficers = async () => {
    try {
      const res = await API.get('/auth/officers');
      setOfficers(res.data.data);
    } catch (err) {
      setError(lang === 'hi' ? 'अधिकारी लोड नहीं हो सके।' : 'Failed to load officers. Make sure backend is running.');
      setOfficers([]);
    }
    setLoading(false);
  };

  const fetchPendingOfficers = async () => {
    try {
      const res = await API.get('/auth/officers/pending');
      setPendingOfficers(res.data.data);
    } catch (err) {
      setPendingOfficers([]);
    }
  };

  useEffect(() => { fetchOfficers(); fetchPendingOfficers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (officer) => {
    setActionLoading(officer._id);
    try {
      await API.put(`/auth/officers/${officer._id}/approve`);
      setSuccess(lang === 'hi' ? `${officer.name} को मंजूरी दी गई! उन्हें ईमेल भेजा गया।` : `${officer.name} approved! Email notification sent.`);
      fetchOfficers();
      fetchPendingOfficers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve officer');
    }
    setActionLoading('');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal._id);
    try {
      await API.put(`/auth/officers/${rejectModal._id}/reject`, { reason: rejectReason });
      setSuccess(lang === 'hi' ? `${rejectModal.name} की अर्जी अस्वीकार की गई।` : `${rejectModal.name}'s request rejected.`);
      setRejectModal(null);
      setRejectReason('');
      fetchPendingOfficers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject officer');
    }
    setActionLoading('');
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      await API.post('/auth/register', { ...form, role: 'officer' });
      setSuccess(lang === 'hi' ? `अधिकारी ${form.name} सफलतापूर्वक बनाया गया!` : `Officer ${form.name} created successfully!`);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', phone: '', department: 'PWD Department' });
      fetchOfficers();
    } catch (err) {
      setError(err.response?.data?.message || (lang === 'hi' ? 'अधिकारी नहीं बन सका' : 'Failed to create officer'));
    }
    setCreating(false);
  };

  const handleAssignRole = async () => {
    setAssignError('');
    setAssignSuccess('');
    if (!assignEmail.trim()) {
      setAssignError(lang === 'hi' ? 'कृपया ईमेल पता दर्ज करें।' : 'Please enter an email address.');
      return;
    }
    setAssigning(true);
    try {
      const res = await API.put('/auth/assign-role', { email: assignEmail.trim(), role: assignRole });
      setAssignSuccess(`✅ ${res.data.message || `Role updated to "${assignRole}" for ${assignEmail}`}`);
      setAssignEmail('');
      fetchOfficers();
    } catch (err) {
      setAssignError(err.response?.data?.message || (lang === 'hi' ? 'भूमिका असाइन नहीं हो सकी।' : 'Failed to assign role. Check the email is registered.'));
    }
    setAssigning(false);
  };

  return (
    <div style={styles.layout}>
      <Sidebar navigate={navigate} logout={logout} user={user} active="officers" />

      <div style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>{tx('🧑‍💼 Officer Management', lang)}</h1>
            <p style={styles.pageSub}>{tx('Manage field officers and their department assignments', lang)}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button style={styles.btnPrimary} onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}>
              {tx('➕ Add New Officer', lang)}
            </button>
            <div style={styles.adminChip}>
              <div style={styles.chipAvatar}>{user?.name?.charAt(0)}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
            </div>
          </div>
        </div>

        {success && <div style={styles.successBanner}>✅ {success}</div>}
        {error   && <div style={styles.errorBanner}>⚠️ {error}</div>}

        {/* Pending Approvals Section */}
        {pendingOfficers.length > 0 && (
          <div style={styles.pendingSection}>
            <div style={styles.pendingHeader}>
              <div>
                <div style={styles.pendingTitle}>
                  ⏳ {lang === 'hi' ? 'अनुमोदन प्रतीक्षारत' : 'Pending Approvals'}
                  <span style={styles.pendingBadge}>{pendingOfficers.length}</span>
                </div>
                <div style={styles.pendingSub}>
                  {lang === 'hi'
                    ? 'इन अधिकारियों ने पंजीकरण किया है और आपकी मंजूरी का इंतजार कर रहे हैं।'
                    : 'These officers have registered and are waiting for your approval.'}
                </div>
              </div>
            </div>
            <div style={styles.pendingList}>
              {pendingOfficers.map((o) => (
                <div key={o._id} style={styles.pendingCard}>
                  <div style={styles.pendingAvatar}>{o.name?.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.pendingName}>{o.name}</div>
                    <div style={styles.pendingEmail}>{o.email}</div>
                    <div style={styles.pendingDept}>🏢 {o.department || 'Not specified'} &nbsp;·&nbsp; 📞 {o.phone || 'N/A'}</div>
                    <div style={styles.pendingDate}>
                      {lang === 'hi' ? 'आवेदन:' : 'Applied:'} {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div style={styles.pendingActions}>
                    <button style={styles.approveBtn} onClick={() => handleApprove(o)} disabled={actionLoading === o._id}>
                      {actionLoading === o._id ? '⏳' : '✅'} {lang === 'hi' ? 'मंजूर करें' : 'Approve'}
                    </button>
                    <button style={styles.rejectBtn} onClick={() => { setRejectModal(o); setRejectReason(''); }} disabled={actionLoading === o._id}>
                      ❌ {lang === 'hi' ? 'अस्वीकार करें' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assign Role Panel */}
        <div style={styles.assignPanel}>
          <div style={styles.assignLeft}>
            <div style={styles.assignTitle}>{tx('🔑 Assign Role to Existing User', lang)}</div>
            <div style={styles.assignSub}>
              {tx('Promote any registered citizen to Officer or Admin. Only you can do this.', lang)}
            </div>
          </div>
          <div style={styles.assignForm}>
            <input
              style={styles.assignInput}
              type="email"
              placeholder={tx('Enter registered email address', lang)}
              value={assignEmail}
              onChange={e => { setAssignEmail(e.target.value); setAssignError(''); setAssignSuccess(''); }}
            />
            <select style={styles.assignSelect} value={assignRole} onChange={e => setAssignRole(e.target.value)}>
              <option value="officer">{tx('🧑‍💼 Field Officer', lang)}</option>
              <option value="admin">{tx('🏛️ Administrator', lang)}</option>
              <option value="citizen">{tx('👤 Citizen', lang)}</option>
            </select>
            <button style={styles.assignBtn} onClick={handleAssignRole} disabled={assigning}>
              {assigning ? tx('⏳ Assigning...', lang) : tx('✅ Assign Role', lang)}
            </button>
          </div>
          {assignError   && <div style={{ ...styles.assignMsg, background: '#FEE2E2', color: '#C62828' }}>⚠️ {assignError}</div>}
          {assignSuccess && <div style={{ ...styles.assignMsg, background: '#DCFCE7', color: '#16A34A' }}>{assignSuccess}</div>}
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          {[
            { icon: '👥', label: 'Total Officers', value: officers.length,        color: '#0F2557', bg: '#EEF2FF' },
            { icon: '🟢', label: 'Active',         value: officers.length,        color: '#16A34A', bg: '#DCFCE7' },
            { icon: '⏳', label: lang === 'hi' ? 'प्रतीक्षारत' : 'Pending', value: pendingOfficers.length, color: '#D97706', bg: '#FEF3C7' },
            { icon: '🏢', label: 'Departments',    value: [...new Set(officers.map(o => o.department))].filter(Boolean).length, color: '#2563EB', bg: '#DBEAFE' },
          ].map((s, i) => (
            <div key={i} style={styles.statCard}>
              <div style={{ ...styles.statIcon, background: s.bg, color: s.color }}>{s.icon}</div>
              <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Officers Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>⏳ {tx('Loading...', lang)}</div>
        ) : (
          <div style={styles.grid}>
            {officers.map((o, i) => (
              <div key={i} style={styles.officerCard}>
                <div style={styles.cardTop}>
                  <div style={styles.officerAvatar}>{o.name?.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.officerName}>{o.name}</div>
                    <div style={styles.officerEmail}>{o.email}</div>
                  </div>
                  <span style={{ ...styles.statusBadge, background: '#DCFCE7', color: '#16A34A' }}>
                    {tx('Active', lang)}
                  </span>
                </div>
                <div style={styles.deptBadge}>{o.department || (lang === 'hi' ? 'सामान्य' : 'General')}</div>
                <div style={styles.cardStats}>
                  {[
                    { label: 'Assigned', value: o.assignedCount || 0 },
                    { label: 'Resolved', value: o.resolvedCount || 0 },
                    { label: 'Pending',  value: o.pendingCount  || 0 },
                  ].map((s, j) => (
                    <div key={j} style={styles.miniStat}>
                      <div style={styles.miniVal}>{s.value}</div>
                      <div style={styles.miniLabel}>{tx(s.label, lang)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#6B7FA3' }}>{tx('Resolution Rate', lang)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F2557' }}>
                      {o.assignedCount ? Math.round((o.resolvedCount / o.assignedCount) * 100) : 0}%
                    </span>
                  </div>
                  <div style={styles.progressBg}>
                    <div style={{ ...styles.progressFill, width: `${o.assignedCount ? Math.round((o.resolvedCount / o.assignedCount) * 100) : 0}%` }} />
                  </div>
                </div>
                <div style={styles.cardFooter}>
                  <span style={styles.phoneTag}>📞 {o.phone || 'N/A'}</span>
                  <button style={styles.btnView} onClick={() => navigate('/admin/complaints')}>
                    {tx('View Cases', lang)}
                  </button>
                </div>
              </div>
            ))}
            <div style={styles.addCard} onClick={() => setShowModal(true)}>
              <div style={{ fontSize: 40, marginBottom: 12, color: '#C4D4EC' }}>➕</div>
              <div style={{ fontWeight: 700, color: '#6B7FA3', fontSize: 15 }}>{tx('Add New Officer', lang)}</div>
              <div style={{ fontSize: 12, color: '#9EB3CC', marginTop: 6 }}>{tx('Register a field officer account', lang)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Create Officer Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{tx('Add New Officer', lang)}</h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div style={styles.errorBox}>{error}</div>}
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>{tx('Full Name *', lang)}</label>
                <input style={styles.input} placeholder={tx('Officer full name', lang)}
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{tx('Email *', lang)}</label>
                <input style={styles.input} type="email" placeholder={tx('Officer email', lang)}
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{lang === 'hi' ? 'पासवर्ड *' : 'Password *'}</label>
                <input style={styles.input} type="password" placeholder={tx('Set a password', lang)}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>{lang === 'hi' ? 'फ़ोन' : 'Phone'}</label>
                <input style={styles.input} placeholder={tx('10-digit mobile', lang)}
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>{tx('Department *', lang)}</label>
                <select style={styles.input} value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button style={{ ...styles.btnPrimary, flex: 1 }} onClick={handleCreate} disabled={creating}>
                {creating ? tx('⏳ Creating...', lang) : tx('✅ Create Officer', lang)}
              </button>
              <button style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setShowModal(false)}>
                {tx('Cancel', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: 440 }}>
            <div style={styles.modalHeader}>
              <h2 style={{ ...styles.modalTitle, color: '#dc2626' }}>❌ {lang === 'hi' ? 'अस्वीकार करें' : 'Reject Officer'}</h2>
              <button style={styles.closeBtn} onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
              {lang === 'hi'
                ? `क्या आप ${rejectModal.name} की अर्जी अस्वीकार करना चाहते हैं?`
                : `Are you sure you want to reject ${rejectModal.name}'s registration request?`}
            </p>
            <div style={styles.formGroup}>
              <label style={styles.label}>{lang === 'hi' ? 'अस्वीकृति का कारण (वैकल्पिक)' : 'Rejection Reason (Optional)'}</label>
              <textarea
                style={{ ...styles.input, height: 80, resize: 'vertical' }}
                placeholder={lang === 'hi' ? 'कारण बताएं...' : 'Enter reason...'}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                style={{ ...styles.btnPrimary, flex: 1, background: '#dc2626' }}
                onClick={handleReject}
                disabled={actionLoading === rejectModal._id}>
                {actionLoading === rejectModal._id ? '⏳' : '❌'} {lang === 'hi' ? 'अस्वीकार करें' : 'Reject'}
              </button>
              <button style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setRejectModal(null)}>
                {tx('Cancel', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  layout:         { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans',sans-serif" },
  main:           { marginLeft: 260, flex: 1, padding: '32px', background: '#F4F6FB', minHeight: '100vh' },
  topbar:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #E8EEF8' },
  pageTitle:      { fontFamily: "'Noto Serif',serif", fontSize: 24, fontWeight: 700, color: '#0F2557' },
  pageSub:        { color: '#6B7FA3', fontSize: 13, marginTop: 4 },
  adminChip:      { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '6px 14px', borderRadius: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.08)' },
  chipAvatar:     { width: 28, height: 28, borderRadius: '50%', background: '#0F2557', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  successBanner:  { background: '#DCFCE7', color: '#16A34A', padding: '12px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 600, fontSize: 14 },
  errorBanner:    { background: '#FEE2E2', color: '#C62828', padding: '12px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 600, fontSize: 14 },
  pendingSection: { background: '#fff', borderRadius: 12, padding: '24px 28px', marginBottom: 28, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', border: '2px solid #FCD34D' },
  pendingHeader:  { marginBottom: 20 },
  pendingTitle:   { fontWeight: 700, fontSize: 17, color: '#92400E', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  pendingBadge:   { background: '#F59E0B', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 700 },
  pendingSub:     { fontSize: 13, color: '#6B7FA3' },
  pendingList:    { display: 'flex', flexDirection: 'column', gap: 12 },
  pendingCard:    { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' },
  pendingAvatar:  { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#D97706,#F59E0B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  pendingName:    { fontWeight: 700, fontSize: 15, color: '#0F2557' },
  pendingEmail:   { fontSize: 12, color: '#6B7FA3', marginTop: 2 },
  pendingDept:    { fontSize: 12, color: '#92400E', marginTop: 4, fontWeight: 600 },
  pendingDate:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  pendingActions: { display: 'flex', gap: 10, flexShrink: 0 },
  approveBtn:     { padding: '8px 18px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  rejectBtn:      { padding: '8px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  assignPanel:    { background: '#fff', borderRadius: 12, padding: '24px 28px', marginBottom: 28, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', border: '1.5px solid #E8EEF8' },
  assignLeft:     { marginBottom: 16 },
  assignTitle:    { fontWeight: 700, fontSize: 16, color: '#0F2557', marginBottom: 4 },
  assignSub:      { fontSize: 13, color: '#6B7FA3' },
  assignForm:     { display: 'flex', gap: 12, flexWrap: 'wrap' },
  assignInput:    { flex: 2, minWidth: 220, padding: '10px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none' },
  assignSelect:   { flex: 1, minWidth: 150, padding: '10px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none', background: '#fff' },
  assignBtn:      { padding: '10px 24px', background: '#0F2557', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' },
  assignMsg:      { marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  statsRow:       { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 28 },
  statCard:       { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(15,37,87,0.06)', display: 'flex', flexDirection: 'column', gap: 6 },
  statIcon:       { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 4 },
  statValue:      { fontSize: 28, fontWeight: 700 },
  statLabel:      { fontSize: 12, color: '#6B7FA3' },
  grid:           { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 },
  officerCard:    { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' },
  cardTop:        { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  officerAvatar:  { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#0F2557,#1565C0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  officerName:    { fontWeight: 700, fontSize: 15, color: '#0F2557' },
  officerEmail:   { fontSize: 12, color: '#6B7FA3', marginTop: 2 },
  statusBadge:    { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  deptBadge:      { display: 'inline-block', padding: '4px 12px', background: '#EEF2FF', color: '#0F2557', borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 16 },
  cardStats:      { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #F0F4FB', borderBottom: '1px solid #F0F4FB' },
  miniStat:       { textAlign: 'center' },
  miniVal:        { fontSize: 20, fontWeight: 700, color: '#0F2557' },
  miniLabel:      { fontSize: 11, color: '#6B7FA3', marginTop: 2 },
  progressBg:     { height: 6, background: '#F0F4FB', borderRadius: 4, overflow: 'hidden' },
  progressFill:   { height: '100%', background: 'linear-gradient(90deg,#0F2557,#1565C0)', borderRadius: 4, transition: 'width 0.5s' },
  cardFooter:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  phoneTag:       { fontSize: 12, color: '#6B7FA3' },
  btnView:        { padding: '6px 14px', border: '1.5px solid #0F2557', borderRadius: 7, background: 'transparent', color: '#0F2557', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  addCard:        { background: '#F8FAFC', borderRadius: 12, padding: 24, border: '2px dashed #D8E2F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 200 },
  btnPrimary:     { padding: '10px 20px', background: '#E8620A', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  btnOutline:     { padding: '10px 20px', background: 'transparent', color: '#0F2557', border: '1.5px solid #0F2557', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" },
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(15,37,87,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:          { background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(15,37,87,0.2)' },
  modalHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:     { fontFamily: "'Noto Serif',serif", fontSize: 20, fontWeight: 700, color: '#0F2557' },
  closeBtn:       { width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F0F4FB', color: '#6B7FA3', fontSize: 14, cursor: 'pointer', fontWeight: 700 },
  formGrid:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  formGroup:      { display: 'flex', flexDirection: 'column' },
  label:          { fontSize: 13, fontWeight: 600, color: '#3A4E70', marginBottom: 6 },
  input:          { padding: '10px 13px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none' },
  errorBox:       { background: '#FEE2E2', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
};