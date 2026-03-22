import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { tx } from '../../context/LanguageContext';
import LanguageToggle from './LanguageToggle';

export default function Navbar({ title }) {
  const { user } = useAuth();
  const { lang } = useLang();

  return (
    <div style={styles.navbar}>
      <div>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.date}>
          {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>
      <div style={styles.right}>
        {/* ── Language Toggle ── */}
        <LanguageToggle style={styles.langToggle} />
        <div style={styles.notif}>🔔</div>
        <div style={styles.userChip}>
          <div style={styles.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <span style={styles.userName}>{user?.name}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: { fontSize: '26px', fontWeight: '700', color: '#1e3a5f' },
  date:  { color: '#666', fontSize: '13px', marginTop: '4px' },
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  langToggle: {
    // Override the white-on-dark defaults for the light navbar context
    border: '1.5px solid #D8E2F0',
    background: '#F0F4FB',
    color: '#0F2557',
  },
  notif: {
    fontSize: '20px',
    cursor: 'pointer',
    background: '#f0f2f5',
    padding: '8px',
    borderRadius: '8px',
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f0f2f5',
    padding: '6px 14px',
    borderRadius: '20px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#1e3a5f',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
  },
  userName: { fontSize: '14px', fontWeight: '600', color: '#333' },
};