import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const links = [
    { path: '/dashboard', label: '📊 Dashboard' },
    { path: '/complaints', label: '📋 Complaints' },
    { path: '/submit', label: '➕ Submit Complaint' },
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={styles.logoIcon}>🏛️</span>
        <span style={styles.logoText}>PS-CRM</span>
      </div>
      <nav>
        {links.map(link => (
          <div
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              ...styles.link,
              ...(location.pathname === link.path ? styles.activeLink : {})
            }}
          >
            {link.label}
          </div>
        ))}
      </nav>
      <div style={styles.logoutBtn} onClick={logout}>
        🚪 Logout
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '240px',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1e3a5f 0%, #16304f 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  logo: {
    padding: '28px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: { fontSize: '28px' },
  logoText: { color: '#fff', fontSize: '20px', fontWeight: '700', letterSpacing: '1px' },
  link: {
    padding: '14px 24px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'all 0.2s',
    borderLeft: '3px solid transparent',
  },
  activeLink: {
    color: '#fff',
    background: 'rgba(255,255,255,0.1)',
    borderLeft: '3px solid #4da6ff',
  },
  logoutBtn: {
    marginTop: 'auto',
    padding: '18px 24px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    fontSize: '15px',
  },
};