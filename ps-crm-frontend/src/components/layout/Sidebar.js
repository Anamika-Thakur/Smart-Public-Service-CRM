import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/complaints', label: 'All Complaints', icon: '📋' },
  { path: '/public', label: 'Public Dashboard', icon: '🌐' },
];

const officerLinks = [
  { path: '/officer/dashboard', label: 'My Complaints', icon: '📋' },
];

const citizenLinks = [
  { path: '/citizen/dashboard', label: 'My Dashboard', icon: '🏠' },
  { path: '/citizen/submit', label: 'Submit Complaint', icon: '➕' },
  { path: '/citizen/track', label: 'Track Complaint', icon: '🔍' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const links = user?.role === 'admin' ? adminLinks :
                user?.role === 'officer' ? officerLinks : citizenLinks;

  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo} onClick={() => navigate('/')}>
        <div style={styles.logoIcon}>🏛️</div>
        <div>
          <div style={styles.logoText}>PS-CRM</div>
          <div style={styles.logoSub}>Public Service CRM</div>
        </div>
      </div>

      {/* User Info */}
      <div style={styles.userInfo}>
        <div style={styles.avatar}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={styles.userName}>{user?.name}</div>
          <div style={styles.userRole}>{user?.role?.toUpperCase()}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navLabel}>NAVIGATION</div>
        {links.map(link => (
          <div
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              ...styles.link,
              ...(location.pathname === link.path ? styles.activeLink : {})
            }}
          >
            <span style={styles.linkIcon}>{link.icon}</span>
            <span>{link.label}</span>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={styles.bottom}>
        <div style={styles.link} onClick={() => navigate('/citizen/submit')}>
          <span style={styles.linkIcon}>➕</span>
          <span>Submit Complaint</span>
        </div>
        <div style={styles.logoutBtn} onClick={logout}>
          <span style={styles.linkIcon}>🚪</span>
          <span>Logout</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1e3a5f 0%, #16304f 100%)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    overflowY: 'auto',
  },
  logo: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoIcon: { fontSize: '32px' },
  logoText: { color: '#fff', fontSize: '18px', fontWeight: '700', letterSpacing: '1px' },
  logoSub: { color: 'rgba(255,255,255,0.5)', fontSize: '11px' },
  userInfo: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#4da6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: '16px',
    flexShrink: 0,
  },
  userName: { color: '#fff', fontWeight: '600', fontSize: '14px' },
  userRole: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' },
  nav: { padding: '20px 12px', flex: 1 },
  navLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '1px',
    padding: '0 12px',
    marginBottom: '8px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    borderRadius: '8px',
    marginBottom: '4px',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  activeLink: {
    color: '#fff',
    background: 'rgba(77,166,255,0.2)',
    borderLeft: '3px solid #4da6ff',
  },
  linkIcon: { fontSize: '18px', width: '24px' },
  bottom: {
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '14px',
  },
};