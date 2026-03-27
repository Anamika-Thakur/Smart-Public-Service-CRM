import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang, tx } from '../context/LanguageContext';
import LanguageToggle from '../components/layout/LanguageToggle';
import API from '../api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { lang } = useLang();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingMsg, setPendingMsg] = useState('');
  const [rejectedMsg, setRejectedMsg] = useState('');
  const [stats, setStats] = useState({ resolved: 0, resolutionRate: 0, avgResponse: 0 });

  // Fetch real stats from backend on mount
  useEffect(() => {
    API.get('/dashboard/public')
      .then(res => {
        const d = res.data?.data;
        if (!d) return;
        const rate = d.total > 0 ? Math.round((d.resolved / d.total) * 1000) / 10 : 0;
        setStats({
          resolved:       d.resolved,
          resolutionRate: rate,
          avgResponse:    d.avgResponse || 0,
        });
      })
      .catch(() => {}); // fail silently
  }, []);

  const roles = [
    { key: 'citizen',  icon: '👤',  name: tx('Citizen', lang),       desc: tx('File & track complaints', lang) },
    { key: 'officer',  icon: '🧑‍💼', name: tx('Field Officer', lang),  desc: tx('Manage assigned cases', lang) },
    { key: 'admin',    icon: '🏛️',  name: tx('Administrator', lang),  desc: tx('Full system oversight', lang) },
  ];

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setPendingMsg('');
    setRejectedMsg('');
    try {
      const res = await API.post('/auth/login', { email, password });

      if (res.data.pending) {
        setPendingMsg(res.data.message);
        setLoading(false);
        return;
      }

      const actualRole = res.data.data.role;
      if (actualRole !== role) {
        const roleLabels = {
          citizen: tx('Citizen', lang),
          officer: tx('Field Officer', lang),
          admin:   tx('Administrator', lang),
        };
        setError(
          lang === 'hi'
            ? `ये क्रेडेंशियल एक ${roleLabels[actualRole]} खाते से संबंधित हैं। कृपया वापस जाएं और सही भूमिका चुनें।`
            : `These credentials belong to a ${roleLabels[actualRole]} account. Please go back and select the correct role.`
        );
        setLoading(false);
        return;
      }

      login(res.data.data);
      if (actualRole === 'admin')        navigate('/admin/dashboard');
      else if (actualRole === 'officer') navigate('/officer/dashboard');
      else                               navigate('/citizen/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.pending) {
        setPendingMsg(data.message);
      } else if (data?.rejected) {
        setRejectedMsg(data.message);
      } else {
        setError(data?.message || (lang === 'hi' ? 'अमान्य क्रेडेंशियल' : 'Invalid credentials'));
      }
    }
    setLoading(false);
  };

  const stepLabels = [tx('Select Role', lang), tx('Login', lang)];

  // Format real stats for display
  const displayStats = [
    {
      n: stats.resolved > 0 ? stats.resolved.toLocaleString('en-IN') : '0',
      l: tx('Complaints Resolved', lang),
    },
    {
      n: stats.resolutionRate > 0 ? `${stats.resolutionRate}%` : '0%',
      l: tx('Resolution Rate', lang),
    },
    {
      n: stats.avgResponse > 0 ? `${stats.avgResponse}h` : '—',
      l: tx('Average Response', lang),
    },
  ];

  return (
    <div style={styles.container}>
      {/* Left Panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.leftLogo} onClick={() => navigate('/')}>
            <div style={styles.emblem}>🏛️</div>
            <div>
              <div style={styles.logoText}>{tx('PS-CRM Gov Portal', lang)}</div>
              <div style={styles.logoSub}>{tx('Smart Public Service CRM', lang)}</div>
            </div>
          </div>
          <h1 style={styles.leftH1}>{tx('Transparent Governance Starts Here', lang)}</h1>
          <p style={styles.leftP}>
            {tx('File complaints, track resolutions, and hold your government accountable — all in one place.', lang)}
          </p>
          <div style={styles.leftStats}>
            {displayStats.map((s, i) => (
              <div key={i} style={styles.leftStat}>
                <div style={styles.leftStatN}>{s.n}</div>
                <div style={styles.leftStatL}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={styles.flags}>
            {['#FF9933', '#FFF', '#138808'].map(c => (
              <div key={c} style={{ width: 32, height: 8, background: c, borderRadius: 2 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.right}>
        <div style={{ position: 'absolute', top: 20, right: 28 }}>
          <LanguageToggle />
        </div>

        <div style={styles.form}>
          {/* Step Indicator */}
          <div style={styles.steps}>
            {stepLabels.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  ...styles.stepDot,
                  background: step > i + 1 ? '#1B7A3E' : step === i + 1 ? '#0F2557' : '#D8E2F0',
                  color: step >= i + 1 ? '#fff' : '#6B7FA3',
                }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, color: step === i + 1 ? '#0F2557' : '#6B7FA3', fontWeight: step === i + 1 ? 700 : 400 }}>
                  {s}
                </span>
                {i < 1 && <div style={{ width: 40, height: 1, background: '#D8E2F0', margin: '0 4px' }} />}
              </div>
            ))}
          </div>

          <h2 style={styles.formTitle}>
            {step === 1
              ? tx('Select Your Role', lang)
              : `${tx('Login', lang)} — ${roles.find(r => r.key === role)?.name}`}
          </h2>
          <p style={styles.formSub}>
            {step === 1
              ? tx('Choose your account type to continue', lang)
              : tx('Enter your credentials to access the portal', lang)}
          </p>

          {/* Step 1 — Role Selection */}
          {step === 1 && (
            <div>
              <div style={styles.roleGrid}>
                {roles.map(r => (
                  <div key={r.key} onClick={() => setRole(r.key)}
                    style={{ ...styles.roleCard, ...(role === r.key ? styles.roleCardActive : {}) }}>
                    <div style={styles.roleIcon}>{r.icon}</div>
                    <div style={styles.roleName}>{r.name}</div>
                    <div style={styles.roleDesc}>{r.desc}</div>
                  </div>
                ))}
              </div>
              <button style={{ ...styles.btn, opacity: role ? 1 : 0.5 }}
                disabled={!role} onClick={() => setStep(2)}>
                {tx('Continue →', lang)}
              </button>
            </div>
          )}

          {/* Step 2 — Login Form */}
          {step === 2 && (
            <div>
              {error && <div style={styles.errorBox}>{error}</div>}

              {/* Pending approval notice */}
              {pendingMsg && (
                <div style={styles.pendingBox}>
                  <div style={styles.pendingIcon}>⏳</div>
                  <div>
                    <div style={styles.pendingTitle}>
                      {lang === 'hi' ? 'अनुमोदन प्रतीक्षारत' : 'Awaiting Admin Approval'}
                    </div>
                    <div style={styles.pendingText}>{pendingMsg}</div>
                  </div>
                </div>
              )}

              {/* Rejected notice */}
              {rejectedMsg && (
                <div style={styles.rejectedBox}>
                  <div style={styles.pendingIcon}>❌</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                      {lang === 'hi' ? 'पंजीकरण अस्वीकृत' : 'Registration Rejected'}
                    </div>
                    <div style={{ fontSize: 13, color: '#7f1d1d' }}>{rejectedMsg}</div>
                  </div>
                </div>
              )}

              {!pendingMsg && !rejectedMsg && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{tx('📧 Email Address', lang)}</label>
                    <input style={styles.input} type="email"
                      placeholder={tx('Enter your email', lang)}
                      value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>{tx('🔒 Password', lang)}</label>
                    <input style={styles.input} type="password"
                      placeholder={tx('Enter your password', lang)}
                      value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  </div>
                  <button style={styles.btn} onClick={handleLogin} disabled={loading}>
                    {loading ? tx('Logging in...', lang) : tx('✅ Login to Portal', lang)}
                  </button>
                </>
              )}

              <button onClick={() => { setStep(1); setPendingMsg(''); setRejectedMsg(''); setError(''); }}
                style={{ width: '100%', padding: 10, border: 'none', background: 'transparent', color: '#6B7FA3', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                {tx('← Change Role', lang)}
              </button>
              {role !== 'admin' && (
                <div style={styles.registerLink}>
                  {tx("Don't have an account?", lang)}{' '}
                  <span onClick={() => navigate('/register')}
                    style={{ color: '#0F2557', fontWeight: 700, cursor: 'pointer' }}>
                    {tx('Register here', lang)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container:      { display: 'flex', minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans',sans-serif" },
  left:           { flex: 1, background: 'linear-gradient(135deg,#0F2557 0%,#1A3A6E 50%,#1E5096 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' },
  leftInner:      { maxWidth: 440 },
  leftLogo:       { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48, cursor: 'pointer' },
  emblem:         { width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  logoText:       { fontFamily: "'Noto Serif', serif", fontSize: 18, fontWeight: 700, color: '#fff' },
  logoSub:        { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  leftH1:         { fontFamily: "'Noto Serif', serif", fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 16 },
  leftP:          { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 40 },
  leftStats:      { display: 'flex', gap: 32, marginBottom: 40 },
  leftStat:       {},
  leftStatN:      { fontSize: 24, fontWeight: 700, color: '#F47B20', marginBottom: 4 },
  leftStatL:      { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  flags:          { display: 'flex', flexDirection: 'column', gap: 3, width: 32 },
  right:          { width: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: '#FAFBFE', position: 'relative' },
  form:           { width: '100%', maxWidth: 400 },
  steps:          { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32 },
  stepDot:        { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  formTitle:      { fontFamily: "'Noto Serif', serif", fontSize: 24, fontWeight: 700, color: '#0F2557', marginBottom: 8 },
  formSub:        { fontSize: 14, color: '#6B7FA3', marginBottom: 28 },
  roleGrid:       { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 },
  roleCard:       { padding: '20px 12px', borderRadius: 10, border: '2px solid #D8E2F0', background: '#fff', cursor: 'pointer', textAlign: 'center' },
  roleCardActive: { border: '2px solid #0F2557', background: 'rgba(15,37,87,0.05)' },
  roleIcon:       { fontSize: 28, marginBottom: 8 },
  roleName:       { fontWeight: 700, fontSize: 13, color: '#0F2557', marginBottom: 4 },
  roleDesc:       { fontSize: 11, color: '#6B7FA3' },
  btn:            { width: '100%', padding: '13px', background: '#E8620A', color: '#fff', border: 'none', borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  formGroup:      { marginBottom: 18 },
  label:          { display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: '#3A4E70' },
  input:          { width: '100%', padding: '11px 14px', border: '1.5px solid #D8E2F0', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', boxSizing: 'border-box' },
  errorBox:       { background: '#FEE2E2', color: '#C62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  pendingBox:     { display: 'flex', gap: 14, background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 10, padding: '16px', marginBottom: 16 },
  pendingIcon:    { fontSize: 24, flexShrink: 0 },
  pendingTitle:   { fontWeight: 700, color: '#92400E', fontSize: 14, marginBottom: 4 },
  pendingText:    { fontSize: 13, color: '#78350F', lineHeight: 1.5 },
  rejectedBox:    { display: 'flex', gap: 14, background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10, padding: '16px', marginBottom: 16 },
  registerLink:   { textAlign: 'center', fontSize: 13, color: '#6B7FA3', marginTop: 20 },
};